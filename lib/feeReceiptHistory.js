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

const SCHOOL_YEAR_MONTHS = [
  { month: 6, label: "Jun" },
  { month: 7, label: "Jul" },
  { month: 8, label: "Aug" },
  { month: 9, label: "Sep" },
  { month: 10, label: "Oct" },
  { month: 11, label: "Nov" },
  { month: 12, label: "Dec" },
  { month: 1, label: "Jan" },
  { month: 2, label: "Feb" },
  { month: 3, label: "Mar" },
  { month: 4, label: "Apr" },
  { month: 5, label: "May" },
];

function parseYearMonth(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!year || month < 1 || month > 12) {
    return null;
  }

  return { year, month, monthKey: `${match[1]}-${match[2]}` };
}

function buildSchoolYearPaymentCalendar(
  payments,
  { referenceDate, draftPayment } = {}
) {
  const reference = parseYearMonth(referenceDate);

  if (!reference) {
    return [];
  }

  const startYear = reference.month >= 6 ? reference.year : reference.year - 1;
  const cells = SCHOOL_YEAR_MONTHS.map(({ month, label }) => {
    const year = month >= 6 ? startYear : startYear + 1;

    return {
      monthKey: `${year}-${String(month).padStart(2, "0")}`,
      monthLabel: label,
      amount: 0,
    };
  });
  const cellByMonth = new Map(cells.map((cell) => [cell.monthKey, cell]));
  const paymentRows = [
    ...(Array.isArray(payments) ? payments : []),
    ...(draftPayment ? [draftPayment] : []),
  ];

  for (const payment of paymentRows) {
    const paymentMonth = parseYearMonth(payment?.payment_date);
    const amount = Number(payment?.amount_paid);
    const cell = paymentMonth ? cellByMonth.get(paymentMonth.monthKey) : null;

    if (!cell || !Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    cell.amount += amount;
  }

  return cells;
}

function buildFeePreviewTotals({ totalFee, paidAmount, draftAmount } = {}) {
  const safeTotalFee = Math.max(Number(totalFee) || 0, 0);
  const safePaidAmount = Math.max(Number(paidAmount) || 0, 0);
  const currentPayment = Math.max(Number(draftAmount) || 0, 0);
  const totalPaid = safePaidAmount + currentPayment;

  return {
    currentPayment,
    totalPaid,
    balanceAmount: Math.max(safeTotalFee - totalPaid, 0),
  };
}

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
  buildFeePreviewTotals,
  buildPreviousPaymentMonths,
  buildSchoolYearPaymentCalendar,
};
