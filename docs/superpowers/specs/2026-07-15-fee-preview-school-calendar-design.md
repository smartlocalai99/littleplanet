# Fee Preview and School Calendar Design

## Goal

Change fee collection so the user reviews a draft receipt before anything is saved, then explicitly chooses `Save` or `Save & Print`. Add a compact June-to-May payment calendar to both existing receipt copies.

## Preview-First Flow

Submitting the fee collection form validates the current inputs and opens the existing receipt modal as a draft preview. Opening this preview must not call `/api/fees/collect`, create a fee payment, generate a receipt number, send WhatsApp, clear the form, or print.

The draft receipt uses the selected student’s existing ledger row plus the entered amount to show:

- the current payment amount;
- projected total paid after this payment;
- projected pending balance after this payment;
- the school-year payment calendar including the draft amount in its payment month;
- `PREVIEW` instead of a generated receipt number.

The preview header has three actions:

- `Close`: close the modal without saving or clearing the form;
- `Save`: persist the payment once, run the existing WhatsApp behavior, refresh fees data, close the preview, and clear the form;
- `Save & Print`: persist the payment once, run the existing WhatsApp behavior, refresh fees data, replace draft values with the actual receipt number and database history, then open printing.

Both save actions are disabled while the request is running so a payment cannot be submitted twice. A save failure leaves the preview open, preserves the form, and displays a clean error. The existing automatic print after every save is removed.

## June-to-May Payment Calendar

Both the School Copy and Parent Copy keep their current identity, payment, total-paid, pending-balance, amount-in-words, notes, and signature sections. A new one-row calendar is added inside each copy.

The header columns are exactly:

`Jun | Jul | Aug | Sep | Oct | Nov | Dec | Jan | Feb | Mar | Apr | May`

The amount row displays the sum of payments received in each calendar month for the relevant school year. Months with no payment display `-`. Multiple transactions in one month are combined. Only three-letter English month labels are printed.

The school year is determined from the payment date:

- June through December belong to the school year beginning in that calendar year;
- January through May belong to the school year that began in the previous calendar year.

For example, a payment dated January 2027 uses the June 2026 through May 2027 calendar. Historical transactions outside that school-year window are not shown in that receipt calendar. The draft preview includes its entered amount in the matching month; the saved receipt uses refreshed database payment history, avoiding duplicate inclusion.

The calendar replaces the separate `Previous Payment - Month` receipt rows because the calendar communicates the same history more compactly. `Current Payment Paid`, `Total Paid`, and `Pending Balance` remain as separate summary rows.

## Data and Component Boundaries

- `pages/fees.jsx` owns draft-preview state, the explicit save actions, refreshed receipt state, and the modal buttons.
- `lib/feeReceiptHistory.js` owns the pure June-to-May calendar calculation for historical and optional draft payments.
- `/api/fees/collect` remains the only persistence path and is called only from `Save` or `Save & Print`.
- `/api/fees` continues returning raw payment history for saved receipt reconstruction.
- No database schema change is required.

## Error Handling

- Existing form validation runs before the draft preview opens.
- Missing ledger totals fall back to zero and projected balance never becomes negative.
- Invalid history dates or amounts are ignored by the calendar helper.
- Save failures do not close the preview or clear draft inputs.
- A print action cannot run until persistence succeeds and the actual saved receipt is available.

## Testing and Verification

- Test school-year ordering from June through May.
- Test January-to-May dates select the school year beginning in the previous calendar year.
- Test same-month payments are summed and out-of-year payments are excluded.
- Test a draft payment is included exactly once in its month.
- Test preview totals and balance projection.
- Verify the form submit path does not POST until an explicit save action.
- Run the full Node test suite, targeted ESLint, and the Next.js production build.
- Visually verify both receipt copies and the three preview actions when the in-app browser is available.

