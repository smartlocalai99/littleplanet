const test = require("node:test");
const assert = require("node:assert/strict");

const { buildFeeMetrics } = require("../lib/feeMetrics");

test("builds fees dashboard metrics with discount totals", () => {
  assert.deepEqual(
    buildFeeMetrics({
      expected_fees: "320000",
      final_receivable: "275000",
      discount_students: "12",
      total_discount: "45000",
      total_collected: "100000",
      today_collection: "5000",
    }),
    {
      totalFees: 275000,
      totalCollected: 100000,
      pendingFees: 175000,
      todayCollection: 5000,
      discountStudents: 12,
      totalDiscount: 45000,
      expectedFees: 320000,
      finalReceivable: 275000,
    }
  );
});
