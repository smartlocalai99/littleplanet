# Play Class and Fee Receipt History Design

## Goal

Add `Play Class` anywhere the application offers a school class, give it the same admission fee defaults as Nursery, and make fee receipts clearly show the student's earlier payments by payment month, the current payment, total paid, and remaining balance.

## Class Changes

- Use the exact label `Play Class`.
- Add it before Nursery in the admission `Class Applying For` dropdown.
- Add it before Nursery in the admission `Previous Class` dropdown.
- Add it to the fees page class selector and ledger class filter.
- Give it the same fee defaults as Nursery:
  - Total fees: Rs. 19,000
  - First-term fee: Rs. 5,000
  - Monthly balance text: Rs. 2,000 per month

## Receipt Payment History

The payment month comes from each payment's existing `payment_date`. The receipt displays only the localized month name, not the day or year. No new fee-month selector or allocation table is needed.

For the receipt currently being printed:

- Query all earlier `fee_payments` for the same admission.
- Exclude the current payment from the earlier-payment list.
- Group earlier payments by calendar month so multiple payments received in the same month appear as one month total.
- Display each earlier month in chronological order, for example `June - Rs. 3,000` and `July - Rs. 4,000`.
- Display the newly recorded amount separately as `Current Payment`.
- Display cumulative `Total Paid` including the current payment.
- Display `Pending Balance` after the current payment.
- Render the same details on both the School Copy and Parent Copy.

If there are no earlier payments, display `Previous Payments - None` so the receipt remains explicit. Existing historical payments continue to work because the design uses the current `payment_date` and `amount_paid` columns.

## Data Flow

After a fee payment is saved, the fees API returns ledger data containing the latest receipt and the admission's raw payment history. The receipt-data builder excludes the current receipt, groups earlier transactions by month, and passes the resulting rows to the receipt component.

Opening an existing ledger receipt uses the same API-provided history. The current payment is identified by its payment ID or receipt number, avoiding accidental inclusion in `Previous Payments`.

## Validation and Error Handling

- Payment saving behavior remains unchanged.
- Missing or invalid historical rows are ignored rather than breaking receipt printing.
- Currency amounts are normalized to numbers before totals are calculated.
- If total fee data is absent, the receipt still shows payment history and total paid; pending balance remains zero under the existing ledger rules.

## Testing

- Verify `Play Class` returns the same fee defaults as Nursery.
- Verify receipt-history logic groups earlier payments by month, orders them chronologically, excludes the current payment, and calculates the expected current, total-paid, and pending values.
- Verify the empty-history state.
- Run targeted Node tests, ESLint on touched files, and the production build.
