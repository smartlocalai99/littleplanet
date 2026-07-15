const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function buildPreviousPaymentMonths(
  payments,
  { currentPaymentId, currentReceiptNo } = {}
) {
  const currentId = String(currentPaymentId ?? "").trim();
  const currentReceipt = String(currentReceiptNo ?? "").trim();
  const totalsByMonth = new Map();

  for (const payment of Array.isArray(payments) ? payments : []) {
    const paymentId = String(payment?.id ?? "").trim();
    const receiptNo = String(payment?.receipt_no ?? "").trim();
    const isCurrentPayment =
      (currentId && paymentId === currentId) ||
      (currentReceipt && receiptNo === currentReceipt);

    if (isCurrentPayment) {
      continue;
    }

    const dateMatch = String(payment?.payment_date ?? "").match(
      /^(\d{4})-(\d{2})/
    );
    const amount = Number(payment?.amount_paid);

    if (!dateMatch || !Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    const monthNumber = Number(dateMatch[2]);

    if (monthNumber < 1 || monthNumber > 12) {
      continue;
    }

    const monthKey = `${dateMatch[1]}-${dateMatch[2]}`;
    totalsByMonth.set(monthKey, (totalsByMonth.get(monthKey) || 0) + amount);
  }

  return Array.from(totalsByMonth.entries())
    .sort(([leftMonth], [rightMonth]) => leftMonth.localeCompare(rightMonth))
    .map(([monthKey, amount]) => ({
      monthKey,
      monthLabel: MONTH_NAMES[Number(monthKey.slice(5, 7)) - 1],
      amount,
    }));
}

module.exports = {
  buildPreviousPaymentMonths,
};
