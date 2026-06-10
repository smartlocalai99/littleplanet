import Link from "next/link";
import { FaUsers, FaClipboardList, FaRupeeSign, FaWallet, FaCalendarDay, FaReceipt, FaBoxes, FaBullhorn, FaUserPlus, FaFileInvoiceDollar, FaRegCalendarCheck, FaChartLine, FaMoneyBillWave } from "react-icons/fa";
import { getRoleLabel } from "@/lib/permissions";

export async function getServerSideProps(context) {
  const [{ withAuthPage }, { getDashboardProps }] = await Promise.all([
    import("@/lib/withAuthPage"),
    import("@/lib/dashboardData"),
  ]);
  const handler = withAuthPage({ path: "/dashboard", getProps: getDashboardProps });

  return handler(context);
}

const metricCards = [
  { label: "Total students", key: "totalStudents", href: "/students", icon: FaUsers, tone: "from-sky-50 to-cyan-50 text-sky-700", type: "count" },
  { label: "Total fees", key: "totalFees", href: "/fees", icon: FaRupeeSign, tone: "from-emerald-50 to-teal-50 text-emerald-700", type: "currency" },
  { label: "Pending fees", key: "pendingFees", href: "/fees", icon: FaWallet, tone: "from-amber-50 to-orange-50 text-amber-700", type: "currency" },
  { label: "Today's collection", key: "todaysCollection", href: "/fees", icon: FaCalendarDay, tone: "from-violet-50 to-fuchsia-50 text-violet-700", type: "currency" },
  { label: "Expenses", key: "expenses", href: "/expenses", icon: FaReceipt, tone: "from-rose-50 to-pink-50 text-rose-700", type: "currency" },
  { label: "Salaries", key: "salaries", href: "/payroll", icon: FaReceipt, tone: "from-blue-50 to-blue-100 text-blue-700", type: "currency" },
  { label: "Total Assets", key: "totalAssets", href: "/assets", icon: FaBoxes, tone: "from-green-50 to-green-100 text-green-700", type: "count" },
  { label: "Alerts", key: "alerts", href: "/alerts", icon: FaBullhorn, tone: "from-yellow-50 to-amber-100 text-amber-700", type: "count" },
];

const overviewCards = [
  ["Admissions pipeline", "Latest submissions and live application volume."],
  ["Fee tracking", "Daily collection, outstanding dues, and gross fee totals."],
  ["Operational spend", "Recent expenses surface quickly from the finance ledger."],
];

const financeShortcuts = [
  { label: "Admission Form", href: "/admissions", icon: FaUserPlus, description: "Open the admissions form first." },
  { label: "Fees Collection", href: "/fees", icon: FaFileInvoiceDollar, description: "Review dues and collect fees." },
  { label: "Expenses Entry", href: "/expenses", icon: FaRegCalendarCheck, description: "Add and track expenses." },
  { label: "Payroll", href: "/payroll", icon: FaMoneyBillWave, description: "Record and review payroll." },
  { label: "Reports", href: "/reports", icon: FaChartLine, description: "View finance and operations reports." },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCount(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

function getStatusTone(status) {
  const normalized = String(status || "NEW").toUpperCase();

  if (normalized === "APPROVED" || normalized === "ADMITTED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (normalized === "REJECTED") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getStatusLabel(status) {
  const normalized = String(status || "NEW").replace(/_/g, " ").toLowerCase();

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusChartTone(status) {
  const normalized = String(status || "NEW").toUpperCase();

  if (normalized === "APPROVED" || normalized === "ADMITTED") {
    return {
      bar: "bg-emerald-500",
      dot: "bg-emerald-500",
      surface: "bg-emerald-50",
      text: "text-emerald-700",
    };
  }

  if (normalized === "PENDING" || normalized === "IN_REVIEW" || normalized === "UNDER_REVIEW") {
    return {
      bar: "bg-sky-500",
      dot: "bg-sky-500",
      surface: "bg-sky-50",
      text: "text-sky-700",
    };
  }

  if (normalized === "REJECTED") {
    return {
      bar: "bg-rose-500",
      dot: "bg-rose-500",
      surface: "bg-rose-50",
      text: "text-rose-700",
    };
  }

  return {
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    surface: "bg-amber-50",
    text: "text-amber-700",
  };
}

function getMetricValue(item, metrics) {
  const rawValue = metrics[item.key];

  if (item.type === "count") {
    return formatCount(rawValue);
  }

  return formatCurrency(rawValue);
}

function formatChartValue(item) {
  return item.type === "currency" ? formatCurrency(item.value) : formatCount(item.value);
}

function getPercentageShare(value, max) {
  if (!max || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((Number(value || 0) / max) * 100));
}

function getMetricMax(metrics, type) {
  const values = metrics
    .filter((item) => item.type === type)
    .map((item) => Number(item.value || 0));

  return Math.max(...values, 1);
}

export default function DashboardPage({
  user,
  totalStudents,
  totalAdmissions,
  latestAdmissions,
  admissionStatusCounts = [],
  totalFees,
  pendingFees,
  todaysCollection,
  expenses,
  salaries,
  totalAssets,
  alerts = 0,}) {
  const role = getRoleLabel(user?.role);
  const isAccountant = role === "ACCOUNTANT";
  const statusSummary = admissionStatusCounts.filter((item) => Number(item.value || 0) > 0);
  const activeStatusCount = statusSummary.length;
  const topStatus = statusSummary[0];
  const comparisonMetrics = [
    { label: "Students", value: Number(totalStudents || 0), color: "bg-sky-500", type: "count" },
    { label: "Admissions", value: Number(totalAdmissions || 0), color: "bg-emerald-500", type: "count" },
    { label: "Assets", value: Number(totalAssets || 0), color: "bg-green-500", type: "count" },
    { label: "Fees collected", value: Number(totalFees || 0), color: "bg-violet-500", type: "currency" },
    { label: "Pending fees", value: Number(pendingFees || 0), color: "bg-amber-500", type: "currency" },
    { label: "Expenses", value: Number(expenses || 0), color: "bg-rose-500", type: "currency" },
    { label: "Salaries", value: Number(salaries || 0), color: "bg-blue-500", type: "currency" },
  ];
  const countMetricMax = getMetricMax(comparisonMetrics, "count");
  const currencyMetricMax = getMetricMax(comparisonMetrics, "currency");
  const visibleMetricCards = isAccountant
    ? metricCards.filter((item) => ["totalFees", "pendingFees", "todaysCollection", "expenses"].includes(item.key))
    : metricCards;
  const operationsSnapshot = isAccountant
    ? [
        ["Fees collected", formatCurrency(totalFees), "Collections posted from the fee ledger."],
        ["Pending fees", formatCurrency(pendingFees), "Outstanding balances that still need follow-up."],
        ["Today's cash in", formatCurrency(todaysCollection), "Payments collected for the current day."],
      ]
    : [
        ["Students", formatCount(totalStudents), "Live student records available for class tracking."],
        ["Admissions", formatCount(totalAdmissions), "Applications in the admissions table."],
        ["Today's cash in", formatCurrency(todaysCollection), "Collections posted for the current day."],
      ];

  return (
    <div className="space-y-6 p-4 md:p-6">
    

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {visibleMetricCards.map((item) => {
          const Icon = item.icon;
          const metrics = {
            totalStudents,
            totalFees,
            pendingFees,
            todaysCollection,
            expenses,
            salaries,
            totalAssets,
              alerts,

          };

          return (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">
                    {getMetricValue(item, metrics)}
                  </p>
                </div>
                <span className={`rounded-2xl bg-linear-to-br ${item.tone} p-3`}>
                  <Icon className="text-xl" />
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                {item.key === "totalStudents" && `${formatCount(totalAdmissions)} admissions recorded in the system.`}
                {item.key === "totalFees" && "Gross fee volume captured from the fee ledger."}
                {item.key === "pendingFees" && "Outstanding balances that still need to be collected."}
                {item.key === "todaysCollection" && "Payments collected today across all available fee records."}
                {item.key === "expenses" && "Expense outflow captured from the finance ledger."}
                {item.key === "salaries" && "Total salary payments (auto-detected)."}
                {item.key === "totalAssets" && "Assets currently tracked across school operations."}
                {item.key === "alerts" && "Important notices and pending action items."}
              </p>
            </Link>
          );
        })}
      </section>

      {isAccountant && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Quick access</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Finance entry points</h3>
            </div>
            <FaClipboardList className="text-2xl text-slate-400" />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {financeShortcuts.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                    <span className="rounded-2xl bg-primary-10 p-3 text-primary transition group-hover:bg-primary-20 group-hover:text-white">
                      <Icon className="text-xl" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Chart view</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Metric comparisons</h3>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Live snapshot
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {comparisonMetrics.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="font-mono text-slate-500">{formatChartValue(item)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all`}
                    style={{ width: `${getPercentageShare(item.value, item.type === "currency" ? currencyMetricMax : countMetricMax)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Admissions flow</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Academic year : 2026-2027</h3>
            </div>
          </div>

          <div className="mt-6">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-600">Total applications</p>
                  <p className="mt-2 text-4xl font-black text-slate-900">{formatCount(totalAdmissions)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-600">Active stages</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{formatCount(activeStatusCount)}</p>
                </div>
              </div>

              {topStatus && (
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Most applications are currently marked as <span className="font-semibold text-slate-900">{getStatusLabel(topStatus.status)}</span>.
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-3">
              {statusSummary.length > 0 ? statusSummary.map((item) => {
                const tone = getStatusChartTone(item.status);

                return (
                  <div key={item.status} className={`rounded-2xl ${tone.surface} p-4`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                        <span className={`text-sm font-bold ${tone.text}`}>{getStatusLabel(item.status)}</span>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-black text-slate-900 shadow-sm">
                        {formatCount(item.value)}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
                      <div
                        className={`h-full rounded-full ${tone.bar}`}
                        style={{ width: `${getPercentageShare(item.value, Math.max(totalAdmissions, 1))}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  No admission statuses are available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Latest admissions</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Recent applications</h3>
            </div>
            <FaClipboardList className="text-2xl text-slate-400" />
          </div>

          <div className="mt-5 grid gap-3 md:hidden">
            {latestAdmissions.length > 0 ? latestAdmissions.map((admission) => (
              <div key={admission.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                      {admission.student_name || "Unnamed applicant"}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Admission #{admission.id}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${getStatusTone(admission.admission_status)}`}>
                    {admission.admission_status || "NEW"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Class</p>
                    <p className="mt-1 font-semibold text-slate-800">{admission.class_applying_for || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Fees</p>
                    <p className="mt-1 font-semibold text-slate-800">{formatCurrency(admission.fees)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Parent</p>
                    <p className="mt-1 font-semibold text-slate-800">{admission.father_name || "-"}</p>
                    <p className="mt-0.5 text-slate-500">{admission.father_mobile || "-"}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No admissions are available yet.
              </div>
            )}
          </div>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                  <th className="border-b border-slate-200 px-4 py-3">Student</th>
                  <th className="border-b border-slate-200 px-4 py-3">Class</th>
                  <th className="border-b border-slate-200 px-4 py-3">Parent</th>
                  <th className="border-b border-slate-200 px-4 py-3">Status</th>
                  <th className="border-b border-slate-200 px-4 py-3">Fees</th>
                </tr>
              </thead>
              <tbody>
                {latestAdmissions.length > 0 ? latestAdmissions.map((admission) => (
                  <tr key={admission.id} className="align-top hover:bg-slate-50/80">
                    <td className="border-b border-slate-100 px-4 py-4">
                      <div className="font-semibold text-slate-900">{admission.student_name || "Unnamed applicant"}</div>
                      <div className="mt-1 text-sm text-slate-500">Admission #{admission.id}</div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                      {admission.class_applying_for || "-"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                      <div className="font-medium text-slate-900">{admission.father_name || "-"}</div>
                      <div className="mt-1 text-slate-500">{admission.father_mobile || "-"}</div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${getStatusTone(admission.admission_status)}`}>
                        {admission.admission_status || "NEW"}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700">
                      {formatCurrency(admission.fees)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="px-4 py-8 text-sm text-slate-500" colSpan={5}>
                      No admissions are available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Operations snapshot</h3>
          <div className="mt-4 grid gap-4">
            {operationsSnapshot.map(([title, value, description]) => (
              <div key={title} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
