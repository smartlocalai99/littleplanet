"use client";

import { useEffect, useState } from "react";

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export default function AdmissionModal({ admissionId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [admission, setAdmission] = useState(null);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState("details");

  useEffect(() => {
    if (!admissionId) return;

    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/admission/${admissionId}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Unable to load admission details");
        if (!active) return;
        setAdmission(data.admission || null);
        setPayments(data.payments || []);
      } catch (err) {
        if (active) setError(err.message || "Unable to load admission details");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => (active = false);
  }, [admissionId]);

  if (!admissionId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>

      <div className="relative max-w-4xl w-full rounded-2xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold">Admission details</h3>
          <div className="flex items-center gap-3">
            <button className="rounded-lg px-3 py-1 text-sm" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4 flex gap-2 text-sm">
            <button className={`px-3 py-2 rounded-full ${tab === "details" ? "bg-slate-100" : "bg-transparent"}`} onClick={() => setTab("details")}>Details</button>
            <button className={`px-3 py-2 rounded-full ${tab === "payments" ? "bg-slate-100" : "bg-transparent"}`} onClick={() => setTab("payments")}>Transactions</button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading...</div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-700">{error}</div>
          ) : (
            <div>
              {tab === "details" && admission && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Student name</p>
                    <p className="font-semibold text-slate-900">{admission.student_name || "-"}</p>

                    <p className="mt-3 text-xs text-slate-500">Class</p>
                    <p className="font-medium">{admission.class_applying_for || admission.class || "-"}</p>

                    <p className="mt-3 text-xs text-slate-500">DOB</p>
                    <p className="font-medium">{admission.date_of_birth ? formatDate(admission.date_of_birth) : "-"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Father / Guardian</p>
                    <p className="font-semibold text-slate-900">{admission.father_name || admission.guardian_name || "-"}</p>
                                        <p className=" mt-1  text-xs text-slate-500">Mobile</p>

                    <p className="font-semibold text-slate-900">{admission.father_mobile || admission.emergency_contact || "-"}</p>

                    <p className="mt-3 text-xs text-slate-500">Total School Fees</p>
                    <p className="font-medium text-slate-800">{formatCurrency(admission.fees)}</p>

                    <p className="mt-3 text-xs text-slate-500">Discount Amount</p>
                    <p className="font-medium text-amber-700">{Number(admission.discount) > 0 ? formatCurrency(admission.discount) : "—"}</p>

                    <p className="mt-3 text-xs text-slate-500">Net School Fee</p>
                    <p className="font-medium text-emerald-700">{formatCurrency(admission.final_fee)}</p>

                    {admission.utr && (
                      <>
                        <p className="mt-3 text-xs text-slate-500">UTR Number</p>
                        <p className="font-medium text-slate-800">{admission.utr}</p>
                      </>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="text-sm text-slate-700">{[admission.door_no, admission.street, admission.city, admission.village, admission.pin_code].filter(Boolean).join(", ") || admission.address || "-"}</p>
                  </div>
                </div>
              )}

              {tab === "payments" && (
                <div className="mt-4">
                  {payments.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">No transactions found for this admission.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-500">
                            <th className="py-2">Date</th>
                            <th className="py-2">Receipt</th>
                            <th className="py-2">Amount</th>
                            <th className="py-2">Mode</th>
                            <th className="py-2">Collected by</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.id} className="border-t">
                              <td className="py-3 text-slate-700">{p.payment_date ? formatDate(p.payment_date) : p.payment_date}</td>
                              <td className="py-3 text-slate-700">{p.receipt_no || p.receipt_no}</td>
                              <td className="py-3 text-slate-800 font-semibold">{formatCurrency(p.amount_paid || p.paid_amount)}</td>
                              <td className="py-3 text-slate-700">{p.payment_mode || p.payment_mode}</td>
                              <td className="py-3 text-slate-700">{p.collected_by || p.collected_by}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
