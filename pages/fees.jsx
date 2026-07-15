import { useEffect, useMemo, useRef, useState } from "react";
import { FaFileExcel, FaPlus, FaReceipt, FaSyncAlt, FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";
import { withAuthPage } from "@/lib/withAuthPage";
import { downloadExcel } from "@/lib/exportToExcel";
import {
  buildFeePreviewTotals,
  buildSchoolYearPaymentCalendar,
  createFeeSubmissionLock,
} from "@/lib/feeReceiptHistory";
import { SCHOOL_CLASS_OPTIONS } from "@/lib/schoolClasses";
import AdmissionModal from "@/components/AdmissionModal";

export const getServerSideProps = withAuthPage({ path: "/fees" });

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatAmountPlain(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatReceiptDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("en-IN");
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function numberToWords(value) {
  const number = Math.floor(Number(value) || 0);

  if (number === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convertBelowThousand = (num) => {
    let words = "";
    let n = num;

    if (n >= 100) {
      words += `${ones[Math.floor(n / 100)]} Hundred `;
      n %= 100;
    }

    if (n >= 20) {
      words += `${tens[Math.floor(n / 10)]} `;
      n %= 10;
    }

    if (n > 0) {
      words += `${ones[n]} `;
    }

    return words.trim();
  };

  let n = number;
  let words = "";

  if (n >= 10000000) {
    words += `${convertBelowThousand(Math.floor(n / 10000000))} Crore `;
    n %= 10000000;
  }

  if (n >= 100000) {
    words += `${convertBelowThousand(Math.floor(n / 100000))} Lakh `;
    n %= 100000;
  }

  if (n >= 1000) {
    words += `${convertBelowThousand(Math.floor(n / 1000))} Thousand `;
    n %= 1000;
  }

  if (n > 0) {
    words += convertBelowThousand(n);
  }

  return words.trim();
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-green-100 text-green-700",
    Partial: "bg-yellow-100 text-yellow-700",
    Pending: "bg-red-100 text-red-700",
    "Payment Link Generated": "bg-violet-100 text-violet-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status || "Pending"}
    </span>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M12.04 2C6.51 2 2.02 6.46 2.02 11.95c0 1.95.58 3.86 1.68 5.49L2 22l4.71-1.66a10.08 10.08 0 0 0 5.33 1.51h.01c5.53 0 10.02-4.46 10.02-9.95C22.07 6.46 17.57 2 12.04 2zm0 18.13a8.15 8.15 0 0 1-4.16-1.14l-.3-.17-2.8.98.94-2.73-.19-.28a8.05 8.05 0 0 1-1.25-4.3c0-4.44 3.64-8.05 8.12-8.05 4.47 0 8.11 3.61 8.11 8.05 0 4.44-3.64 8.04-8.11 8.04zm4.72-5.72c-.26-.13-1.54-.75-1.78-.84-.24-.09-.41-.13-.58.13-.17.26-.67.84-.82 1.01-.15.17-.3.19-.56.06-.26-.13-1.1-.4-2.1-1.26-.78-.69-1.3-1.53-1.46-1.79-.15-.26-.02-.41.11-.54.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.07-.13-.58-1.4-.8-1.92-.21-.5-.43-.43-.58-.44h-.49c-.17 0-.45.06-.69.32-.24.26-.91.89-.91 2.17 0 1.27.93 2.5 1.06 2.67.13.17 1.84 2.81 4.46 3.94.62.27 1.1.43 1.48.55.62.19 1.18.16 1.63.1.5-.08 1.54-.63 1.76-1.24.22-.61.22-1.14.15-1.24-.06-.1-.24-.17-.5-.3z" />
    </svg>
  );
}

function normalizePhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatClassName(value) {
  const className = String(value || "").trim();
  const numericClass = className.match(/^(?:class\s*)?(\d+)$/i)?.[1];

  if (!numericClass) {
    return className;
  }

  const number = Number(numericClass);

  if (number === 1) return "1st";
  if (number === 2) return "2nd";
  if (number === 3) return "3rd";

  return `${number}th`;
}

function getClassName(item) {
  return formatClassName(item?.class || item?.class_name || "");
}

function getPaymentMode(item) {
  return String(item?.payment_mode || item?.latest_payment_mode || "").trim();
}

function getStatus(item) {
  return String(item?.payment_status || "Pending").trim();
}

function parseMonthKey(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map(Number);

  if (!year || !month) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

function formatMonthLabel(monthKey) {
  const date = parseMonthKey(monthKey);

  if (!date) {
    return String(monthKey || "");
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(date);
}

const SCHOOL_YEAR_START_MONTH = 5;

function formatSchoolYearLabel(monthKey) {
  const date = parseMonthKey(monthKey);

  if (!date) {
    return "this school year";
  }

  const startYear =
    date.getMonth() >= SCHOOL_YEAR_START_MONTH
      ? date.getFullYear()
      : date.getFullYear() - 1;
  const endYear = String(startYear + 1).slice(-2);

  return `${startYear}-${endYear}`;
}

function getSchoolYearStartDate(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const startYear =
    referenceDate.getMonth() >= SCHOOL_YEAR_START_MONTH ? year : year - 1;

  return new Date(startYear, SCHOOL_YEAR_START_MONTH, 1);
}

function buildMonthlySeries(monthlyRows, monthsToShow = 12) {
  const sorted = [...monthlyRows]
    .filter((item) => String(item.month_key || "").match(/^\d{4}-\d{2}$/))
    .sort((a, b) => String(a.month_key).localeCompare(String(b.month_key)));

  const startDate = getSchoolYearStartDate();
  const endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + (monthsToShow - 1));

  const byMonth = new Map(
    sorted.map((item) => [
      item.month_key,
      {
        ...item,
        month_label: item.month_label || formatMonthLabel(item.month_key),
        collected: Number(item.collected || 0),
      },
    ])
  );

  const series = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const monthKey = `${cursor.getFullYear()}-${String(
      cursor.getMonth() + 1
    ).padStart(2, "0")}`;

    const existing = byMonth.get(monthKey);

    series.push(
      existing || {
        month_key: monthKey,
        month_label: formatMonthLabel(monthKey),
        collected: 0,
      }
    );

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return series;
}

export default function FeesPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [rows, setRows] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [monthly, setMonthly] = useState([]);
  const [entries, setEntries] = useState([]);

  const [entryForm, setEntryForm] = useState({
    admission_id: "",
    student_id: "",
    date: today,
    student_name: "",
    class_name: "",
    parent_mobile: "",
    amount_collected: "",
    payment_mode: "Cash",
    utr: "",
  });

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  const [loading, setLoading] = useState(false);
  const [entryError, setEntryError] = useState("");
  const [selectedLedgerAdmissionId, setSelectedLedgerAdmissionId] = useState(null);
  const [savingFee, setSavingFee] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [feeReceiptOpen, setFeeReceiptOpen] = useState(false);
  const [feeReceiptData, setFeeReceiptData] = useState(null);
  const [pendingFeeEntry, setPendingFeeEntry] = useState(null);
  const [phonePeLoading, setPhonePeLoading] = useState(false);
  const [phonePePayment, setPhonePePayment] = useState(null);
  const [copyLinkLabel, setCopyLinkLabel] = useState("Copy Link");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const studentSearchRef = useRef(null);
  const studentDebounceRef = useRef(null);
  const feeSubmissionLockRef = useRef(createFeeSubmissionLock());
  const [whatsapp, setWhatsapp] = useState({
    phase: "idle", // idle | connecting | connected
    qrUrl: "",
    error: "",
    user: null,
    limits: {},
  });
  const whatsappActiveRef = useRef(false);

  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerClass, setLedgerClass] = useState("All");
  const [ledgerStatus, setLedgerStatus] = useState("All");
  const [ledgerPaymentMode, setLedgerPaymentMode] = useState("All");
  const [ledgerDueOnly, setLedgerDueOnly] = useState(false);

  const [ledgerPage, setLedgerPage] = useState(1);
  const [feesVersion, setFeesVersion] = useState(0);
  const ledgerPageSize = 10;

  const classOptions = useMemo(() => {
    const uniqueFromRows = rows
      .map((item) => getClassName(item))
      .filter((value) => value && !/^\d+$/.test(value));

    return Array.from(new Set([...uniqueFromRows, ...SCHOOL_CLASS_OPTIONS]));
  }, [rows]);

  const paymentModeOptions = useMemo(() => {
    const defaultModes = ["Cash", "UPI", "PhonePe", "Bank Transfer"];
    const uniqueFromRows = rows
      .map((item) => getPaymentMode(item))
      .filter(Boolean);

    return Array.from(new Set([...defaultModes, ...uniqueFromRows]));
  }, [rows]);

  const monthlySeries = useMemo(() => buildMonthlySeries(monthly), [monthly]);

  const maxMonthly = useMemo(
    () => Math.max(...monthlySeries.map((m) => Number(m.collected || 0)), 1),
    [monthlySeries]
  );


  async function fetchWhatsappStatus() {
    const response = await fetch("/api/whatsapp/status");
    return response.json();
  }

  function stopWhatsappConnect() {
    whatsappActiveRef.current = false;
    setWhatsapp((current) => ({ ...current, phase: "idle" }));
  }

  async function startWhatsappConnect() {
    whatsappActiveRef.current = true;
    setWhatsapp({ phase: "connecting", qrUrl: "", error: "", user: null, limits: {} });

    try {
      let data = await fetchWhatsappStatus();

      while (whatsappActiveRef.current && !data.connected) {
        setWhatsapp((current) => ({
          ...current,
          qrUrl: data.qrUrl || "",
          error: data.success ? "" : data.error || "Unable to reach WhatsApp",
        }));

        await new Promise((resolve) => setTimeout(resolve, 4000));

        if (!whatsappActiveRef.current) {
          return;
        }

        data = await fetchWhatsappStatus();
      }

      if (data.connected) {
        setWhatsapp({
          phase: "connected",
          qrUrl: "",
          error: "",
          user: data.user || null,
          limits: data.limits || {},
        });
      }
    } catch (error) {
      setWhatsapp((current) => ({
        ...current,
        error: error.message || "Unable to check WhatsApp status",
      }));
    } finally {
      whatsappActiveRef.current = false;
    }
  }

  useEffect(() => {
    let isMounted = true;

    const loadFees = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        if (month) {
          params.set("month", month);
        }

        const res = await fetch(`/api/fees?${params.toString()}`);
        const data = await res.json();

        if (!isMounted || !data.success) {
          return;
        }

        setRows(data.records || []);
        setMetrics(data.metrics || {});
        setMonthly(data.monthly || []);
        setLedgerPage(1);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadFees();

    return () => {
      isMounted = false;
    };
  }, [month, feesVersion]);

  useEffect(() => stopWhatsappConnect, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (studentSearchRef.current && !studentSearchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleStudentQueryChange(e) {
    const value = e.target.value;
    setStudentQuery(value);
    setShowSuggestions(true);

    clearTimeout(studentDebounceRef.current);

    if (!value.trim()) {
      setStudentSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    studentDebounceRef.current = setTimeout(async () => {
      setSuggestionLoading(true);
      try {
        const res = await fetch(`/api/students?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setStudentSuggestions(data.students || []);
        setShowSuggestions(true);
      } catch {
        setStudentSuggestions([]);
      } finally {
        setSuggestionLoading(false);
      }
    }, 280);
  }

  function selectStudentSuggestion(student) {
    const className = formatClassName(student.class || "");
    const mobile = student.father_mobile || student.mother_mobile || "";
    setStudentQuery(student.full_name || "");
    setShowSuggestions(false);
    setStudentSuggestions([]);
    setEntryError("");
    setPhonePePayment(null);
    setCopyLinkLabel("Copy Link");
    setEntryForm((current) => ({
      ...current,
      admission_id: student.admission_id || "",
      student_id: student.id || "",
      student_name: student.full_name || "",
      class_name: className,
      parent_mobile: mobile,
      amount_collected: current.amount_collected,
      payment_mode: current.payment_mode === "PhonePe" ? "Cash" : current.payment_mode,
      utr: current.payment_mode === "UPI" ? current.utr : "",
    }));
  }

  const filteredLedgerRows = useMemo(() => {
    const search = ledgerSearch.trim().toLowerCase();

    return rows.filter((item) => {
      const className = getClassName(item);
      const status = getStatus(item);
      const paymentMode = getPaymentMode(item);
      const balance = Number(item.balance_amount || 0);

      const matchesSearch =
        !search ||
        [
          item.admission_id,
          item.student_name,
          item.father_name,
          item.father_mobile,
          className,
          status,
          paymentMode,
          item.latest_receipt_no,
          item.utr,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesClass =
        ledgerClass === "All" || className === ledgerClass;

      const matchesStatus =
        ledgerStatus === "All" || status === ledgerStatus;

      const matchesPaymentMode =
        ledgerPaymentMode === "All" || paymentMode === ledgerPaymentMode;

      const matchesDueOnly = !ledgerDueOnly || balance > 0;

      return (
        matchesSearch &&
        matchesClass &&
        matchesStatus &&
        matchesPaymentMode &&
        matchesDueOnly
      );
    });
  }, [
    rows,
    ledgerSearch,
    ledgerClass,
    ledgerStatus,
    ledgerPaymentMode,
    ledgerDueOnly,
  ]);

  const ledgerTotalPages = Math.max(
    1,
    Math.ceil(filteredLedgerRows.length / ledgerPageSize)
  );

  const activeLedgerPage = Math.min(ledgerPage, ledgerTotalPages);

  const paginatedLedgerRows = useMemo(
    () =>
      filteredLedgerRows.slice(
        (activeLedgerPage - 1) * ledgerPageSize,
        activeLedgerPage * ledgerPageSize
      ),
    [filteredLedgerRows, activeLedgerPage]
  );

  function resetLedgerFilters() {
    setLedgerSearch("");
    setLedgerClass("All");
    setLedgerStatus("All");
    setLedgerPaymentMode("All");
    setLedgerDueOnly(false);
    setLedgerPage(1);
  }

  function buildWhatsAppMessage(item) {
    return `Dear Parent, this is a reminder that your child's school fee balance is pending for ${
      formatSchoolYearLabel(month)
    }.\n\nStudent: ${item.student_name || "-"}\nClass: ${
      getClassName(item) || "-"
    }\nBalance: ${formatCurrency(
      item.balance_amount
    )}\n\nPlease clear the dues at the earliest. Thank you.`;
  }

  function openWhatsApp(item) {
    const phone = normalizePhoneNumber(item.father_mobile);

    if (!phone) {
      return;
    }

    const text = encodeURIComponent(buildWhatsAppMessage(item));

    window.open(
      `https://wa.me/${phone}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleEntryChange(event) {
    const { name, value } = event.target;
    const shouldClearStudentReference = [
      "student_name",
      "class_name",
      "parent_mobile",
    ].includes(name);

    setPhonePePayment(null);
    setCopyLinkLabel("Copy Link");
    setEntryForm((current) => ({
      ...current,
      [name]: value,
      ...(shouldClearStudentReference
        ? { admission_id: "", student_id: "" }
        : {}),
      ...(name === "payment_mode" ? (value === "UPI" ? {} : { utr: "" }) : {}),
    }));
  }

  function selectLedgerRowForCollection(item, options = {}) {
    setPhonePePayment(null);
    setCopyLinkLabel("Copy Link");
    setEntryError("");
    setStudentQuery(item.student_name || String(item.admission_id || ""));
    setEntryForm((current) => ({
      ...current,
      admission_id: item.admission_id || "",
      student_id: item.student_id || "",
      student_name: item.student_name || "",
      class_name: getClassName(item) || "",
      parent_mobile: item.father_mobile || "",
      amount_collected:
        Number(item.balance_amount || 0) > 0
          ? String(Number(item.balance_amount || 0))
          : current.amount_collected,
      payment_mode: current.payment_mode === "PhonePe" ? "Cash" : current.payment_mode,
      utr: current.payment_mode === "UPI" ? current.utr : "",
    }));

    if (options.shouldScroll !== false) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Receipt upload handler removed for Cash payments per request

  function exportLedgerToExcel() {
    downloadExcel({
      fileName: `fee-ledger-${month || "all"}.xlsx`,
      sheetName: "Fee Ledger",
      rows: filteredLedgerRows.map((item) => ({
        AdmissionID: item.admission_id,
        Student: item.student_name,
        Class: getClassName(item) || "-",
        Parent: item.father_name || "-",
        ParentMobile: item.father_mobile || "-",
        TotalFee: Number(item.total_fee || 0),
        Paid: Number(item.paid_amount || 0),
        Balance: Number(item.balance_amount || 0),
        Status: getStatus(item),
        PaymentMode: getPaymentMode(item) || "-",
        LatestPaymentDate: item.latest_payment_date || "",
        LatestReceiptNo: item.latest_receipt_no || "",
      })),
    });
  }

  function previewFeeEntry(event) {
    event.preventDefault();
    setEntryError("");

    if (!validateFeeEntry()) {
      return;
    }

    if (entryForm.payment_mode === "UPI" && !entryForm.utr) {
      setEntryError("Please enter the UTR / transaction ID for UPI payments.");
      return;
    }

    const payload = {
      student_name: entryForm.student_name,
      admission_id: entryForm.admission_id || undefined,
      student_id: entryForm.student_id || undefined,
      class_name: entryForm.class_name,
      parent_mobile: entryForm.parent_mobile,
      amount_paid: Number(entryForm.amount_collected),
      payment_mode: entryForm.payment_mode,
      payment_date: entryForm.date,
      utr: entryForm.utr || "",
    };
    const receiptSource =
      rows.find(
        (item) => String(item.admission_id) === String(entryForm.admission_id)
      ) || {};
    const receiptOverrides = {
      admission_id: payload.admission_id,
      student_id: payload.student_id,
      student_name: payload.student_name,
      class_name: payload.class_name,
      father_mobile: payload.parent_mobile,
      latest_receipt_no: "PREVIEW",
      latest_payment_date: payload.payment_date,
      latest_paid_amount: payload.amount_paid,
      payment_mode: payload.payment_mode,
      latest_reference_no: payload.utr,
      is_preview: true,
      draft_payment: {
        payment_date: payload.payment_date,
        amount_paid: payload.amount_paid,
      },
    };

    setPendingFeeEntry({ payload, receiptSource });
    setFeeReceiptData(buildFeeReceiptData(receiptSource, receiptOverrides));
    setFeeReceiptOpen(true);
  }

  async function persistFeeEntry({ shouldPrint = false } = {}) {
    if (!pendingFeeEntry || !feeSubmissionLockRef.current.tryLock()) {
      return;
    }

    const { payload, receiptSource } = pendingFeeEntry;
    setSavingFee(true);
    setEntryError("");

    try {
      const response = await fetch("/api/fees/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.paymentSaved) {
        throw new Error(data.error || "Unable to save fee collection");
      }

      const existingPaidAmount = Number(receiptSource.paid_amount || 0);
      const totalFee = Number(receiptSource.total_fee || 0);
      const paidAmount = Number(payload.amount_paid || 0);
      const fallbackPaymentHistory = [
        ...(Array.isArray(receiptSource.payment_history)
          ? receiptSource.payment_history
          : []),
        {
          receipt_no: data.receiptNo,
          payment_date: payload.payment_date,
          amount_paid: paidAmount,
        },
      ];
      const receiptOverrides = {
        admission_id: payload.admission_id,
        student_id: payload.student_id,
        student_name: payload.student_name,
        class_name: payload.class_name,
        father_mobile: payload.parent_mobile,
        latest_receipt_no: data.receiptNo,
        latest_payment_date: payload.payment_date,
        latest_paid_amount: paidAmount,
        payment_mode: payload.payment_mode,
        latest_reference_no: payload.utr,
        paid_amount: existingPaidAmount + paidAmount,
        balance_amount: Math.max(
          totalFee - (existingPaidAmount + paidAmount),
          0
        ),
        payment_history: fallbackPaymentHistory,
        is_preview: false,
      };

      setPendingFeeEntry(null);

      setEntries((current) => [
        {
          id: Date.now(),
          date: payload.payment_date,
          student_name: payload.student_name,
          class_name: payload.class_name,
          parent_mobile: payload.parent_mobile,
          payment_mode: payload.payment_mode,
          utr: payload.utr,
          amount_collected: paidAmount,
          receipt_no: data.receiptNo,
          status: "Paid",
        },
        ...current,
      ]);

      setEntryForm({
        admission_id: "",
        student_id: "",
        date: today,
        student_name: "",
        class_name: "",
        parent_mobile: "",
        amount_collected: "",
        payment_mode: "Cash",
        utr: "",
      });
      setStudentQuery("");

      setEntryError(
        data.whatsappSent
          ? "Fee saved and WhatsApp receipt sent."
          : data.error || "Fee saved, but WhatsApp failed."
      );

      const params = new URLSearchParams();

      if (month) {
        params.set("month", month);
      }

      let savedReceiptRow = null;
      let feesResponse = null;
      let feesData = null;

      try {
        feesResponse = await fetch(`/api/fees?${params.toString()}`);
        feesData = await feesResponse.json().catch(() => null);
      } catch {
        feesResponse = null;
      }

      if (feesResponse?.ok && feesData?.success) {
        setRows(feesData.records || []);
        setMetrics(feesData.metrics || {});
        setMonthly(feesData.monthly || []);
        setLedgerPage(1);

        savedReceiptRow = (feesData.records || []).find(
          (item) =>
            String(item.admission_id) === String(payload.admission_id)
        );
      }

      const savedReceiptData = buildFeeReceiptData(
        savedReceiptRow || receiptSource,
        receiptOverrides
      );

      if (shouldPrint) {
        setFeeReceiptData(savedReceiptData);
        setFeeReceiptOpen(true);
        setTimeout(() => {
          void printFeeReceiptOnly();
        }, 150);
      } else {
        setFeeReceiptOpen(false);
        setFeeReceiptData(null);
      }
    } catch (requestError) {
      setEntryError(requestError.message || "Unable to save fee collection");
    } finally {
      feeSubmissionLockRef.current.release();
      setSavingFee(false);
    }
  }

  async function deleteFeePayment(item) {
    const paymentId = Number(item.latest_payment_id || 0);

    setEntryError("");

    if (!paymentId) {
      setEntryError("No saved fee payment found for this admission.");
      return;
    }

    const receiptText = item.latest_receipt_no
      ? `receipt ${item.latest_receipt_no}`
      : "the latest fee payment";
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete fee payment?",
      text: `Delete ${receiptText} for ${item.student_name}? This will only remove the fee payment entry.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) {
      return;
    }

    setDeletingPaymentId(paymentId);

    try {
      const response = await fetch(`/api/fees?paymentId=${paymentId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to delete fee payment");
      }

      setEntryError("Fee payment deleted.");
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Fee payment deleted successfully.",
        timer: 1400,
        showConfirmButton: false,
      });
      setEntries((current) =>
        current.filter((entry) => entry.receipt_no !== item.latest_receipt_no)
      );
      setFeesVersion((current) => current + 1);
    } catch (requestError) {
      const message = requestError.message || "Unable to delete fee payment";
      setEntryError(message);
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: message,
      });
    } finally {
      setDeletingPaymentId(null);
    }
  }

  function validateFeeEntry() {
    if (
      !entryForm.date ||
      !entryForm.admission_id ||
      !entryForm.student_name ||
      !entryForm.class_name ||
      !entryForm.parent_mobile ||
      !entryForm.amount_collected
    ) {
      setEntryError(
        "Please select an admission record and fill date, student name, class, parent mobile number, and amount collected."
      );
      return false;
    }

    return true;
  }

  async function generatePhonePeLink() {
    setEntryError("");

    if (!validateFeeEntry()) {
      return;
    }

    setPhonePeLoading(true);
    setPhonePePayment(null);

    const timestamp = Date.now();
    const invoiceNo = `FEE-${timestamp}`;
    const description = `School Fee - ${entryForm.student_name} - ${entryForm.class_name}`;

    try {
      const response = await fetch("/api/phonepe/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoiceNo,
          invoiceNo,
          customerName: entryForm.student_name,
          mobile: entryForm.parent_mobile,
          amount: entryForm.amount_collected,
          description,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to generate PhonePe payment link");
      }

      if (!data.checkoutUrl) {
        throw new Error("PhonePe checkout URL is missing");
      }

      const generatedPayment = {
        invoiceNo,
        merchantOrderId: data.merchantOrderId,
        checkoutUrl: data.checkoutUrl,
        state: data.state,
        studentName: entryForm.student_name,
        parentMobile: entryForm.parent_mobile,
        amount: Number(entryForm.amount_collected || 0),
      };

      setPhonePePayment(generatedPayment);
      setEntries((current) => [
        {
          id: timestamp,
          ...entryForm,
          invoice_no: invoiceNo,
          merchant_order_id: data.merchantOrderId,
          checkout_url: data.checkoutUrl,
          amount_collected: Number(entryForm.amount_collected || 0),
          status: "Payment Link Generated",
        },
        ...current,
      ]);

      // Later: save the pending PhonePe order against the fee/invoice in the database.
      // Later: create a SmartBooks notification that the payment link was generated.
    } catch (requestError) {
      setEntryError(
        requestError.message || "Unable to generate PhonePe payment link"
      );
    } finally {
      setPhonePeLoading(false);
    }
  }

  async function copyPhonePeLink() {
    if (!phonePePayment?.checkoutUrl) return;

    try {
      await navigator.clipboard.writeText(phonePePayment.checkoutUrl);
      setCopyLinkLabel("Link Copied");
    } catch {
      setCopyLinkLabel("Copy Failed");
    }

    window.setTimeout(() => setCopyLinkLabel("Copy Link"), 2500);
  }

  function sharePhonePeLinkOnWhatsApp() {
    if (!phonePePayment?.checkoutUrl) return;

    const message = `Dear Parent, please pay the school fee for ${
      phonePePayment.studentName
    }.\nAmount: ${formatCurrency(phonePePayment.amount)}\nPayment Link: ${
      phonePePayment.checkoutUrl
    }`;
    const phone = normalizePhoneNumber(phonePePayment.parentMobile);

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function buildFeeReceiptData(item, overrides = {}) {
    const totalFee = Number(overrides.total_fee ?? item.total_fee ?? 0);
    const isPreview = Boolean(overrides.is_preview);
    const draftPayment = isPreview ? overrides.draft_payment : null;
    const previewTotals = buildFeePreviewTotals({
      totalFee,
      paidAmount: item.paid_amount,
      draftAmount: draftPayment?.amount_paid,
    });
    const paidAmount = Number(
      isPreview
        ? previewTotals.currentPayment
        : overrides.latest_paid_amount ??
            item.latest_paid_amount ??
            item.amount_collected ??
            0
    );
    const totalPaid = Number(
      isPreview
        ? previewTotals.totalPaid
        : overrides.paid_amount ?? item.paid_amount ?? paidAmount
    );
    const balanceAmount = Number(
      isPreview
        ? previewTotals.balanceAmount
        : overrides.balance_amount ??
            item.balance_amount ??
            Math.max(totalFee - totalPaid, 0)
    );
    const paymentDate =
      overrides.latest_payment_date ??
      overrides.payment_date ??
      item.latest_payment_date ??
      item.date ??
      today;
    const paymentCalendar = buildSchoolYearPaymentCalendar(
      overrides.payment_history ?? item.payment_history ?? [],
      {
        referenceDate: paymentDate,
        draftPayment,
      }
    );

    return {
      admission_id: overrides.admission_id ?? item.admission_id ?? "",
      student_id: overrides.student_id ?? item.student_id ?? "",
      student_name: overrides.student_name ?? item.student_name ?? "-",
      father_name: overrides.father_name ?? item.father_name ?? "-",
      father_mobile:
        overrides.father_mobile ?? item.father_mobile ?? item.parent_mobile ?? "-",
      class_name: overrides.class_name ?? getClassName(item) ?? "-",
      receipt_no:
        overrides.latest_receipt_no ??
        overrides.receipt_no ??
        item.latest_receipt_no ??
        item.receipt_no ??
        "PREVIEW",
      payment_date: paymentDate,
      payment_mode:
        overrides.payment_mode ?? item.payment_mode ?? getPaymentMode(item) ?? "-",
      reference_no:
        overrides.latest_reference_no ??
        overrides.reference_no ??
        item.latest_reference_no ??
        item.utr ??
        "",
      latest_paid_amount: paidAmount,
      total_fee: totalFee,
      paid_amount: totalPaid,
      balance_amount: balanceAmount,
      payment_calendar: paymentCalendar,
      is_preview: isPreview,
    };
  }

  function openFeeReceipt(item, overrides = {}) {
    setPendingFeeEntry(null);
    setFeeReceiptData(buildFeeReceiptData(item, overrides));
    setFeeReceiptOpen(true);
  }

  function closeFeeReceipt() {
    if (savingFee) {
      return;
    }

    setFeeReceiptOpen(false);
    setFeeReceiptData(null);
    setPendingFeeEntry(null);
  }

  async function printFeeReceiptOnly() {
    const receiptElement = document.getElementById("fee-receipt-preview-source");

    if (!receiptElement) {
      setEntryError("Please open the fee receipt before printing.");
      return;
    }

    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";

    document.body.appendChild(iframe);

    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((node) => node.outerHTML)
      .join("");

    const printDocument = iframe.contentWindow.document;

    printDocument.open();
    printDocument.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styles}
          <style>
            @page { size: A4 landscape; margin: 0; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 297mm !important;
              height: 180mm !important;
              max-height: 180mm !important;
              overflow: hidden !important;
              background: #ffffff !important;
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .only-one-print-page {
              width: 287mm !important;
              height: 172mm !important;
              max-height: 172mm !important;
              margin: 5mm auto 0 auto !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: white !important;
              page-break-after: avoid !important;
              break-after: avoid-page !important;
            }
            .print-receipt-sheet {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
              gap: 5mm !important;
              width: 100% !important;
              height: 165mm !important;
              max-height: 165mm !important;
              overflow: hidden !important;
              background: white !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .receipt-copy {
              width: 100% !important;
              height: 165mm !important;
              max-height: 165mm !important;
              overflow: hidden !important;
              border: 2px solid #000 !important;
              background: #fff !important;
              color: #000 !important;
              font-size: 8.8px !important;
              line-height: 1.05 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .receipt-logo {
              display: block !important;
              height: 22mm !important;
              width: 105mm !important;
              max-width: 105mm !important;
              margin: 0 auto !important;
              object-fit: contain !important;
            }
            .receipt-main-title {
              font-size: 12px !important;
              letter-spacing: 0.16em !important;
              line-height: 1.1 !important;
            }
            .receipt-p-1 { padding: 2px 4px !important; }
            .receipt-p-2 { padding: 3px 5px !important; }
            .receipt-row-label { width: 100% !important; }
            .receipt-calendar-cell {
              min-width: 0 !important;
              padding: 2px 1px !important;
              white-space: nowrap !important;
              overflow: hidden !important;
            }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <main class="only-one-print-page">
            ${receiptElement.innerHTML}
          </main>
        </body>
      </html>
    `);
    printDocument.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      setTimeout(() => {
        iframe.parentNode?.removeChild(iframe);
      }, 1000);
    }, 400);
  }

  return (
    <>
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Fees</h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Track total fees, collections, pending balances, and
                student-wise fee status.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Collected</p>
            <h2 className="mt-3 text-3xl font-bold text-green-700">
              {formatCurrency(metrics.totalCollected)}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Today&apos;s Collection</p>
            <h2 className="mt-3 text-3xl font-bold text-blue-700">
              {formatCurrency(metrics.todayCollection)}
            </h2>
          </div>
        </div>

        <section className="mb-6 rounded-[1.75rem] border border-amber-100 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-500">
              Discount Report
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">
              Discount and receivable overview
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">Discount Given Students</p>
              <h3 className="mt-3 text-3xl font-black text-slate-900">
                {Number(metrics.discountStudents || 0)}
              </h3>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
              <p className="text-sm font-medium text-amber-700">Total Discount</p>
              <h3 className="mt-3 text-3xl font-black text-amber-700">
                {formatCurrency(metrics.totalDiscount)}
              </h3>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-sm font-medium text-blue-700">Expected Fees</p>
              <h3 className="mt-3 text-3xl font-black text-blue-700">
                {formatCurrency(metrics.expectedFees)}
              </h3>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-700">Final Receivable</p>
              <h3 className="mt-3 text-3xl font-black text-emerald-700">
                {formatCurrency(metrics.finalReceivable)}
              </h3>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                WhatsApp
              </p>
              <h2 className="mt-2 text-xl font-black text-slate-900">
                Receipt sender
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {whatsapp.phase === "connected"
                  ? `Connected as ${
                      whatsapp.user?.name || whatsapp.user?.id || "WhatsApp"
                    }. Remaining today: ${whatsapp.limits?.remainingToday ?? "-"}.`
                  : "Connect WhatsApp to send fee receipts automatically."}
              </p>
              {whatsapp.error && (
                <p className="mt-2 text-sm font-medium text-rose-600">
                  {whatsapp.error}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {whatsapp.phase === "connecting" ? (
                <button
                  type="button"
                  onClick={stopWhatsappConnect}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startWhatsappConnect}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-500"
                >
                  <WhatsAppIcon />
                  {whatsapp.phase === "connected" ? "Connect a different phone" : "Connect WhatsApp"}
                </button>
              )}
            </div>
          </div>

          {whatsapp.phase === "connecting" && (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              {whatsapp.qrUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={whatsapp.qrUrl}
                    alt="WhatsApp connection QR code"
                    className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                  />
                  <p className="text-sm font-semibold text-slate-700">
                    Open WhatsApp on the school phone, go to Linked Devices, and scan this code.
                  </p>
                </>
              ) : (
                <>
                  <FaSyncAlt className="animate-spin text-2xl text-slate-400" />
                  <p className="text-sm font-semibold text-slate-600">
                    Waiting for a QR code...
                  </p>
                </>
              )}
            </div>
          )}
        </section>

        <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Fee Entry
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                Collect fee payment
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Record the payment date, student, class, parent mobile, amount
                collected, payment mode, and UTR in one place.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Latest entry mode</p>
              <p className="mt-1">
                Use Cash or UPI to record payment, or PhonePe to generate a link.
              </p>
            </div>
          </div>

          {entryError && (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {entryError}
            </p>
          )}

          <form
            onSubmit={previewFeeEntry}
            className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-3"
          >
            <div ref={studentSearchRef} className="relative md:col-span-2 xl:col-span-3">
              <input
                value={studentQuery}
                onChange={handleStudentQueryChange}
                onFocus={() => studentQuery.trim() && setShowSuggestions(true)}
                placeholder="Type student name to search..."
                autoComplete="off"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
              {entryForm.student_name && (
                <button
                  type="button"
                  onClick={() => {
                    setStudentQuery("");
                    setStudentSuggestions([]);
                    setShowSuggestions(false);
                    setEntryForm((c) => ({ ...c, admission_id: "", student_id: "", student_name: "", class_name: "", parent_mobile: "" }));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-lg leading-none"
                  aria-label="Clear student"
                >×</button>
              )}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                  {suggestionLoading && (
                    <p className="px-4 py-3 text-sm text-slate-400">Searching...</p>
                  )}
                  {!suggestionLoading && studentSuggestions.length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-400">No students found</p>
                  )}
                  {!suggestionLoading && studentSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectStudentSuggestion(s); }}
                      className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-900">{s.full_name}</span>
                      <span className="text-xs text-slate-500">
                        Class {formatClassName(s.class || "")} · {s.father_mobile || s.mother_mobile || "No mobile"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              name="date"
              type="date"
              value={entryForm.date}
              onChange={handleEntryChange}
              aria-label="Date"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />

            <input
              name="student_name"
              value={entryForm.student_name}
              onChange={handleEntryChange}
              placeholder="Student name"
              aria-label="Student name"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />

            <select
              name="class_name"
              value={entryForm.class_name}
              onChange={handleEntryChange}
              aria-label="Class"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="">Select class</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>

            <input
              name="parent_mobile"
              value={entryForm.parent_mobile}
              onChange={handleEntryChange}
              placeholder="Parent mobile number"
              aria-label="Parent mobile number"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />

            <input
              name="amount_collected"
              type="number"
              value={entryForm.amount_collected}
              onChange={handleEntryChange}
              placeholder="Amount collected"
              aria-label="Amount collected"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />

            <select
              name="payment_mode"
              value={entryForm.payment_mode}
              onChange={handleEntryChange}
              aria-label="Payment mode"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option>Cash</option>
              <option>UPI</option>
            </select>

            {/* Receipt upload for Cash removed */}

            {entryForm.payment_mode === "UPI" && (
              <input
                name="utr"
                value={entryForm.utr}
                onChange={handleEntryChange}
                placeholder="UTR / transaction ID"
                aria-label="UTR transaction ID"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 md:col-span-2 xl:col-span-3"
              />
            )}

            <button
              type="submit"
              disabled={savingFee}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 xl:col-span-3"
            >
              <FaPlus /> Save fee collection
            </button>
          </form>


          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {entries.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className="rounded-3xl border border-slate-200 bg-white p-4"
              >
                <p className="font-bold text-slate-900">
                  {entry.student_name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {entry.class_name} • {entry.date}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Parent: {entry.parent_mobile}
                </p>
                <p className="mt-3 text-lg font-black text-slate-900">
                  {formatCurrency(entry.amount_collected)}
                </p>
                <div className="mt-3 space-y-1 text-sm text-slate-500">
                  <p>Mode: {entry.payment_mode}</p>
                  {entry.payment_mode === "UPI" && (
                    <p>UTR: {entry.utr || "-"}</p>
                  )}
                  <p>
                    Status:{" "}
                    <span className="font-bold text-slate-700">
                      {entry.status || "Paid"}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-6 rounded-[1.75rem] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Monthly Collection
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Month-by-month fee collection overview.
              </p>
            </div>

            <p className="text-sm font-semibold text-slate-600">
              Highest month: {formatCurrency(maxMonthly)}
            </p>
          </div>

          <div className="mt-6 overflow-x-auto pb-2">
            {monthlySeries.length > 0 ? (
              <div className="flex min-w-max items-end gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6">
                {monthlySeries.map((item) => {
                  const collected = Number(item.collected || 0);
                  const height =
                    collected > 0
                      ? Math.max(24, (collected / maxMonthly) * 220)
                      : 8;

                  return (
                    <div
                      key={item.month_label}
                      className="flex w-24 flex-col items-center gap-3"
                    >
                      <div className="flex h-60 w-full items-end justify-center rounded-2xl bg-white px-3 py-4 shadow-inner">
                        <div
                          className="w-full rounded-t-2xl bg-primary transition hover:bg-primary-700"
                          style={{ height: `${height}px` }}
                          title={`${item.month_label}: ${formatCurrency(
                            collected
                          )}`}
                        />
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.month_label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(collected)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No monthly collection data available.
              </p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Student Fee Ledger
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Filter by class, status, payment mode, due students, or search
                  student / parent / mobile.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={exportLedgerToExcel}
                  aria-label="Download Excel"
                  title="Download Excel"
                  className="inline-flex h-12 w-16 items-center justify-center gap-1 rounded-2xl bg-[#217346] text-white shadow-sm transition hover:bg-[#1e6b40] focus:outline-none focus:ring-2 focus:ring-[#217346]/30"
                >
                  <FaFileExcel className="text-xl" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input
                value={ledgerSearch}
                onChange={(e) => {
                  setLedgerSearch(e.target.value);
                  setLedgerPage(1);
                }}
                placeholder="Search student, parent, mobile..."
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900 xl:col-span-2"
              />

              <select
                value={ledgerClass}
                onChange={(e) => {
                  setLedgerClass(e.target.value);
                  setLedgerPage(1);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
              >
                <option value="All">All Classes</option>
                {classOptions.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>

              <select
                value={ledgerStatus}
                onChange={(e) => {
                  setLedgerStatus(e.target.value);
                  setLedgerPage(1);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>

              <select
                value={ledgerPaymentMode}
                onChange={(e) => {
                  setLedgerPaymentMode(e.target.value);
                  setLedgerPage(1);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-900"
              >
                <option value="All">All Modes</option>
                {paymentModeOptions.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <label className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={ledgerDueOnly}
                    onChange={(e) => {
                      setLedgerDueOnly(e.target.checked);
                      setLedgerPage(1);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-red-600"
                  />
                  Due only
                </label>

                <button
                  type="button"
                  onClick={resetLedgerFilters}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead style={{ backgroundColor: "#08516d" }}>
                <tr>
                  {[
                    "Student",
                    "Class",
                    "Parent",
                    "Paid",
                    "Last Payment",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-white"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedLedgerRows.map((item) => {
                  const hasPhone = Boolean(
                    normalizePhoneNumber(item.father_mobile)
                  );

                  return (
                    <tr
                      key={`${item.admission_id || "admission"}-${
                        item.student_id || "student"
                      }`}
                      className="hover:bg-slate-50"
                    >
                      <td
                        className="cursor-pointer px-5 py-4"
                        onClick={() => item.admission_id && setSelectedLedgerAdmissionId(item.admission_id)}
                      >
                        <p className="font-semibold text-slate-900">
                          {item.student_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          Admission #{item.admission_id}
                        </p>
                      </td>

                      <td
                        className="cursor-pointer px-5 py-4 text-sm text-slate-700"
                        onClick={() => item.admission_id && setSelectedLedgerAdmissionId(item.admission_id)}
                      >
                        {getClassName(item) || "-"}
                      </td>

                      <td
                        className="cursor-pointer px-5 py-4"
                        onClick={() => item.admission_id && setSelectedLedgerAdmissionId(item.admission_id)}
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {item.father_name || "-"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {item.father_mobile || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-green-700">
                        {formatCurrency(item.paid_amount)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {item.latest_payment_date
                          ? new Date(item.latest_payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "-"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={getStatus(item)} />
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openWhatsApp(item)}
                            disabled={!hasPhone}
                            className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <WhatsAppIcon />
                            WhatsApp
                          </button>
                          {item.latest_payment_id ? (
                            <button
                              type="button"
                              onClick={() => openFeeReceipt(item)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-100"
                            >
                              <FaReceipt />
                              Receipt
                            </button>
                          ) : null}
                          {item.latest_payment_id ? (
                            <button
                              type="button"
                              onClick={() => deleteFeePayment(item)}
                              disabled={
                                deletingPaymentId ===
                                Number(item.latest_payment_id)
                              }
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FaTrash />
                              {deletingPaymentId === Number(item.latest_payment_id)
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <LedgerPagination
            currentPage={activeLedgerPage}
            totalPages={ledgerTotalPages}
            totalItems={filteredLedgerRows.length}
            pageSize={ledgerPageSize}
            label="fee records"
            onPageChange={setLedgerPage}
          />

          {loading && (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading fees...
            </div>
          )}

          {!loading && filteredLedgerRows.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              No fee records found for the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>

    {feeReceiptOpen && feeReceiptData ? (
      <FeeReceiptPreviewModal
        data={feeReceiptData}
        error={entryError}
        saving={savingFee}
        onClose={closeFeeReceipt}
        onSave={() => persistFeeEntry({ shouldPrint: false })}
        onSaveAndPrint={() => persistFeeEntry({ shouldPrint: true })}
        onPrint={printFeeReceiptOnly}
      />
    ) : null}

    {selectedLedgerAdmissionId ? (
      <AdmissionModal
        admissionId={selectedLedgerAdmissionId}
        onClose={() => setSelectedLedgerAdmissionId(null)}
      />
    ) : null}
    </>
  );
}

function LedgerPagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  label = "records",
  onPageChange,
}) {
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  const safeCurrentPage = Math.min(
    Math.max(Number(currentPage || 1), 1),
    safeTotalPages
  );

  const safeTotalItems = Number(totalItems || 0);
  const safePageSize = Number(pageSize || 10);

  const startItem =
    safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safePageSize + 1;

  const endItem = Math.min(safeCurrentPage * safePageSize, safeTotalItems);

  const canGoPrevious = safeCurrentPage > 1;
  const canGoNext = safeCurrentPage < safeTotalPages;

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-500 md:text-base">
        Showing {startItem}-{endItem} of {safeTotalItems} {label}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!canGoPrevious}
          onClick={() => onPageChange?.(safeCurrentPage - 1)}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
        >
          Previous
        </button>

        <div className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">
          Page {safeCurrentPage} of {safeTotalPages}
        </div>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange?.(safeCurrentPage + 1)}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function FeeReceiptPreviewModal({
  data,
  error,
  saving,
  onClose,
  onSave,
  onSaveAndPrint,
  onPrint,
}) {
  const isPreview = Boolean(data?.is_preview);

  return (
    <div className="receipt-modal-shell fixed inset-0 z-50 overflow-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="receipt-modal-card mx-auto max-w-7xl rounded-2xl bg-white shadow-2xl">
        <div className="no-print flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Fee Receipt
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isPreview
                ? "Review the receipt. Nothing is saved until you choose Save or Save & Print."
                : "Check the paid fee entry and print the parent copy."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>

            {isPreview ? (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>

                <button
                  type="button"
                  onClick={onSaveAndPrint}
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save & Print"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onPrint}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Print
              </button>
            )}
          </div>
        </div>

        {error ? (
          <p className="no-print mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {error}
          </p>
        ) : null}

        <div id="fee-receipt-preview-source" className="receipt-print-area bg-white p-4">
          <FeeReceiptSheet data={data} />
        </div>
      </div>
    </div>
  );
}

function FeeReceiptSheet({ data }) {
  return (
    <div className="print-receipt-sheet grid gap-6 md:grid-cols-2">
      <FeeReceiptCopy data={data} copyLabel="School Copy" />
      <FeeReceiptCopy data={data} copyLabel="Parent Copy" />
    </div>
  );
}

function FeeReceiptCopy({ data, copyLabel }) {
  const paidAmount = Number(data?.latest_paid_amount || 0);
  const totalPaid = Number(data?.paid_amount || 0);
  const balanceAmount = Number(data?.balance_amount || 0);
  const paymentCalendar = Array.isArray(data?.payment_calendar)
    ? data.payment_calendar
    : [];
  const registrationNo = data?.admission_id
    ? `LP-${String(data.admission_id).padStart(5, "0")}`
    : "-";

  return (
    <div className="receipt-copy border-2 border-black bg-white text-[11px] leading-tight text-black">
      <div className="receipt-p-2 border-b-2 border-black text-center">
        <img
          src="/logo.jpg"
          alt="School Logo"
          className="receipt-logo h-28 w-[420px] object-contain"
        />

        <div className="mt-2 border-y-2 border-black py-1">
          <h2 className="receipt-main-title text-xl font-black tracking-[0.15em]">
            FEE PAYMENT RECEIPT
          </h2>
        </div>

        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em]">
          {copyLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 border-b border-black">
        <div className="receipt-p-1 border-r border-black">
          <span className="font-black">Receipt No.</span>
          <span className="ml-2 font-bold">{data?.receipt_no || "-"}</span>
        </div>

        <div className="receipt-p-1">
          <span className="font-black">Date :</span>
          <span className="ml-2 font-bold">
            {formatReceiptDate(data?.payment_date)}
          </span>
        </div>
      </div>

      <FeeReceiptRow label="Regn No." value={registrationNo} />
      <FeeReceiptRow label="Student Name" value={data?.student_name || "-"} />
      <FeeReceiptRow label="Father's Name" value={data?.father_name || "-"} />
      <FeeReceiptRow label="Father Mobile" value={data?.father_mobile || "-"} />

      <div className="border-b border-black">
        <div className="receipt-p-1">
          <span className="font-black">Class / Standard</span>
          <span className="ml-2 font-bold">{data?.class_name || "-"}</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_95px] border-b border-black">
        <div className="receipt-p-1 border-r border-black text-center font-black">
          Fee Payment Details
        </div>

        <div className="receipt-p-1 text-center font-black">Amount</div>
      </div>

      <div className="grid grid-cols-[1fr_95px] border-b border-black">
        <div className="receipt-p-2 border-r border-black">
          <p className="font-black">School Fee Payment</p>
          <p className="mt-1 text-[10px]">
            Payment Mode: {data?.payment_mode || "-"}
          </p>
          {data?.reference_no ? (
            <p className="mt-1 text-[10px]">
              Reference / UTR: {data.reference_no}
            </p>
          ) : null}
        </div>

        <div className="receipt-p-2 flex items-center justify-end font-black">
          {formatAmountPlain(paidAmount)}
        </div>
      </div>

      <FeePaymentCalendar cells={paymentCalendar} />

      <div className="grid grid-cols-[1fr_95px] border-b border-black bg-gray-200">
        <div className="receipt-p-1 border-r border-black font-black">
          Current Payment Paid
        </div>

        <div className="receipt-p-1 text-right font-black">
          {formatAmountPlain(paidAmount)}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_95px] border-b border-black">
        <div className="receipt-p-2 border-r border-black">
          <div className="space-y-1 pl-8 font-black">
            <p>Total Paid</p>
          </div>
        </div>

        <div className="receipt-p-2 text-right font-black">
          <div className="space-y-1">
            <p>{formatAmountPlain(totalPaid)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_95px] border-b border-black">
        <div className="receipt-p-2 border-r border-black">
          <div className="pl-8 font-black">Pending Balance</div>
        </div>

        <div className="receipt-p-2 text-right font-black">
          {formatAmountPlain(balanceAmount)}
        </div>
      </div>

      <div className="receipt-p-1 border-b border-black font-black">
        Rupees {numberToWords(paidAmount)} Only
      </div>

      <div className="receipt-p-1 border-b border-black">
        <p className="font-black">Fee Note:</p>
        <p className="mt-1 text-[10px] font-semibold">
          This receipt confirms the fee payment recorded for the above student.
        </p>
      </div>

      <div className="grid grid-cols-2 text-[10px]">
        <div className="receipt-p-1">
          <p className="font-black">Note:</p>
          <p>Fee once paid will be recorded in school accounts.</p>
        </div>

        <div className="receipt-p-1 text-right">
          <div className="mt-5 border-t border-black pt-1 font-black">
            Authorized Signature
          </div>
        </div>
      </div>
    </div>
  );
}

function FeePaymentCalendar({ cells }) {
  if (!Array.isArray(cells) || cells.length !== 12) {
    return null;
  }

  return (
    <div className="border-b border-black">
      <div className="receipt-p-1 text-center text-[9px] font-black uppercase tracking-wide">
        School Fee Payment Calendar
      </div>

      <div className="grid grid-cols-12 border-t border-black text-center text-[8px] leading-none">
        {cells.map((cell) => (
          <div
            key={`label-${cell.monthKey}`}
            className="receipt-calendar-cell border-r border-black px-0.5 py-1 font-black last:border-r-0"
          >
            {cell.monthLabel}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 border-t border-black text-center text-[8px] leading-none">
        {cells.map((cell) => (
          <div
            key={`amount-${cell.monthKey}`}
            className="receipt-calendar-cell border-r border-black px-0.5 py-1 font-bold last:border-r-0"
          >
            {Number(cell.amount || 0) > 0
              ? formatAmountPlain(cell.amount)
              : "-"}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeeReceiptRow({ label, value }) {
  return (
    <div className="grid grid-cols-[110px_1fr] border-b border-black">
      <div className="receipt-row-label receipt-p-1 border-r border-black font-black">
        {label}
      </div>
      <div className="receipt-p-1 font-bold">{value}</div>
    </div>
  );
}
