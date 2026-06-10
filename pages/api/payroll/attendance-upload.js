import fs from "fs";
import formidable from "formidable";
import { Pool } from "pg";
import * as XLSX from "xlsx";
import { createPoolOptions } from "@/lib/postgresConfig";

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEFAULT_MONTHLY_SALARY = 12000;

const pool =
  global.pgPool ||
  new Pool(createPoolOptions({
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  }));

if (!global.pgPool) {
  global.pgPool = pool;
}

function parseForm(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

function firstField(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function parseAttendanceDays(value) {
  const [normal, real] = String(value || "")
    .split("/")
    .map((item) => Number(item));

  return {
    workingDays: Number.isFinite(normal) ? normal : 0,
    presentDays: Number.isFinite(real) ? real : 0,
  };
}

function parseNumber(value) {
  const number = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function parseAttendanceRows(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName =
    workbook.SheetNames.find((name) => name.trim().toLowerCase() === "att. stat.") ||
    workbook.SheetNames.find((name) => name.toLowerCase().includes("stat"));

  if (!sheetName) {
    throw new Error("Attendance statistics sheet not found in uploaded file");
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false,
  });

  return rows
    .slice(4)
    .map((row) => {
      const biometricId = String(row[0] || "").trim();
      const fullName = String(row[1] || "").trim();

      if (!biometricId || !fullName) {
        return null;
      }

      const { workingDays, presentDays } = parseAttendanceDays(row[11]);
      const absentDays = parseNumber(row[13]);
      const salary = DEFAULT_MONTHLY_SALARY;
      const deductionAmount =
        workingDays > 0
          ? Math.round((salary / workingDays) * Math.max(workingDays - presentDays, 0))
          : 0;
      const netSalary = Math.max(salary - deductionAmount, 0);

      return {
        biometricId,
        fullName,
        department: String(row[2] || "").trim(),
        workingDays,
        presentDays,
        absentDays,
        salary,
        deductionAmount,
        netSalary,
      };
    })
    .filter(Boolean);
}

async function findOrCreateStaff(client, row) {
  const staffCode = `BIO-${row.biometricId}`;
  const normalizedName = normalizeName(row.fullName);

  const existing = await client.query(
    `
    SELECT id, staff_code, full_name, monthly_salary
    FROM public.staff
    WHERE staff_code = $1
       OR staff_code = $2
       OR UPPER(TRIM(full_name)) = $3
    ORDER BY
      CASE
        WHEN staff_code = $1 THEN 1
        WHEN staff_code = $2 THEN 2
        ELSE 3
      END
    LIMIT 1
    `,
    [staffCode, row.biometricId, normalizedName]
  );

  if (existing.rows.length > 0) {
    const staff = existing.rows[0];

    await client.query(
      `
      UPDATE public.staff
      SET
        staff_code = $1,
        full_name = $2,
        staff_type = COALESCE(NULLIF(staff_type, ''), 'Teaching'),
        designation = 'Teacher',
        department = COALESCE(NULLIF(department, ''), $3),
        salary_type = 'Monthly',
        monthly_salary = $4,
        work_status = 'Active',
        updated_at = NOW()
      WHERE id = $5
      `,
      [staffCode, row.fullName, row.department || null, DEFAULT_MONTHLY_SALARY, staff.id]
    );

    return { id: staff.id, created: false };
  }

  const created = await client.query(
    `
    INSERT INTO public.staff (
      staff_code,
      full_name,
      staff_type,
      designation,
      department,
      employment_type,
      salary_type,
      monthly_salary,
      work_status,
      notes
    )
    VALUES ($1,$2,'Teaching','Teacher',$3,'Permanent','Monthly',$4,'Active',$5)
    RETURNING id
    `,
    [
      staffCode,
      row.fullName,
      row.department || null,
      DEFAULT_MONTHLY_SALARY,
      `Imported from biometric attendance ID ${row.biometricId}`,
    ]
  );

  return { id: created.rows[0].id, created: true };
}

async function upsertPayroll(client, staffId, row, payrollMonth, payrollYear) {
  const existing = await client.query(
    `
    SELECT id
    FROM public.payroll
    WHERE staff_id = $1
      AND payroll_month = $2
      AND payroll_year = $3
    LIMIT 1
    `,
    [staffId, payrollMonth, payrollYear]
  );

  const values = [
    staffId,
    payrollMonth,
    payrollYear,
    row.workingDays,
    0,
    row.absentDays,
    0,
    row.salary,
    0,
    0,
    row.deductionAmount,
    row.netSalary,
    "PENDING",
    null,
    "Bank Transfer",
    null,
    `Imported from biometric attendance. Present: ${row.presentDays}/${row.workingDays}.`,
    "Biometric Upload",
  ];

  if (existing.rows.length > 0) {
    await client.query(
      `
      UPDATE public.payroll
      SET
        staff_id = $1,
        payroll_month = $2,
        payroll_year = $3,
        working_days = $4,
        leave_days = $5,
        lop_days = $6,
        carry_forward_leaves = $7,
        basic_salary = $8,
        increment_amount = $9,
        bonus_amount = $10,
        deduction_amount = $11,
        net_salary = $12,
        payment_status = $13,
        payment_date = $14,
        payment_mode = $15,
        reference_no = $16,
        remarks = $17,
        created_by = $18,
        updated_at = NOW()
      WHERE id = $19
      `,
      [...values, existing.rows[0].id]
    );

    return "updated";
  }

  await client.query(
    `
    INSERT INTO public.payroll (
      staff_id, payroll_month, payroll_year,
      working_days, leave_days, lop_days, carry_forward_leaves,
      basic_salary, increment_amount, bonus_amount, deduction_amount,
      net_salary, payment_status, payment_date, payment_mode,
      reference_no, remarks, created_by
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
    )
    `,
    values
  );

  return "created";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  let uploaded;

  try {
    const { fields, files } = await parseForm(req);
    uploaded = Array.isArray(files.attendance)
      ? files.attendance[0]
      : files.attendance;

    if (!uploaded) {
      return res.status(400).json({ success: false, error: "No attendance file uploaded" });
    }

    const payrollMonth = String(firstField(fields.payroll_month) || "").trim().toUpperCase();
    const payrollYear = Number(firstField(fields.payroll_year));

    if (!payrollMonth || !payrollYear) {
      return res.status(400).json({ success: false, error: "Month and year are required" });
    }

    const attendanceRows = parseAttendanceRows(uploaded.filepath);

    if (attendanceRows.length === 0) {
      return res.status(400).json({ success: false, error: "No teacher attendance rows found" });
    }

    const client = await pool.connect();
    const imported = [];
    let createdStaff = 0;
    let createdPayroll = 0;
    let updatedPayroll = 0;

    try {
      await client.query("BEGIN");

      for (const row of attendanceRows) {
        const staff = await findOrCreateStaff(client, row);
        const action = await upsertPayroll(client, staff.id, row, payrollMonth, payrollYear);

        if (staff.created) createdStaff += 1;
        if (action === "created") createdPayroll += 1;
        if (action === "updated") updatedPayroll += 1;

        imported.push({
          biometricId: row.biometricId,
          fullName: row.fullName,
          workingDays: row.workingDays,
          presentDays: row.presentDays,
          absentDays: row.absentDays,
          basicSalary: row.salary,
          deductionAmount: row.deductionAmount,
          netSalary: row.netSalary,
          staffCreated: staff.created,
          payrollAction: action,
        });
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return res.status(200).json({
      success: true,
      summary: {
        rowsImported: imported.length,
        createdStaff,
        createdPayroll,
        updatedPayroll,
        payrollMonth,
        payrollYear,
      },
      imported,
    });
  } catch (error) {
    console.error("Attendance payroll upload error:", error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (uploaded?.filepath) {
      fs.promises.unlink(uploaded.filepath).catch(() => {});
    }
  }
}
