import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Swal from "sweetalert2";
import { withAuthPage } from "@/lib/withAuthPage";
export const getServerSideProps = withAuthPage({ path: "/staff" });

const emptyForm = {
  staff_code: "",
  full_name: "",
  gender: "",
  mobile: "",
  email: "",
  staff_type: "Teaching",
  designation: "",
  department: "",
  subject: "",
  classes_handling: "",
  qualification: "",
  experience_years: "",
  joining_date: "",
  employment_type: "Permanent",
  salary_type: "Monthly",
  monthly_salary: "",
  work_status: "Active",
  address: "",
  bank_account_name: "",
  bank_name: "",
  bank_branch: "",
  bank_account_number: "",
  ifsc_code: "",
  upi_id: "",
  emergency_contact_name: "",
  emergency_contact_mobile: "",
  notes: "",
};

async function readApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return {
    success: false,
    error: response.ok ? fallbackMessage : `${fallbackMessage}. Please refresh and try again.`,
  };
}

function StatusBadge({ status }) {
  const styles = {
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-slate-100 text-slate-700",
    Left: "bg-red-100 text-red-700",
    Suspended: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status || "-"}
    </span>
  );
}

function StaffTypeBadge({ type }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${type === "Teaching" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
      {type || "-"}
    </span>
  );
}

function normalizeStaffDocuments(form) {
  const documentSources = [
    form.documents,
    form.staff_documents,
    form.uploaded_documents,
  ];

  const documents = documentSources.flatMap((source) => {
    if (!source) return [];
    if (Array.isArray(source)) return source;

    if (typeof source === "string") {
      try {
        const parsed = JSON.parse(source);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  });

  return documents
    .map((document) => {
      if (!document) return null;
      if (typeof document === "string") {
        return { name: document.split("/").pop() || "Document", url: document };
      }

      const url = document.url || document.file_url || document.fileUrl || document.path;
      if (!url) return null;

      return {
        name: document.name || document.file_name || document.fileName || url.split("/").pop() || "Document",
        type: document.type || document.category || "Document",
        uploadedAt: document.uploaded_at || document.uploadedAt || document.created_at,
        url,
      };
    })
    .filter(Boolean);
}

function StaffModal({ open, mode, form, setForm, onClose, onSubmit, submitting }) {
  if (!open) return null;

  const isView = mode === "view";
  const title = mode === "add" ? "Add Staff" : mode === "edit" ? "Edit Staff" : "Staff Details";
  const staffDocuments = normalizeStaffDocuments(form);

  function input(name, label, type = "text") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{label}</label>
        <input
          type={type}
          value={form[name] || ""}
          disabled={isView}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
        />
      </div>
    );
  }

  function select(name, label, options) {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{label}</label>
        <select
          value={form[name] || ""}
          disabled={isView}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
        >
          {options.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">Close</button>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-3 font-bold text-slate-900">Basic Details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {input("staff_code", "Staff Code")}
              {input("full_name", "Full Name")}
              {select("gender", "Gender", ["", "Male", "Female", "Other"])}
              {input("mobile", "Mobile")}
              {input("email", "Email", "email")}
              {input("address", "Address")}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Employment Details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {select("staff_type", "Staff Type", ["Teaching", "Non-Teaching", "Admin", "Support"])}
              {input("designation", "Designation")}
              {input("department", "Department")}
              {input("subject", "Subject")}
              {input("classes_handling", "Classes Handling")}
              {input("qualification", "Qualification")}
              {input("experience_years", "Experience")}
              {input("joining_date", "Joining Date", "date")}
              {select("employment_type", "Employment Type", ["Permanent", "Contract", "Part-time", "Temporary"])}
              {select("salary_type", "Salary Type", ["Monthly", "Daily", "Hourly"])}
              {input("monthly_salary", "Monthly Salary", "number")}
              {select("work_status", "Work Status", ["Active", "Inactive", "Left", "Suspended"])}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Bank Details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {input("bank_account_name", "Account Name")}
              {input("bank_name", "Bank Name")}
              {input("bank_branch", "Bank Branch")}
              {input("bank_account_number", "Account Number")}
              {input("ifsc_code", "IFSC Code")}
              {input("upi_id", "UPI ID")}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Emergency & Notes</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {input("emergency_contact_name", "Emergency Contact Name")}
              {input("emergency_contact_mobile", "Emergency Contact Mobile")}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Notes</label>
              <textarea
                value={form.notes || ""}
                disabled={isView}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
              />
            </div>
          </section>

          {isView && staffDocuments.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Staff Documents
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Uploaded onboarding and verification documents.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {staffDocuments.map((document) => (
                  <div key={`${document.url}-${document.name}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {document.name}
                        </p>

                        {document.uploadedAt && (
                          <p className="mt-1 text-xs text-slate-500">
                            Uploaded on {new Date(document.uploadedAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {document.type}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <a href={document.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        View
                      </a>

                      <a href={document.url} download className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {!isView && (
          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white p-5">
            <button onClick={onClose} className="rounded-xl border px-5 py-2 text-sm font-bold text-slate-700">Cancel</button>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Staff"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("");

  async function fetchStaff() {
    try {
      setLoading(true);
      const response = await fetch("/api/staff");
      const data = await readApiResponse(response, "Unable to load staff");
      if (!data.success) throw new Error(data.error || "Unable to load staff");
      setStaff(data.staff || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaff();
  }, []);

  const filteredStaff = useMemo(() => {
    return staff.filter((item) => {
      const text = `${item.full_name || ""} ${item.staff_code || ""} ${item.mobile || ""}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesType = !typeFilter || item.staff_type === typeFilter;
      const matchesStatus = !statusFilter || item.work_status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [staff, search, typeFilter, statusFilter]);

  function openAdd() {
    setSelectedId(null);
    setForm(emptyForm);
    setModalMode("add");
  }

  function openView(item) {
    setSelectedId(item.id);
    setForm({ ...emptyForm, ...item });
    setModalMode("view");
  }

  function openEdit(item) {
    setSelectedId(item.id);
    setForm({ ...emptyForm, ...item });
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedId(null);
    setForm(emptyForm);
  }

  async function saveStaff() {
    try {
      if (!form.full_name.trim()) {
        setMessage("Full name is required");
        return;
      }

      setSubmitting(true);
      const method = modalMode === "edit" ? "PUT" : "POST";
      const url = modalMode === "edit" ? `/api/staff?id=${selectedId}` : "/api/staff";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await readApiResponse(response, "Unable to save staff");
      if (!data.success) throw new Error(data.error || "Failed to save staff");

      setMessage(modalMode === "edit" ? "Staff updated successfully" : "Staff added successfully");
      closeModal();
      fetchStaff();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteStaff(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Deactivate staff?",
      text: `Deactivate ${item.full_name}?`,
      showCancelButton: true,
      confirmButtonText: "Deactivate",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/staff?id=${item.id}`, { method: "DELETE" });
      const data = await readApiResponse(response, "Unable to deactivate staff");
      if (!data.success) throw new Error(data.error || "Failed to delete staff");
      setMessage("Staff deactivated successfully");
      await Swal.fire({
        icon: "success",
        title: "Deactivated",
        text: "Staff deactivated successfully.",
        timer: 1400,
        showConfirmButton: false,
      });
      fetchStaff();
    } catch (error) {
      setMessage(error.message);
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: error.message || "Failed to delete staff",
      });
    }
  }

  const totalStaff = staff.length;
  const teachingStaff = staff.filter((item) => item.staff_type === "Teaching").length;
  const nonTeachingStaff = staff.filter((item) => item.staff_type === "Non-Teaching").length;
  const activeStaff = staff.filter((item) => item.work_status === "Active").length;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Staff Management</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Manage teaching staff, non-teaching staff, payroll-ready employee data and onboarding details.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={openAdd} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700">
                + Add Staff
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Total Staff</p><h2 className="mt-3 text-3xl font-bold">{totalStaff}</h2></div>
          <div className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Teaching Staff</p><h2 className="mt-3 text-3xl font-bold text-blue-700">{teachingStaff}</h2></div>
          <div className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Non-Teaching</p><h2 className="mt-3 text-3xl font-bold text-purple-700">{nonTeachingStaff}</h2></div>
          <div className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Active Staff</p><h2 className="mt-3 text-3xl font-bold text-green-700">{activeStaff}</h2></div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search by name, code or mobile..." className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900" />

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900">
              <option value="">All Staff Types</option>
              <option value="Teaching">Teaching</option>
              <option value="Non-Teaching">Non-Teaching</option>
              <option value="Admin">Admin</option>
              <option value="Support">Support</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Left">Left</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">Staff Directory</h2>
            <p className="mt-1 text-sm text-slate-500">Click a row or View to open full staff profile.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-primary">
                <tr>
                  {["Staff", "Type", "Designation", "Subject", "Mobile", "Salary", "Status", "Actions"].map((h) => (
                    <th key={h} className={`px-5 py-4 text-xs font-bold uppercase tracking-wide text-white ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((item) => (
                  <tr key={item.id} onClick={() => openView(item)} className="cursor-pointer transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                       <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-200">
 <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-200">
  {item.photo_url ? (
    <Image
      src={item.photo_url}
      alt={item.full_name || "Staff"}
      fill
      sizes="48px"
      className="object-cover"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-700">
      {item.full_name?.charAt(0)}
    </div>
  )}
</div>
</div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{item.full_name}</h3>
                          <p className="text-sm text-slate-500">{item.staff_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><StaffTypeBadge type={item.staff_type} /></td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-700">{item.designation || "-"}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{item.subject || "-"}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{item.mobile || "-"}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">₹{Number(item.monthly_salary || 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4"><StatusBadge status={item.work_status} /></td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openView(item)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">View</button>
                        <button onClick={() => openEdit(item)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">Edit</button>
                        <button onClick={() => deleteStaff(item)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && <div className="p-10 text-center text-sm font-semibold text-slate-500">Loading staff...</div>}

            {!loading && filteredStaff.length === 0 && (
              <div className="p-10 text-center">
                <h3 className="text-lg font-semibold text-slate-900">No staff found</h3>
                <p className="mt-2 text-sm text-slate-500">Add teaching and non-teaching staff to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <StaffModal
        open={!!modalMode}
        mode={modalMode}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSubmit={saveStaff}
        submitting={submitting}
      />

    </div>
  );
}
