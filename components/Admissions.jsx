"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import AdmissionModal from "./AdmissionModal";

const BADGE_STYLES = {
  NEW: "bg-amber-50 text-amber-700 ring-amber-200",
  PENDING: "bg-sky-50 text-sky-700 ring-sky-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ADMITTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

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

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getStatusStyle(status) {
  const normalized = String(status || "NEW").toUpperCase();
  return BADGE_STYLES[normalized] || "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function Admissions() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(null);
  const [editingAdmission, setEditingAdmission] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadAdmissions() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admission");
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load admissions");
        }

        if (active) {
          setAdmissions(data.admissions || []);
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError.message || "Unable to load admissions");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAdmissions();

    return () => {
      active = false;
    };
  }, []);

  const filteredAdmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return admissions;
    }

    return admissions.filter((admission) => {
      return [
        admission.student_name,
        admission.class_applying_for,
        admission.father_name,
        admission.mother_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [admissions, search]);

  const summary = useMemo(() => {
    return admissions.reduce(
      (accumulator, admission) => {
        const status = String(admission.admission_status || "NEW").toUpperCase();

        accumulator.total += 1;
        if (status === "NEW") accumulator.newCount += 1;
        if (status === "APPROVED" || status === "ADMITTED") accumulator.qualified += 1;
        if (status === "REJECTED") accumulator.rejected += 1;

        return accumulator;
      },
      { total: 0, newCount: 0, qualified: 0, rejected: 0 }
    );
  }, [admissions]);

  async function deleteAdmission(event, admission) {
    event.stopPropagation();

    const admissionName = admission.student_name || `Admission #${admission.id}`;
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete admission?",
      text: `Delete ${admissionName}? This will also delete the linked student and parent records.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingId(admission.id);
      setError("");

      const response = await fetch(`/api/admission?id=${admission.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to delete admission");
      }

      setAdmissions((currentAdmissions) => currentAdmissions.filter((item) => item.id !== admission.id));
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Admission deleted successfully.",
        timer: 1400,
        showConfirmButton: false,
      });

      if (selectedAdmissionId === admission.id) {
        setSelectedAdmissionId(null);
      }
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete admission");
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: deleteError.message || "Unable to delete admission",
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function saveAdmission(form) {
    setSavingId(form.id);
    setError("");

    try {
      const response = await fetch(`/api/admission?id=${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to update admission");
      }

      setAdmissions((currentAdmissions) =>
        currentAdmissions.map((item) =>
          item.id === data.admission.id ? data.admission : item
        )
      );
      setEditingAdmission(null);
    } catch (saveError) {
      setError(saveError.message || "Unable to update admission");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div >
      <AdmissionModal admissionId={selectedAdmissionId} onClose={() => setSelectedAdmissionId(null)} />
      {editingAdmission && (
        <AdmissionEditModal
          admission={editingAdmission}
          saving={savingId === editingAdmission.id}
          onClose={() => setEditingAdmission(null)}
          onSave={saveAdmission}
        />
      )}
      <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-6 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Admissions</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">Admissions records</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                Live data pulled from the admissions table so admin and super-admin users can review submitted applications.
              </p>
            </div>

            <label className="w-full max-w-md">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by student, class, parent, or status"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total applications", summary.total],
              ["New applications", summary.newCount],
              ["Approved / admitted", summary.qualified],
              ["Rejected", summary.rejected],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-6 md:px-8">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Loading admissions from the database...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No admissions found for the current search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] bg-primary text-white">
                    <th className="border-b border-slate-200 px-4 py-3">Student</th>
                    <th className="border-b border-slate-200 px-4 py-3">Class</th>
                    <th className="border-b border-slate-200 px-4 py-3">Parent</th>
                    <th className="border-b border-slate-200 px-4 py-3">Status</th>
                    <th className="border-b border-slate-200 px-4 py-3">Actions</th>                  </tr>
                </thead>
                <tbody>
                  {filteredAdmissions.map((admission) => (
                    <tr key={admission.id} onClick={() => setSelectedAdmissionId(admission.id)} className="align-top hover:bg-slate-50/80 cursor-pointer">
                      <td className="border-b border-slate-100 px-4 py-4">
                        <div className="font-semibold text-slate-900">{admission.student_name || "Unnamed applicant"}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {admission.gender || "-"} {admission.date_of_birth ? `• ${formatDate(admission.date_of_birth)}` : ""}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                        {admission.class_applying_for || "-"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">{admission.father_name || admission.guardian_name || "-"}</div>
                        <div className="mt-1 text-slate-500">{admission.father_mobile || admission.emergency_contact || "-"}</div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${getStatusStyle(admission.admission_status)}`}>
                          {admission.admission_status || "NEW"}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-4">
  <div className="flex flex-wrap gap-2">
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setEditingAdmission(admission);
      }}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
    >
      Edit
    </button>
    <button
      type="button"
      onClick={(event) => deleteAdmission(event, admission)}
      disabled={deletingId === admission.id}
      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deletingId === admission.id ? "Deleting..." : "Delete"}
    </button>
  </div>
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function AdmissionEditModal({ admission, saving, onClose, onSave }) {
  const [form, setForm] = useState({
    id: admission.id,
    student_name: admission.student_name || "",
    gender: admission.gender || "",
    date_of_birth: toDateInput(admission.date_of_birth),
    age: admission.age || "",
    blood_group: admission.blood_group || "",
    nationality: admission.nationality || "",
    religion: admission.religion || "",
    class_applying_for: admission.class_applying_for || "",
    medium: admission.medium || "",
    father_name: admission.father_name || "",
    father_mobile: admission.father_mobile || "",
    mother_name: admission.mother_name || "",
    mother_mobile: admission.mother_mobile || "",
    guardian_name: admission.guardian_name || "",
    emergency_contact: admission.emergency_contact || "",
    admission_status: admission.admission_status || "NEW",
    admission_fee_mode: admission.admission_fee_mode || "",
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Edit admission</h2>
            <p className="mt-1 text-sm text-slate-500">Admission #{admission.id}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["student_name", "Student name", "text"],
            ["gender", "Gender", "text"],
            ["date_of_birth", "Date of birth", "date"],
            ["age", "Age", "number"],
            ["class_applying_for", "Class", "text"],
            ["blood_group", "Blood group", "text"],
            ["nationality", "Nationality", "text"],
            ["religion", "Religion", "text"],
            ["medium", "Medium", "text"],
            ["father_name", "Father name", "text"],
            ["father_mobile", "Father mobile", "text"],
            ["mother_name", "Mother name", "text"],
            ["mother_mobile", "Mother mobile", "text"],
            ["guardian_name", "Guardian name", "text"],
            ["emergency_contact", "Emergency contact", "text"],
          ].map(([name, label, type]) => (
            <label key={name} className="text-sm font-semibold text-slate-700">
              {label}
              <input
                name={name}
                type={type}
                value={form[name]}
                onChange={updateField}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </label>
          ))}

          <label className="text-sm font-semibold text-slate-700">
            Status
            <select
              name="admission_status"
              value={form.admission_status}
              onChange={updateField}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="NEW">NEW</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ADMITTED">ADMITTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Admission fee mode
            <select
              name="admission_fee_mode"
              value={form.admission_fee_mode}
              onChange={updateField}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="">Select mode</option>
              <option value="Cash">Cash</option>
              <option value="PhonePe">PhonePe</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
            Cancel
          </button>
          <button disabled={saving} className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
