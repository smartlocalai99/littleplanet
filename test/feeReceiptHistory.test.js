const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildFeePreviewTotals,
  buildPreviousPaymentMonths,
  buildSchoolYearPaymentCalendar,
} = require("../lib/feeReceiptHistory");

test("groups earlier payments by month and excludes the current receipt", () => {
  const result = buildPreviousPaymentMonths(
    [
      {
        id: 1,
        receipt_no: "R-1",
        payment_date: "2026-06-03",
        amount_paid: "1000",
      },
      {
        id: 2,
        receipt_no: "R-2",
        payment_date: "2026-06-20",
        amount_paid: "2000",
      },
      {
        id: 3,
        receipt_no: "R-3",
        payment_date: "2026-07-05",
        amount_paid: "4000",
      },
      {
        id: 4,
        receipt_no: "R-4",
        payment_date: "2026-08-01",
        amount_paid: "4000",
      },
    ],
    { currentPaymentId: 4, currentReceiptNo: "R-4" }
  );

  assert.deepEqual(result, [
    { monthKey: "2026-06", monthLabel: "June", amount: 3000 },
    { monthKey: "2026-07", monthLabel: "July", amount: 4000 },
  ]);
});

test("returns an empty list when there are no earlier valid payments", () => {
  assert.deepEqual(buildPreviousPaymentMonths([], {}), []);
});

test("builds a Jun-to-May calendar and groups payments in the school year", () => {
  const result = buildSchoolYearPaymentCalendar(
    [
      { payment_date: "2026-06-03", amount_paid: "1000" },
      { payment_date: "2026-06-20", amount_paid: "2000" },
      { payment_date: "2026-08-05", amount_paid: "4000" },
      { payment_date: "2025-06-05", amount_paid: "9999" },
    ],
    { referenceDate: "2026-08-10" }
  );

  assert.deepEqual(
    result.map(({ monthLabel, amount }) => ({ monthLabel, amount })),
    [
      { monthLabel: "Jun", amount: 3000 },
      { monthLabel: "Jul", amount: 0 },
      { monthLabel: "Aug", amount: 4000 },
      { monthLabel: "Sep", amount: 0 },
      { monthLabel: "Oct", amount: 0 },
      { monthLabel: "Nov", amount: 0 },
      { monthLabel: "Dec", amount: 0 },
      { monthLabel: "Jan", amount: 0 },
      { monthLabel: "Feb", amount: 0 },
      { monthLabel: "Mar", amount: 0 },
      { monthLabel: "Apr", amount: 0 },
      { monthLabel: "May", amount: 0 },
    ]
  );
});

test("uses the previous calendar year for January-to-May receipts", () => {
  const result = buildSchoolYearPaymentCalendar([], {
    referenceDate: "2027-01-15",
  });

  assert.equal(result[0].monthKey, "2026-06");
  assert.equal(result[11].monthKey, "2027-05");
});

test("adds a draft payment exactly once to its calendar month", () => {
  const result = buildSchoolYearPaymentCalendar(
    [{ payment_date: "2026-08-05", amount_paid: 1000 }],
    {
      referenceDate: "2026-08-10",
      draftPayment: { payment_date: "2026-08-10", amount_paid: 2500 },
    }
  );

  assert.equal(result.find((cell) => cell.monthLabel === "Aug").amount, 3500);
});

test("calculates projected receipt totals before saving", () => {
  assert.deepEqual(
    buildFeePreviewTotals({
      totalFee: 15000,
      paidAmount: 7000,
      draftAmount: 4000,
    }),
    { currentPayment: 4000, totalPaid: 11000, balanceAmount: 4000 }
  );
});
