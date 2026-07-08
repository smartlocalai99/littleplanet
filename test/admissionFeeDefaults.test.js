const test = require("node:test");
const assert = require("node:assert/strict");

const { getAdmissionFeeDefault } = require("../lib/admissionFeeDefaults");

test("returns Little Planet fee defaults for admission classes", () => {
  assert.deepEqual(getAdmissionFeeDefault("Nursery"), {
    totalFees: 19000,
    firstTermFee: 5000,
    monthlyBalanceText: "Rs. 2000/- per month",
  });

  assert.deepEqual(getAdmissionFeeDefault("5th"), {
    totalFees: 28000,
    firstTermFee: 8000,
    monthlyBalanceText: "Rs. 3000/- per month",
  });
});

test("returns null when no admission fee default exists for a class", () => {
  assert.equal(getAdmissionFeeDefault("6th"), null);
  assert.equal(getAdmissionFeeDefault(""), null);
});
