const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPreviousPaymentMonths,
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
