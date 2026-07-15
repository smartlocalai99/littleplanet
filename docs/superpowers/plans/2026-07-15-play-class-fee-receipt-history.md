# Play Class and Fee Receipt History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Play Class with Nursery fees and show earlier payment months, current payment, total paid, and pending balance on both fee receipt copies.

**Architecture:** Centralize the selectable school classes in a small CommonJS-compatible module used by both admission and fees UI. Add a pure receipt-history helper, return each admission's existing payment rows from the fees API, and let the receipt builder group earlier transactions by payment month while excluding the current receipt.

**Tech Stack:** Next.js 16.2.4 Pages Router, React 19, PostgreSQL, Node test runner, ESLint.

## Global Constraints

- Use the exact label `Play Class` everywhere.
- Play Class fee defaults must exactly match Nursery: total Rs. 19,000, first term Rs. 5,000, and `Rs. 2000/- per month`.
- Receipt history uses existing `payment_date`; it adds no month-selection UI or database table.
- Receipt history displays the month name only, with no day or year.
- Earlier payments must exclude the current receipt and combine payments received in the same calendar month.
- Both School Copy and Parent Copy render identical payment-history details.

---

### Task 1: Centralize class options and add Play Class fees

**Files:**
- Create: `lib/schoolClasses.js`
- Create: `test/schoolClasses.test.js`
- Modify: `test/admissionFeeDefaults.test.js`
- Modify: `lib/admissionFeeDefaults.js`
- Modify: `components/AdmissionForm.js:4, 477-515`
- Modify: `pages/fees.jsx:5, 346-361`

**Interfaces:**
- Produces: `SCHOOL_CLASS_OPTIONS: string[]`, with `Play Class` before `Nursery`.
- Produces: `getAdmissionFeeDefault("Play Class")` returning the same object values as Nursery.

- [ ] **Step 1: Write failing class and fee-default tests**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { SCHOOL_CLASS_OPTIONS } = require("../lib/schoolClasses");

test("includes Play Class before Nursery", () => {
  assert.deepEqual(SCHOOL_CLASS_OPTIONS.slice(0, 2), ["Play Class", "Nursery"]);
});
```

Add this assertion to the admission fee-default test:

```js
assert.deepEqual(
  getAdmissionFeeDefault("Play Class"),
  getAdmissionFeeDefault("Nursery")
);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test test/schoolClasses.test.js test/admissionFeeDefaults.test.js`

Expected: FAIL because `lib/schoolClasses.js` and the Play Class fee default do not exist.

- [ ] **Step 3: Add the shared list and Play Class default**

```js
const SCHOOL_CLASS_OPTIONS = [
  "Play Class", "Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th",
  "5th", "6th", "7th", "8th", "9th", "10th",
];

module.exports = { SCHOOL_CLASS_OPTIONS };
```

Add the Play Class key to `ADMISSION_FEE_DEFAULTS` with the exact Nursery values. Import `SCHOOL_CLASS_OPTIONS` into both UI files, render it in the admission `Class Applying For` and `Previous Class` selects, and use it as the fees-page fallback list.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test test/schoolClasses.test.js test/admissionFeeDefaults.test.js`

Expected: 3 tests pass with zero failures.

- [ ] **Step 5: Commit Task 1**

```bash
git add lib/schoolClasses.js lib/admissionFeeDefaults.js test/schoolClasses.test.js test/admissionFeeDefaults.test.js components/AdmissionForm.js pages/fees.jsx
git commit -m "Add Play Class with Nursery fees"
```

### Task 2: Build payment-month history and render it on receipts

**Files:**
- Create: `lib/feeReceiptHistory.js`
- Create: `test/feeReceiptHistory.test.js`
- Modify: `pages/api/fees.js:60-103`
- Modify: `pages/fees.jsx:5, 749-764, 1014-1063, 2002-2105`

**Interfaces:**
- Consumes: fee history rows shaped as `{ id, receipt_no, payment_date, amount_paid }`.
- Produces: `buildPreviousPaymentMonths(payments, { currentPaymentId, currentReceiptNo })` returning `{ monthKey, monthLabel, amount }[]`.
- API produces: `payment_history` JSON array on every fee ledger record.
- Receipt data produces: `previous_payments` for both receipt copies.

- [ ] **Step 1: Write failing receipt-history tests**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPreviousPaymentMonths } = require("../lib/feeReceiptHistory");

test("groups earlier payments by month and excludes the current receipt", () => {
  const result = buildPreviousPaymentMonths([
    { id: 1, receipt_no: "R-1", payment_date: "2026-06-03", amount_paid: "1000" },
    { id: 2, receipt_no: "R-2", payment_date: "2026-06-20", amount_paid: "2000" },
    { id: 3, receipt_no: "R-3", payment_date: "2026-07-05", amount_paid: "4000" },
    { id: 4, receipt_no: "R-4", payment_date: "2026-08-01", amount_paid: "4000" },
  ], { currentPaymentId: 4, currentReceiptNo: "R-4" });

  assert.deepEqual(result, [
    { monthKey: "2026-06", monthLabel: "June", amount: 3000 },
    { monthKey: "2026-07", monthLabel: "July", amount: 4000 },
  ]);
});

test("returns an empty list when there are no earlier valid payments", () => {
  assert.deepEqual(buildPreviousPaymentMonths([], {}), []);
});
```

- [ ] **Step 2: Run the helper test and verify RED**

Run: `node --test test/feeReceiptHistory.test.js`

Expected: FAIL because `lib/feeReceiptHistory.js` does not exist.

- [ ] **Step 3: Implement the pure history helper**

Implement `buildPreviousPaymentMonths` to normalize numeric IDs and receipt numbers, discard the current row, parse `YYYY-MM` from valid payment dates, sum amounts in a `Map`, sort by `monthKey`, and format month labels through a fixed English month-name array. Invalid dates and non-positive/non-numeric amounts are ignored.

- [ ] **Step 4: Run the helper test and verify GREEN**

Run: `node --test test/feeReceiptHistory.test.js`

Expected: 2 tests pass with zero failures.

- [ ] **Step 5: Return raw payment history from the fees API**

Add this correlated field to the ledger query:

```sql
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
```

No schema migration is required.

- [ ] **Step 6: Feed history through the receipt builder**

Import `buildPreviousPaymentMonths`. The refreshed ledger row supplies `latest_payment_id` and `payment_history`, while the existing post-save override supplies the new receipt number. In `buildFeeReceiptData`, calculate:

```js
const previousPayments = buildPreviousPaymentMonths(
  overrides.payment_history ?? item.payment_history ?? [],
  {
    currentPaymentId: overrides.latest_payment_id ?? item.latest_payment_id,
    currentReceiptNo: overrides.latest_receipt_no ?? item.latest_receipt_no,
  }
);
```

Return it as `previous_payments`.

- [ ] **Step 7: Render the requested receipt rows**

Before `Current Payment Paid`, render a `Previous Payments` header and one row per previous month with its amount. When empty, render `Previous Payments` and `None`. Keep `Current Payment Paid`, then render `Total Paid` and a new `Pending Balance` row using `balance_amount`.

- [ ] **Step 8: Run targeted tests and lint**

Run: `node --test test/feeReceiptHistory.test.js test/schoolClasses.test.js test/admissionFeeDefaults.test.js`

Expected: 5 tests pass with zero failures.

Run: `npx eslint pages/fees.jsx pages/api/fees.js components/AdmissionForm.js lib/feeReceiptHistory.js lib/schoolClasses.js lib/admissionFeeDefaults.js test/feeReceiptHistory.test.js test/schoolClasses.test.js test/admissionFeeDefaults.test.js`

Expected: exit code 0 with no lint errors.

- [ ] **Step 9: Commit Task 2**

```bash
git add lib/feeReceiptHistory.js test/feeReceiptHistory.test.js pages/api/fees.js pages/fees.jsx
git commit -m "Show previous payment months on fee receipts"
```

### Task 3: Production verification

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: completed Task 1 and Task 2 behavior.
- Produces: verification evidence for handoff.

- [ ] **Step 1: Run the complete Node test suite**

Run: `node --test test/*.test.js`

Expected: every test passes with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Next.js production build exits with code 0.

- [ ] **Step 3: Inspect the final diff and repository state**

Run: `git diff --check && git status --short --branch && git log -5 --oneline --decorate`

Expected: no whitespace errors; source commits are present; no uncommitted implementation files remain.
