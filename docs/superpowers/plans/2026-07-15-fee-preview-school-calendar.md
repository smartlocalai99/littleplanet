# Fee Preview and School Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preview fee receipts before persistence, save only through explicit modal actions, and add a Jun-to-May amount calendar to both receipt copies.

**Architecture:** Extend the existing pure receipt-history module with school-year calendar and preview-total builders. Refactor the fees page into a draft-preview step and a separate persistence step while keeping `/api/fees/collect` as the only database write path.

**Tech Stack:** Next.js 16.2.4 Pages Router, React 19, PostgreSQL, Node test runner, ESLint.

## Global Constraints

- Opening the receipt preview must not call `/api/fees/collect`, generate a receipt number, send WhatsApp, clear the form, or print.
- `Close` makes no database change and preserves the fee form.
- `Save` persists once, refreshes data, closes the preview, and clears the form.
- `Save & Print` persists once, refreshes the actual receipt, and only then prints.
- Both save buttons are disabled during persistence to prevent duplicates.
- Both existing receipt copies remain and show the same Jun-to-May calendar.
- Calendar labels are exactly `Jun Jul Aug Sep Oct Nov Dec Jan Feb Mar Apr May`.
- Calendar amounts are grouped by payment month within the school year containing the receipt payment date; empty months show `-`.
- Separate `Previous Payment - Month` rows are removed; current payment, total paid, and pending balance remain.
- No database schema change is allowed.

---

### Task 1: Build school-year calendar and preview totals

**Files:**
- Modify: `lib/feeReceiptHistory.js`
- Modify: `test/feeReceiptHistory.test.js`

**Interfaces:**
- Produces: `buildSchoolYearPaymentCalendar(payments, { referenceDate, draftPayment })` returning 12 `{ monthKey, monthLabel, amount }` cells from Jun through May.
- Produces: `buildFeePreviewTotals({ totalFee, paidAmount, draftAmount })` returning `{ currentPayment, totalPaid, balanceAmount }`.

- [ ] **Step 1: Write failing calendar tests**

Add tests asserting:

```js
assert.deepEqual(
  buildSchoolYearPaymentCalendar(
    [
      { payment_date: "2026-06-03", amount_paid: "1000" },
      { payment_date: "2026-06-20", amount_paid: "2000" },
      { payment_date: "2026-08-05", amount_paid: "4000" },
      { payment_date: "2025-06-05", amount_paid: "9999" },
    ],
    { referenceDate: "2026-08-10" }
  ).map(({ monthLabel, amount }) => ({ monthLabel, amount })),
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
```

Add a January reference test proving `2027-01-15` produces keys from `2026-06` through `2027-05`. Add a draft test proving a `{ payment_date: "2026-08-10", amount_paid: 2500 }` draft is added exactly once to August.

- [ ] **Step 2: Write the failing preview-total test**

```js
assert.deepEqual(
  buildFeePreviewTotals({ totalFee: 15000, paidAmount: 7000, draftAmount: 4000 }),
  { currentPayment: 4000, totalPaid: 11000, balanceAmount: 4000 }
);
```

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test test/feeReceiptHistory.test.js`

Expected: FAIL because the two new exported functions do not exist.

- [ ] **Step 4: Implement the pure helpers**

Use a fixed school-year month definition:

```js
const SCHOOL_YEAR_MONTHS = [
  { month: 6, label: "Jun" }, { month: 7, label: "Jul" },
  { month: 8, label: "Aug" }, { month: 9, label: "Sep" },
  { month: 10, label: "Oct" }, { month: 11, label: "Nov" },
  { month: 12, label: "Dec" }, { month: 1, label: "Jan" },
  { month: 2, label: "Feb" }, { month: 3, label: "Mar" },
  { month: 4, label: "Apr" }, { month: 5, label: "May" },
];
```

Derive the starting year from `referenceDate`, generate exact `YYYY-MM` keys, sum valid positive historical payments plus the optional draft into matching keys only, and return all 12 cells. Normalize preview numbers and clamp pending balance at zero.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test test/feeReceiptHistory.test.js`

Expected: all receipt-history tests pass with zero failures.

- [ ] **Step 6: Commit Task 1**

```bash
git add lib/feeReceiptHistory.js test/feeReceiptHistory.test.js
git commit -m "Add school-year fee calendar helpers"
```

### Task 2: Separate draft preview from persistence

**Files:**
- Modify: `pages/fees.jsx:698-818, 1014-1063, 1384-1516, 1876-1881, 1951-1991`

**Interfaces:**
- Consumes: `buildSchoolYearPaymentCalendar` and `buildFeePreviewTotals` from Task 1.
- Produces: `previewFeeEntry(event)` that opens a draft without network mutation.
- Produces: `persistFeeEntry({ shouldPrint })` that performs the single POST and post-save refresh.
- Produces: `FeeReceiptPreviewModal` callbacks `onSave`, `onSaveAndPrint`, plus `saving` and `isPreview` state.

- [ ] **Step 1: Build draft preview state and submit handler**

Add `pendingFeeEntry` state. Replace the form submit handler with `previewFeeEntry`, which validates, snapshots the payload, finds the student ledger row, calculates projected totals, builds receipt data with `receipt_no: "PREVIEW"`, and opens the modal. This handler contains no `fetch`, form reset, WhatsApp action, or print call.

- [ ] **Step 2: Move the existing POST into explicit persistence**

Create `persistFeeEntry({ shouldPrint })`. It returns immediately while `savingFee` is true or no pending draft exists, POSTs the snapshotted payload exactly once, refreshes `/api/fees`, and builds actual receipt data from the refreshed row and generated receipt number.

For `shouldPrint: false`, close the modal after success. For `shouldPrint: true`, keep the actual saved receipt in the modal and schedule `printFeeReceiptOnly` only after the saved state has rendered. Remove the unconditional 700 ms print block.

- [ ] **Step 3: Preserve data correctly across outcomes**

Clear the form and `pendingFeeEntry` only after persistence succeeds. Keep the preview and draft intact on errors. Disable both save actions while persistence is running. Closing a draft preview must clear only modal state, not the form; closing an already-saved preview may clear only modal state because the form was already reset.

- [ ] **Step 4: Update modal actions and copy**

For draft previews render `Close`, `Save`, and `Save & Print`. For already-saved ledger receipts render the existing `Close` and `Print`. Change the draft subtitle to state that nothing is saved until an explicit save action.

- [ ] **Step 5: Verify source-level mutation boundaries**

Run:

```bash
rg -n "function previewFeeEntry|function persistFeeEntry|/api/fees/collect|setTimeout\(|printFeeReceiptOnly" pages/fees.jsx
```

Expected: `/api/fees/collect` appears only inside `persistFeeEntry`; no unconditional print follows form submission.

- [ ] **Step 6: Run targeted lint**

Run: `npx eslint pages/fees.jsx lib/feeReceiptHistory.js test/feeReceiptHistory.test.js`

Expected: zero lint errors; existing image optimization warnings are acceptable.

- [ ] **Step 7: Commit Task 2**

```bash
git add pages/fees.jsx
git commit -m "Preview fee receipt before saving"
```

### Task 3: Render the Jun-to-May calendar in both receipt copies

**Files:**
- Modify: `pages/fees.jsx:1014-1063, 2002-2145`

**Interfaces:**
- Consumes: `payment_calendar` from receipt data.
- Produces: `FeePaymentCalendar({ cells })`, rendered by the shared `FeeReceiptCopy` and therefore present in both copies.

- [ ] **Step 1: Add calendar data to receipt construction**

In `buildFeeReceiptData`, call `buildSchoolYearPaymentCalendar` with raw `payment_history`, `payment_date`, and the optional draft payment. Return the result as `payment_calendar`. Draft data includes the entered payment; saved data relies only on refreshed history.

- [ ] **Step 2: Replace previous-payment rows with the calendar component**

Remove `previous_payments` rendering. Render one 12-column header row with exact labels and one 12-column amount row. Use `formatAmountPlain(cell.amount)` for positive values and `-` for zero. Keep current-payment, total-paid, and pending-balance rows unchanged.

- [ ] **Step 3: Make print styling compact**

Use fixed 12-column CSS grid sizing and compact receipt typography so both School Copy and Parent Copy remain printable side by side. The calendar must use borders consistent with the existing receipt table.

- [ ] **Step 4: Run all tests and lint**

Run: `node --test test/*.test.js`

Expected: all tests pass with zero failures.

Run: `npx eslint pages/fees.jsx lib/feeReceiptHistory.js test/feeReceiptHistory.test.js`

Expected: zero lint errors; existing image warnings are acceptable.

- [ ] **Step 5: Commit Task 3**

```bash
git add pages/fees.jsx
git commit -m "Add school-year calendar to fee receipts"
```

### Task 4: Production and interaction verification

**Files:**
- Verify only unless a defect is found.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: evidence for merge and push.

- [ ] **Step 1: Run the production build**

Run: `npm run build`

Expected: Next.js production build exits with code 0.

- [ ] **Step 2: Verify the preview/save interaction locally**

When the in-app browser is available, verify opening the draft creates no fee POST, `Close` preserves the form, `Save` makes one POST without printing, and `Save & Print` makes one POST then prints. Confirm both receipt copies contain the 12-month calendar.

If the browser is unavailable, record that limitation and use the source-boundary check, full test suite, ESLint, and production build as the available evidence.

- [ ] **Step 3: Inspect final repository state**

Run: `git diff --check && git status --short --branch && git log -6 --oneline --decorate`

Expected: no whitespace errors and no uncommitted implementation files.

- [ ] **Step 4: Merge and push**

Fast-forward the verified feature branch into `main`, rerun the complete tests and build on merged `main`, then push `main` to `origin` and verify `HEAD` equals `origin/main`.

