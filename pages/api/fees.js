import { Pool } from "pg";
import { createPoolOptions } from "@/lib/postgresConfig";
import { buildFeeMetrics } from "@/lib/feeMetrics";

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
    if (req.method === "DELETE") {
      const paymentId = Number(req.query.paymentId || req.query.id);

      if (!Number.isInteger(paymentId) || paymentId <= 0) {
        return res
          .status(400)
          .json({ success: false, error: "Valid payment id is required" });
      }

      const deletedResult = await pool.query(
        `
        DELETE FROM public.fee_payments
        WHERE id = $1
        RETURNING id, admission_id, student_id, receipt_no, amount_paid
        `,
        [paymentId]
      );

      if (deletedResult.rowCount === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Fee payment not found" });
      }

      return res.status(200).json({
        success: true,
        deletedPayment: deletedResult.rows[0],
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const { month = "" } = req.query;

    const monthFilter = month
      ? `AND TO_CHAR(fp.payment_date, 'YYYY-MM') = $1`
      : "";

    const params = month ? [month] : [];

    const recordsResult = await pool.query(`
      SELECT
        a.id AS admission_id,
        s.id AS student_id,
        a.student_name,
        a.class_applying_for AS class,
        a.father_name,
        a.father_mobile,
        a.created_at,
        COALESCE(SUM(fp.amount_paid), 0)::numeric AS paid_amount,
        COALESCE(a.final_fee, a.fees, 0)::numeric AS total_fee,
        GREATEST(COALESCE(a.final_fee, a.fees, 0) - COALESCE(SUM(fp.amount_paid), 0), 0)::numeric AS balance_amount,
        COALESCE(latest_fp.payment_mode, a.admission_fee_mode, 'Cash') AS payment_mode,
        latest_fp.id AS latest_payment_id,
        latest_fp.amount_paid AS latest_paid_amount,
        latest_fp.reference_no AS latest_reference_no,
        latest_fp.payment_date AS latest_payment_date,
        latest_fp.receipt_no AS latest_receipt_no,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', history_fp.id,
            'receipt_no', history_fp.receipt_no,
            'payment_date', history_fp.payment_date,
            'amount_paid', history_fp.amount_paid
          ) ORDER BY history_fp.payment_date, history_fp.id)
          FROM public.fee_payments history_fp
          WHERE history_fp.admission_id = a.id
        ), '[]'::jsonb) AS payment_history,
        CASE
          WHEN COALESCE(SUM(fp.amount_paid), 0) = 0 THEN 'Pending'
          WHEN COALESCE(SUM(fp.amount_paid), 0) >= COALESCE(a.final_fee, a.fees, 0) AND COALESCE(a.final_fee, a.fees, 0) > 0 THEN 'Paid'
          WHEN COALESCE(SUM(fp.amount_paid), 0) > 0 THEN 'Partial'
          ELSE 'Pending'
        END AS payment_status
      FROM public.admissions a
      LEFT JOIN LATERAL (
        SELECT id
        FROM public.students
        WHERE admission_id = a.id
        ORDER BY id DESC
        LIMIT 1
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT id, payment_mode, amount_paid, reference_no, payment_date, receipt_no
        FROM public.fee_payments
        WHERE admission_id = a.id
        ORDER BY payment_date DESC NULLS LAST, id DESC
        LIMIT 1
      ) latest_fp ON true
      LEFT JOIN public.fee_payments fp
        ON fp.admission_id = a.id
      GROUP BY a.id, s.id, latest_fp.id, latest_fp.payment_mode, latest_fp.amount_paid, latest_fp.reference_no, latest_fp.payment_date, latest_fp.receipt_no
      ORDER BY a.id DESC
    `);

    const metricsResult = await pool.query(
      `
      SELECT
        COALESCE((
          SELECT SUM(COALESCE(fees, 0))
          FROM public.admissions
        ), 0)::numeric AS expected_fees,

        COALESCE((
          SELECT SUM(COALESCE(final_fee, fees - COALESCE(discount, 0), fees, 0))
          FROM public.admissions
        ), 0)::numeric AS final_receivable,

        COALESCE((
          SELECT COUNT(*)
          FROM public.admissions
          WHERE COALESCE(discount, 0) > 0
        ), 0)::integer AS discount_students,

        COALESCE((
          SELECT SUM(COALESCE(discount, 0))
          FROM public.admissions
          WHERE COALESCE(discount, 0) > 0
        ), 0)::numeric AS total_discount,

        COALESCE((
          SELECT SUM(amount_paid)
          FROM public.fee_payments fp
          WHERE 1=1 ${monthFilter}
        ), 0)::numeric AS total_collected,

        COALESCE((
          SELECT SUM(amount_paid)
          FROM public.fee_payments
          WHERE payment_date = CURRENT_DATE
        ), 0)::numeric AS today_collection
      `,
      params
    );

    const metrics = buildFeeMetrics(metricsResult.rows[0]);

    const monthlyResult = await pool.query(`
      SELECT
        TO_CHAR(payment_date, 'Mon YYYY') AS month_label,
        TO_CHAR(payment_date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(amount_paid), 0)::numeric AS collected
      FROM public.fee_payments
      WHERE payment_date >= MAKE_DATE(
        CASE
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 6
            THEN EXTRACT(YEAR FROM CURRENT_DATE)::int
          ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int - 1
        END,
        6,
        1
      )
      AND payment_date < MAKE_DATE(
        CASE
          WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 6
            THEN EXTRACT(YEAR FROM CURRENT_DATE)::int + 1
          ELSE EXTRACT(YEAR FROM CURRENT_DATE)::int
        END,
        6,
        1
      )
      GROUP BY month_label, month_key
      ORDER BY month_key ASC
    `);

    return res.status(200).json({
      success: true,
      records: recordsResult.rows,
      metrics,
      monthly: monthlyResult.rows,
    });
  } catch (err) {
    console.error("Fees API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
