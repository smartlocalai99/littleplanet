const test = require("node:test");
const assert = require("node:assert/strict");

const { loadDashboardFeeSummary } = require("../lib/dashboardFeeSummary");

test("loads dashboard fee totals from admissions and fee payments", async () => {
  let executedSql = "";
  const runQuery = async (sql, params) => {
    executedSql = sql;
    assert.deepEqual(params, []);
    return {
      rows: [{
        final_receivable: "294000.00",
        total_collected: "72000.00",
        today_collection: "4000.00",
      }],
    };
  };

  assert.deepEqual(await loadDashboardFeeSummary(runQuery), {
    totalFees: 294000,
    pendingFees: 222000,
    todaysCollection: 4000,
  });
  assert.match(executedSql, /FROM public\.admissions/);
  assert.match(executedSql, /final_fee/);
  assert.match(executedSql, /FROM public\.fee_payments/);
  assert.match(executedSql, /amount_paid/);
  assert.match(executedSql, /payment_date = CURRENT_DATE/);
});
