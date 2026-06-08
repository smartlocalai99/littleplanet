import { Pool } from "pg";
import { dummyAdmissions, dummyFeePayments } from "@/lib/dummyData";

const pool =
  global.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

if (!global.pgPool) global.pgPool = pool;

export default async function handler(req, res) {
  try {
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
        COALESCE(a.fees, 0)::numeric AS total_fee,
        COALESCE(SUM(fp.amount_paid), 0)::numeric AS paid_amount,
        (COALESCE(a.fees, 0) - COALESCE(SUM(fp.amount_paid), 0))::numeric AS balance_amount,
        COALESCE(MAX(fp.payment_mode), a.admission_fee_mode, 'Cash') AS payment_mode,
        MAX(fp.payment_date) AS latest_payment_date,
        MAX(fp.receipt_no) AS latest_receipt_no,
        CASE
          WHEN COALESCE(SUM(fp.amount_paid), 0) = 0 THEN 'Pending'
          WHEN COALESCE(SUM(fp.amount_paid), 0) < COALESCE(a.fees, 0) THEN 'Partial'
          ELSE 'Paid'
        END AS payment_status
      FROM public.admissions a
      LEFT JOIN LATERAL (
        SELECT id
        FROM public.students
        WHERE admission_id = a.id
        ORDER BY id DESC
        LIMIT 1
      ) s ON true
      LEFT JOIN public.fee_payments fp
        ON fp.admission_id = a.id
      WHERE a.fees IS NOT NULL
      GROUP BY a.id, s.id
      ORDER BY a.id DESC
    `);

    const metricsResult = await pool.query(
      `
      SELECT
        COALESCE((SELECT SUM(fees) FROM public.admissions WHERE fees IS NOT NULL), 0)::numeric AS total_fees,

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

    const totalFees = Number(metricsResult.rows[0]?.total_fees || 0);
    const totalCollected = Number(metricsResult.rows[0]?.total_collected || 0);

    const monthlyResult = await pool.query(`
      SELECT
        TO_CHAR(payment_date, 'Mon YYYY') AS month_label,
        TO_CHAR(payment_date, 'YYYY-MM') AS month_key,
        COALESCE(SUM(amount_paid), 0)::numeric AS collected
      FROM public.fee_payments
      GROUP BY month_label, month_key
      ORDER BY month_key ASC
      LIMIT 12
    `);

    return res.status(200).json({
      success: true,
      records: recordsResult.rows,
      metrics: {
        totalFees,
        totalCollected,
        pendingFees: totalFees - totalCollected,
        todayCollection: Number(metricsResult.rows[0]?.today_collection || 0),
      },
      monthly: monthlyResult.rows,
    });
  } catch (err) {
    console.error("Fees API Error:", err);
    // Return dummy data for demo/development
    const totalFees = dummyAdmissions.reduce((sum, a) => sum + a.fees, 0);
    const totalCollected = dummyFeePayments.reduce((sum, p) => sum + p.paid_amount, 0);
    
    const dummyRecords = dummyAdmissions.map((admission) => {
      const payments = dummyFeePayments.filter(p => p.admission_id === admission.id);
      const paidAmount = payments.reduce((sum, p) => sum + p.paid_amount, 0);
      return {
        admission_id: admission.id,
        student_name: admission.student_name,
        class: admission.class,
        total_fee: admission.fees,
        paid_amount: paidAmount,
        balance_amount: admission.fees - paidAmount,
        payment_status: paidAmount === 0 ? 'Pending' : paidAmount < admission.fees ? 'Partial' : 'Paid',
        latest_payment_date: payments[payments.length - 1]?.payment_date,
        latest_receipt_no: payments[payments.length - 1]?.receipt_no,
      };
    });

    return res.status(200).json({
      success: true,
      isDemo: true,
      records: dummyRecords,
      metrics: {
        totalFees,
        totalCollected,
        pendingFees: totalFees - totalCollected,
        todayCollection: 75000,
      },
      monthly: [
        { month_label: "Jan 2024", month_key: "2024-01", collected: 320000 },
        { month_label: "Feb 2024", month_key: "2024-02", collected: 380000 },
        { month_label: "Mar 2024", month_key: "2024-03", collected: 420000 },
        { month_label: "Apr 2024", month_key: "2024-04", collected: 450000 },
        { month_label: "May 2024", month_key: "2024-05", collected: 475000 },
      ],
    });
  }
}
