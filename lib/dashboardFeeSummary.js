const { buildFeeMetrics } = require("./feeMetrics");

const DASHBOARD_FEE_SUMMARY_SQL = `
  SELECT
    COALESCE((
      SELECT SUM(COALESCE(final_fee, fees - COALESCE(discount, 0), fees, 0))
      FROM public.admissions
    ), 0)::numeric AS final_receivable,
    COALESCE((
      SELECT SUM(amount_paid)
      FROM public.fee_payments
    ), 0)::numeric AS total_collected,
    COALESCE((
      SELECT SUM(amount_paid)
      FROM public.fee_payments
      WHERE payment_date = CURRENT_DATE
    ), 0)::numeric AS today_collection
`;

async function loadDashboardFeeSummary(runQuery) {
  const result = await runQuery(DASHBOARD_FEE_SUMMARY_SQL, []);
  const metrics = buildFeeMetrics(result.rows[0]);

  return {
    totalFees: metrics.totalFees,
    pendingFees: Math.max(metrics.pendingFees, 0),
    todaysCollection: metrics.todayCollection,
  };
}

module.exports = {
  loadDashboardFeeSummary,
};
