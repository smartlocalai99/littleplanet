function toNumber(value) {
  return Number(value || 0);
}

function buildFeeMetrics(row = {}) {
  const finalReceivable = toNumber(row.final_receivable);
  const totalCollected = toNumber(row.total_collected);

  return {
    totalFees: finalReceivable,
    totalCollected,
    pendingFees: finalReceivable - totalCollected,
    todayCollection: toNumber(row.today_collection),
    discountStudents: toNumber(row.discount_students),
    totalDiscount: toNumber(row.total_discount),
    expectedFees: toNumber(row.expected_fees),
    finalReceivable,
  };
}

module.exports = {
  buildFeeMetrics,
};
