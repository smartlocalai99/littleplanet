const test = require("node:test");
const assert = require("node:assert/strict");

const { isSubmittedPayroll } = require("../lib/payrollStatus");

test("treats paid payroll as submitted and locked", () => {
  assert.equal(isSubmittedPayroll("PAID"), true);
  assert.equal(isSubmittedPayroll("paid"), true);
  assert.equal(isSubmittedPayroll("PENDING"), false);
  assert.equal(isSubmittedPayroll(""), false);
});
