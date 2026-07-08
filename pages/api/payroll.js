import { Pool } from "pg";
import { createPoolOptions } from "@/lib/postgresConfig";
import { getAttendancePool } from "@/lib/attendanceDb";
import { applyLiveAttendanceSalaries } from "@/lib/staffSalarySync";
import { ensureStaffAttendanceColumn } from "@/lib/staffSchema";
import { isSubmittedPayroll } from "@/lib/payrollStatus";

const pool =
  global.pgPool ||
  new Pool(createPoolOptions({
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  }));

if (!global.pgPool) global.pgPool = pool;

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      await ensureStaffAttendanceColumn(pool);

      const payrollResult = await pool.query(`
        SELECT 
          p.*,
          s.full_name,
          s.designation,
          s.staff_type,
          s.monthly_salary
        FROM public.payroll p
        JOIN public.staff s ON s.id = p.staff_id
        ORDER BY p.payroll_year DESC, p.payroll_month DESC, p.id DESC
      `);

      const staffResult = await pool.query(`
        SELECT id, full_name, designation, staff_type, monthly_salary, attendance_staff_id
        FROM public.staff
        WHERE work_status = 'Active'
        ORDER BY full_name ASC
      `);

      const metricsResult = await pool.query(`
        SELECT
          COALESCE(SUM(net_salary), 0)::numeric AS total_payroll,
          COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN net_salary ELSE 0 END), 0)::numeric AS paid_payroll,
          COALESCE(SUM(CASE WHEN payment_status != 'PAID' THEN net_salary ELSE 0 END), 0)::numeric AS pending_payroll
        FROM public.payroll
      `);

      const staff = await applyLiveAttendanceSalaries(
        staffResult.rows,
        getAttendancePool()
      );

      return res.status(200).json({
        success: true,
        payroll: payrollResult.rows,
        staff,
        metrics: {
          totalPayroll: Number(metricsResult.rows[0].total_payroll || 0),
          paidPayroll: Number(metricsResult.rows[0].paid_payroll || 0),
          pendingPayroll: Number(metricsResult.rows[0].pending_payroll || 0),
        },
      });
    }

    if (req.method === "POST") {
      const {
        staff_id,
        payroll_month,
        payroll_year,
        working_days,
        leave_days,
        lop_days,
        carry_forward_leaves,
        basic_salary,
        increment_amount,
        bonus_amount,
        deduction_amount,
        net_salary,
        payment_status,
        payment_date,
        payment_mode,
        reference_no,
        remarks,
        created_by,
      } = req.body;

      const result = await pool.query(
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
        RETURNING *
        `,
        [
          Number(staff_id),
          payroll_month || null,
          Number(payroll_year),
          Number(working_days || 0),
          Number(leave_days || 0),
          Number(lop_days || 0),
          Number(carry_forward_leaves || 0),
          Number(basic_salary || 0),
          Number(increment_amount || 0),
          Number(bonus_amount || 0),
          Number(deduction_amount || 0),
          Number(net_salary || 0),
          payment_status || "PENDING",
          payment_date || null,
          payment_mode || null,
          reference_no || null,
          remarks || null,
          created_by || null,
        ]
      );

      return res.status(201).json({ success: true, payroll: result.rows[0] });
    }

    if (req.method === "PUT") {
      const { id } = req.query;
      const b = req.body;

      const existing = await pool.query(
        `SELECT payment_status FROM public.payroll WHERE id = $1`,
        [Number(id)]
      );

      if (isSubmittedPayroll(existing.rows[0]?.payment_status)) {
        return res.status(409).json({
          success: false,
          error: "Submitted payroll cannot be edited",
        });
      }

      const result = await pool.query(
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
        RETURNING *
        `,
        [
          Number(b.staff_id),
          b.payroll_month || null,
          Number(b.payroll_year),
          Number(b.working_days || 0),
          Number(b.leave_days || 0),
          Number(b.lop_days || 0),
          Number(b.carry_forward_leaves || 0),
          Number(b.basic_salary || 0),
          Number(b.increment_amount || 0),
          Number(b.bonus_amount || 0),
          Number(b.deduction_amount || 0),
          Number(b.net_salary || 0),
          b.payment_status || "PENDING",
          b.payment_date || null,
          b.payment_mode || null,
          b.reference_no || null,
          b.remarks || null,
          b.created_by || null,
          Number(id),
        ]
      );

      return res.status(200).json({ success: true, payroll: result.rows[0] });
    }

    if (req.method === "PATCH") {
      const { id } = req.query;
      const { payment_status, payment_date, payment_mode, reference_no } = req.body;

      const result = await pool.query(
        `
        UPDATE public.payroll
        SET
          payment_status = $1,
          payment_date = $2,
          payment_mode = $3,
          reference_no = COALESCE($4, reference_no),
          updated_at = NOW()
        WHERE id = $5
        RETURNING *
        `,
        [
          payment_status || "PAID",
          payment_date || new Date().toISOString().slice(0, 10),
          payment_mode || "Bank Transfer",
          reference_no || null,
          Number(id),
        ]
      );

      return res.status(200).json({ success: true, payroll: result.rows[0] });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Payroll API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
