import { Pool } from "pg";

const pool =
  global.feeCollectPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (!global.feeCollectPool) {
  global.feeCollectPool = pool;
}

function cleanText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

async function getFeePaymentColumns(client) {
  const result = await client.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fee_payments'
  `);

  return new Map(
    result.rows.map((row) => [
      row.column_name,
      {
        nullable: row.is_nullable === "YES",
        hasDefault: row.column_default !== null,
      },
    ])
  );
}

async function findStudentReference(client, body) {
  const admissionId = body.admission_id ? Number(body.admission_id) : null;
  const studentId = body.student_id ? Number(body.student_id) : null;

  if (admissionId || studentId) {
    const result = await client.query(
      `
      SELECT
        a.id AS admission_id,
        s.id AS student_id
      FROM public.admissions a
      LEFT JOIN public.students s
        ON s.admission_id = a.id
      WHERE ($1::integer IS NULL OR a.id = $1)
        AND ($2::integer IS NULL OR s.id = $2)
      ORDER BY a.id DESC, s.id DESC
      LIMIT 1
      `,
      [
        Number.isFinite(admissionId) ? admissionId : null,
        Number.isFinite(studentId) ? studentId : null,
      ]
    );

    return {
      admission_id:
        result.rows[0]?.admission_id ||
        (Number.isFinite(admissionId) ? admissionId : null),
      student_id:
        result.rows[0]?.student_id ||
        (Number.isFinite(studentId) ? studentId : null),
    };
  }

  const parentPhone = normalizePhone(body.parent_mobile);

  const result = await client.query(
    `
    SELECT
      a.id AS admission_id,
      s.id AS student_id
    FROM public.admissions a
    LEFT JOIN public.students s
      ON s.admission_id = a.id
    WHERE LOWER(TRIM(a.student_name)) = LOWER(TRIM($1))
      AND RIGHT(regexp_replace(COALESCE(a.father_mobile, ''), '\\D', '', 'g'), 10) = RIGHT($2, 10)
      AND (
        $3::text IS NULL
        OR LOWER(TRIM(a.class_applying_for)) = LOWER(TRIM($3))
      )
    ORDER BY a.id DESC, s.id DESC
    LIMIT 1
    `,
    [cleanText(body.student_name), parentPhone, cleanText(body.class_name)]
  );

  return {
    admission_id: result.rows[0]?.admission_id || null,
    student_id: result.rows[0]?.student_id || null,
  };
}

async function generateReceiptNo(client, paymentDate, tableColumns) {
  const year = new Date(paymentDate).getFullYear();

  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    `fee_payments_receipt_no_${year}`,
  ]);

  const result = tableColumns.has("receipt_no")
    ? await client.query(
        `
        SELECT COALESCE(
          MAX((regexp_match(receipt_no, $1))[1]::integer),
          0
        ) AS last_no
        FROM public.fee_payments
        WHERE receipt_no ~ $2
        `,
        [`^RCP-${year}-(\\d{5})$`, `^RCP-${year}-\\d{5}$`]
      )
    : await client.query(
        "SELECT COUNT(*)::integer AS last_no FROM public.fee_payments"
      );

  const nextNo = Number(result.rows[0]?.last_no || 0) + 1;
  return `RCP-${year}-${String(nextNo).padStart(5, "0")}`;
}

function addColumn(columns, values, tableColumns, name, value) {
  if (!tableColumns.has(name)) {
    return;
  }

  columns.push(name);
  values.push(value);
}

function hasRequiredColumn(tableColumns, name) {
  const column = tableColumns.get(name);
  return column && !column.nullable && !column.hasDefault;
}

async function insertFeePayment(
  client,
  body,
  receiptNo,
  studentReference,
  tableColumns
) {
  for (const columnName of ["amount_paid", "payment_mode", "payment_date"]) {
    if (!tableColumns.has(columnName)) {
      throw new Error(`public.fee_payments.${columnName} column is missing`);
    }
  }

  if (
    hasRequiredColumn(tableColumns, "admission_id") &&
    !studentReference.admission_id
  ) {
    throw new Error("Admission record not found for this fee payment");
  }

  if (hasRequiredColumn(tableColumns, "student_id") && !studentReference.student_id) {
    throw new Error("Student record not found for this fee payment");
  }

  const columns = [];
  const values = [];

  addColumn(
    columns,
    values,
    tableColumns,
    "admission_id",
    studentReference.admission_id
  );
  addColumn(columns, values, tableColumns, "student_id", studentReference.student_id);
  addColumn(columns, values, tableColumns, "amount_paid", Number(body.amount_paid));
  addColumn(columns, values, tableColumns, "payment_mode", cleanText(body.payment_mode));
  addColumn(columns, values, tableColumns, "payment_date", cleanText(body.payment_date));
  addColumn(columns, values, tableColumns, "receipt_no", receiptNo);
  addColumn(columns, values, tableColumns, "utr", cleanText(body.utr));
  addColumn(columns, values, tableColumns, "reference_no", cleanText(body.utr));
  addColumn(columns, values, tableColumns, "notes", "Fee collection payment");
  addColumn(columns, values, tableColumns, "remarks", "Fee collection payment");
  addColumn(columns, values, tableColumns, "fee_type", "School Fee");
  addColumn(columns, values, tableColumns, "created_at", new Date());

  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const columnSql = columns.map((name) => `"${name}"`).join(", ");

  const result = await client.query(
    `
    INSERT INTO public.fee_payments (${columnSql})
    VALUES (${placeholders})
    RETURNING *
    `,
    values
  );

  return result.rows[0];
}

async function sendWhatsAppReceipt(body, receiptNo) {
  const workerUrl = process.env.WHATSAPP_WORKER_URL;
  const workerApiKey = process.env.WHATSAPP_WORKER_API_KEY;

  if (!workerUrl || !workerApiKey) {
    throw new Error("WhatsApp worker env variables missing");
  }

  const amount = formatAmount(body.amount_paid);
  const message = `Dear Parent, we have received the school fee payment of ₹${amount} for ${body.student_name}.

Class: ${body.class_name || "-"}
Receipt No: ${receiptNo}
Payment Mode: ${body.payment_mode}
Payment Date: ${body.payment_date}

Thank you.
- SmartBooks AI`;

  const response = await fetch(`${workerUrl}/api/messages/send-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": workerApiKey,
    },
    body: JSON.stringify({
      recipient_phone: body.parent_mobile,
      message_text: message,
    }),
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false || data?.ok === false) {
    throw new Error(data?.error || "WhatsApp worker failed");
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const body = req.body || {};
  const requiredFields = [
    "student_name",
    "parent_mobile",
    "amount_paid",
    "payment_mode",
    "payment_date",
  ];

  const missingFields = requiredFields.filter((field) => {
    if (field === "amount_paid") {
      return !Number.isFinite(Number(body[field])) || Number(body[field]) <= 0;
    }

    return !cleanText(body[field]);
  });

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const client = await pool.connect();
  let receiptNo = null;

  try {
    await client.query("BEGIN");

    const tableColumns = await getFeePaymentColumns(client);

    if (tableColumns.size === 0) {
      throw new Error("public.fee_payments table is missing");
    }

    receiptNo = await generateReceiptNo(client, body.payment_date, tableColumns);
    const studentReference = await findStudentReference(client, body);
    await insertFeePayment(client, body, receiptNo, studentReference, tableColumns);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Fee collection save error:", error);

    return res.status(500).json({
      success: false,
      paymentSaved: false,
      whatsappSent: false,
      error: error.message || "Unable to save fee payment",
    });
  } finally {
    client.release();
  }

  try {
    await sendWhatsAppReceipt(body, receiptNo);

    return res.status(200).json({
      success: true,
      paymentSaved: true,
      whatsappSent: true,
      receiptNo,
    });
  } catch (error) {
    console.error("Fee collection WhatsApp error:", error);

    return res.status(200).json({
      success: true,
      paymentSaved: true,
      whatsappSent: false,
      receiptNo,
      error: "Fee saved, but WhatsApp failed",
    });
  }
}
