import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/payroll" });

const emptyForm = {
  staff_id: "",
  payroll_month: new Date().toLocaleString("en-US", {
    month: "short",
  }).toUpperCase(),
  payroll_year: new Date().getFullYear(),
  working_days: 26,
  leave_days: 0,
  lop_days: 0,
  carry_forward_leaves: 0,
  basic_salary: 0,
  increment_amount: 0,
  bonus_amount: 0,
  deduction_amount: 0,
  payment_status: "PENDING",
  payment_date: "",
  payment_mode: "Bank Transfer",
  reference_no: "",
  remarks: "",
  created_by: "Admin",
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function money(v) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

function StatusBadge({ status }) {
  const styles = {
    PAID: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    PARTIAL: "bg-blue-100 text-blue-700",
    HOLD: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

function PayrollModal({ open, form, setForm, staff, onClose, onSubmit, submitting }) {
  if (!open) return null;

  const netSalary =
    Number(form.basic_salary || 0) +
    Number(form.increment_amount || 0) +
    Number(form.bonus_amount || 0) -
    Number(form.deduction_amount || 0);

  function input(name, label, type = "text") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{label}</label>
        <input
          type={type}
          value={form[name] || ""}
          onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5">
          <h2 className="text-xl font-bold text-slate-900">Add / Edit Payroll</h2>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold">
            Close
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-3 font-bold text-slate-900">Staff & Month</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Staff</label>
                <select
                  value={form.staff_id}
                  onChange={(e) => {
                    const selected = staff.find((s) => String(s.id) === e.target.value);
                    setForm((p) => ({
                      ...p,
                      staff_id: e.target.value,
                      basic_salary: selected?.monthly_salary || 0,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                >
                  <option value="">Select Staff</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} - {s.designation || s.staff_type}
                    </option>
                  ))}
                </select>
              </div>

            <div>
  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
    Month
  </label>

  <select
    value={form.payroll_month}
    onChange={(e) =>
      setForm((p) => ({
        ...p,
        payroll_month: e.target.value,
      }))
    }
    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
  >
    {[
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ].map((m) => (
      <option key={m} value={m}>
        {m}
      </option>
    ))}
  </select>
</div>

{input("payroll_year", "Year", "number")}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Leaves</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {input("working_days", "Working Days", "number")}
              {input("leave_days", "Leave Days", "number")}
              {input("lop_days", "LOP Days", "number")}
              {input("carry_forward_leaves", "Carry Forward Leaves", "number")}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Salary</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {input("basic_salary", "Basic Salary", "number")}
              {input("increment_amount", "Increment", "number")}
              {input("bonus_amount", "Bonus", "number")}
              {input("deduction_amount", "Deduction", "number")}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Net Salary</p>
              <h3 className="mt-1 text-3xl font-black text-green-700">{money(netSalary)}</h3>
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Payment</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Status</label>
                <select
                  value={form.payment_status}
                  onChange={(e) => setForm((p) => ({ ...p, payment_status: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                >
                  <option>PENDING</option>
                  <option>PAID</option>
                  <option>PARTIAL</option>
                  <option>HOLD</option>
                </select>
              </div>

              {input("payment_date", "Payment Date", "date")}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Payment Mode</label>
                <select
                  value={form.payment_mode}
                  onChange={(e) => setForm((p) => ({ ...p, payment_mode: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Cheque</option>
                </select>
              </div>

              {input("reference_no", "Reference No")}
              {input("created_by", "Created By")}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Remarks</label>
              <textarea
                value={form.remarks || ""}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white p-5">
          <button onClick={onClose} className="rounded-xl border px-5 py-2 text-sm font-bold">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(netSalary)}
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Payroll"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollPage() {
  const [payroll, setPayroll] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [filterMonthYear, setFilterMonthYear] = useState(`${emptyForm.payroll_month} ${emptyForm.payroll_year}`);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/payroll");
    const data = await res.json();

    if (data.success) {
      setPayroll(data.payroll || []);
      setStaff(data.staff || []);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function openAdd() {
    const [month, year] = filterMonthYear.split(" ");
    setSelectedId(null);
    setForm({
      ...emptyForm,
      payroll_month: month || emptyForm.payroll_month,
      payroll_year: Number(year || emptyForm.payroll_year),
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setSelectedId(row.id);
    setForm({
      staff_id: row.staff_id,
      payroll_month: row.payroll_month,
      payroll_year: row.payroll_year,
      working_days: row.working_days,
      leave_days: row.leave_days,
      lop_days: row.lop_days,
      carry_forward_leaves: row.carry_forward_leaves,
      basic_salary: row.basic_salary,
      increment_amount: row.increment_amount,
      bonus_amount: row.bonus_amount,
      deduction_amount: row.deduction_amount,
      payment_status: row.payment_status,
      payment_date: row.payment_date ? String(row.payment_date).split("T")[0] : "",
      payment_mode: row.payment_mode || "Bank Transfer",
      reference_no: row.reference_no || "",
      remarks: row.remarks || "",
      created_by: row.created_by || "Admin",
    });
    setModalOpen(true);
  }

  async function savePayroll(netSalary) {
    try {
      if (!form.staff_id) {
        setMessage("Please select staff");
        return;
      }

      setSubmitting(true);

      const method = selectedId ? "PUT" : "POST";
      const url = selectedId ? `/api/payroll?id=${selectedId}` : "/api/payroll";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, net_salary: netSalary }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save payroll");

      setMessage("Payroll saved successfully");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function markPaid(row) {
    const result = await Swal.fire({
      icon: "question",
      title: "Mark salary paid?",
      text: `Mark salary paid for ${row.full_name}?`,
      showCancelButton: true,
      confirmButtonText: "Mark paid",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/payroll?id=${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_status: "PAID",
          payment_date: new Date().toISOString().slice(0, 10),
          payment_mode: row.payment_mode || "Bank Transfer",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Unable to mark salary paid");

      await Swal.fire({
        icon: "success",
        title: "Marked paid",
        text: "Salary marked as paid.",
        timer: 1400,
        showConfirmButton: false,
      });
      fetchData();
    } catch (error) {
      setMessage(error.message);
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: error.message || "Unable to mark salary paid",
      });
    }
  }

  const filteredPayroll = useMemo(() => {
    const [month, year] = filterMonthYear.split(" ");

    return payroll.filter((row) => (
      String(row.payroll_month || "").toUpperCase() === month &&
      String(row.payroll_year || "") === year
    ));
  }, [payroll, filterMonthYear]);

  const visibleMetrics = useMemo(() => filteredPayroll.reduce(
    (totals, row) => {
      const netSalary = Number(row.net_salary || 0);
      const deductionAmount = Number(row.deduction_amount || 0);

      totals.totalPayroll += netSalary;
      totals.totalDeductions += deductionAmount;

      if (row.payment_status === "PAID") {
        totals.paidPayroll += netSalary;
      } else {
        totals.pendingPayroll += netSalary;
      }

      return totals;
    },
    {
      totalPayroll: 0,
      paidPayroll: 0,
      pendingPayroll: 0,
      totalDeductions: 0,
    }
  ), [filteredPayroll]);

  function downloadPayroll() {
    if (filteredPayroll.length === 0) {
      setMessage("No payroll records available to download for the selected month");
      return;
    }

    const rows = filteredPayroll.map((row) => ({
      "Staff Name": row.full_name || "",
      Designation: row.designation || row.staff_type || "",
      Month: `${row.payroll_month} ${row.payroll_year}`,
      "Working Days": Number(row.working_days || 0),
      "Leave Days": Number(row.leave_days || 0),
      "LOP Days": Number(row.lop_days || 0),
      "Basic Salary": Number(row.basic_salary || 0),
      Increment: Number(row.increment_amount || 0),
      Bonus: Number(row.bonus_amount || 0),
      Deductions: Number(row.deduction_amount || 0),
      "Net Salary": Number(row.net_salary || 0),
      Status: row.payment_status || "",
      "Payment Mode": row.payment_mode || "",
      "Payment Date": row.payment_date ? String(row.payment_date).split("T")[0] : "",
      Remarks: row.remarks || "",
    }));

    rows.push({
      "Staff Name": "TOTAL",
      "Basic Salary": filteredPayroll.reduce((total, row) => total + Number(row.basic_salary || 0), 0),
      Deductions: visibleMetrics.totalDeductions,
      "Net Salary": visibleMetrics.totalPayroll,
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 24 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 36 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
    XLSX.writeFile(workbook, `payroll-${filterMonthYear.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
       

        {message && <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-bold shadow-sm">{message}</div>}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Payout</p>
            <h2 className="mt-3 text-3xl font-black">{money(visibleMetrics.totalPayroll)}</h2>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Paid</p>
            <h2 className="mt-3 text-3xl font-black text-green-700">{money(visibleMetrics.paidPayroll)}</h2>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending</p>
            <h2 className="mt-3 text-3xl font-black text-red-700">{money(visibleMetrics.pendingPayroll)}</h2>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Deductions</p>
            <h2 className="mt-3 text-3xl font-black text-orange-600">{money(visibleMetrics.totalDeductions)}</h2>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-slate-900">Payroll Register</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm font-semibold text-slate-600">Month:</label>
              <select
                value={filterMonthYear}
                onChange={(e) => {
                  const [month, year] = e.target.value.split(" ");
                  setFilterMonthYear(e.target.value);
                  setForm((p) => ({ ...p, payroll_month: month, payroll_year: Number(year) }));
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold outline-none focus:border-slate-900 min-w-[150px]"
              >
                {[2024, 2025, 2026].flatMap((year) =>
                  MONTHS.map((month) => (
                    <option key={`${month}-${year}`} value={`${month} ${year}`}>
                      {month} {year}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={downloadPayroll}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Download
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                Add Payroll
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-primary">
                <tr>
                  {["Staff", "Month", "Salary", "Leaves", "Deductions", "Net Salary", "Status", "Mode", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPayroll.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{row.full_name}</p>
                      <p className="text-sm text-slate-500">{row.designation || row.staff_type}</p>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {row.payroll_month} {row.payroll_year}
                    </td>
                    <td className="px-5 py-4 text-sm">{money(row.basic_salary)}</td>
                    <td className="px-5 py-4 text-sm">
                      Leave: {row.leave_days || 0}, LOP: {row.lop_days || 0}
                    </td>
                    <td className="px-5 py-4 text-sm text-red-600 font-bold">{money(row.deduction_amount)}</td>
                    <td className="px-5 py-4 text-sm font-black text-slate-900">{money(row.net_salary)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.payment_status} />
                    </td>
                    <td className="px-5 py-4 text-sm">{row.payment_mode || "-"}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(row)} className="rounded-xl border px-3 py-2 text-xs font-bold">
                          Edit
                        </button>
                        {row.payment_status !== "PAID" && (
                          <button
                            onClick={() => markPaid(row)}
                            className="rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPayroll.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">
                No payroll records found.
              </div>
            )}
          </div>
        </div>
      </div>

      <PayrollModal
        open={modalOpen}
        form={form}
        setForm={setForm}
        staff={staff}
        onClose={() => setModalOpen(false)}
        onSubmit={savePayroll}
        submitting={submitting}
      />
    </div>
  );
}
