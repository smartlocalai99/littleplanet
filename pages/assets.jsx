import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { withAuthPage } from "@/lib/withAuthPage";

export const getServerSideProps = withAuthPage({ path: "/assets" });

const emptyForm = {
  asset_code: "",
  asset_name: "",
  asset_category: "Furniture",
  quantity: 1,
  purchase_date: "",
  purchase_cost: "",
  vendor_name: "",
  invoice_number: "",
  invoice_file_url: "",
  brand: "",
  model_number: "",
  serial_number: "",
  assigned_to: "",
  assigned_location: "",
  warranty_expiry_date: "",
  description: "",
};

const assetCategories = [
  "Furniture",
  "Electronics",
  "Library Books",
  "Vehicles",
  "Lab Equipment",
  "Sports",
  "Office Equipment",
  "Classroom Equipment",
  "Infrastructure",
  "CCTV",
  "Computers",
  "Repairs & Maintenance",
];

const adjustmentReasons = [
  "Issued / Given",
  "Sold",
  "Damaged",
  "Lost",
  "Disposed",
  "Returned to Vendor",
];

const serviceTypes = [
  "Repair",
  "Service",
  "AMC",
  "Replacement",
  "Inspection",
  "Upgrade",
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getUnitValue(item) {
  const qty = Number(item?.quantity || 0);
  const total = Number(item?.purchase_cost || 0);

  if (!qty || qty <= 0) return 0;

  return total / qty;
}

function appendLog(existingDescription, title, lines = []) {
  const log = [
    "",
    `--- ${title} ---`,
    ...lines.filter(Boolean),
    `Updated on: ${new Date().toLocaleString("en-IN")}`,
  ].join("\n");

  return `${existingDescription || ""}${log}`;
}

function AssetModal({
  open,
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
  submitting,
}) {
  if (!open) return null;

  const isView = mode === "view";
  const title =
    mode === "add"
      ? "Add Asset"
      : mode === "edit"
      ? "Edit Asset"
      : "Asset Details";

  function input(name, label, type = "text") {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
          {label}
        </label>
        <input
          type={type}
          value={form[name] || ""}
          disabled={isView}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, [name]: e.target.value }))
          }
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold"
          >
            Close
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-3 font-bold text-slate-900">
              Basic Asset Details
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {input("asset_code", "Asset Code")}
              {input("asset_name", "Asset Name")}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Category
                </label>
                <select
                  value={form.asset_category || ""}
                  disabled={isView}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      asset_category: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
                >
                  {assetCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              {input("quantity", "Quantity", "number")}
              {input("brand", "Brand")}
              {input("model_number", "Model Number")}
              {input("serial_number", "Serial Number")}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">
              Purchase & Invoice
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {input("purchase_date", "Purchase Date", "date")}
              {input("purchase_cost", "Total Asset Value", "number")}
              {input("vendor_name", "Vendor Name")}
              {input("invoice_number", "Invoice Number")}
              {input("invoice_file_url", "Invoice File URL")}
              {input("warranty_expiry_date", "Warranty Expiry Date", "date")}
            </div>

            <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800">
              For books or bulk items, purchase cost should be total value.
              Example: 100 books for ₹10,000. If 10 books are given/sold, system
              reduces value based on unit cost.
            </p>
          </section>

          <section>
            <h3 className="mb-3 font-bold text-slate-900">Assignment</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {input("assigned_to", "Assigned To")}
              {input("assigned_location", "Location")}
            </div>
          </section>

          <section>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Description / History
            </label>
            <textarea
              value={form.description || ""}
              disabled={isView}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={6}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
            />
          </section>

          {isView && form.invoice_file_url && (
            <section className="rounded-2xl bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900">Invoice File</h3>
              <a
                href={form.invoice_file_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                Open Invoice
              </a>
            </section>
          )}
        </div>

        {!isView && (
          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white p-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-5 py-2 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Asset"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuantityAdjustModal({ open, asset, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    date: getToday(),
    reason: "Issued / Given",
    quantity_to_reduce: 1,
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        date: getToday(),
        reason: "Issued / Given",
        quantity_to_reduce: 1,
        notes: "",
      });
    }
  }, [open]);

  if (!open || !asset) return null;

  const currentQty = Number(asset.quantity || 0);
  const currentValue = Number(asset.purchase_cost || 0);
  const reduceQty = Math.min(
    Math.max(Number(form.quantity_to_reduce || 0), 0),
    currentQty
  );
  const unitValue = getUnitValue(asset);
  const valueReduction = Math.round(unitValue * reduceQty);
  const newQty = Math.max(currentQty - reduceQty, 0);
  const newValue = Math.max(currentValue - valueReduction, 0);

  function submit() {
    if (!reduceQty || reduceQty <= 0) {
      void Swal.fire({
        icon: "warning",
        title: "Quantity required",
        text: "Enter quantity to reduce.",
      });
      return;
    }

    if (reduceQty > currentQty) {
      void Swal.fire({
        icon: "warning",
        title: "Invalid quantity",
        text: "Reduce quantity cannot be more than available quantity.",
      });
      return;
    }

    onSubmit({
      ...form,
      quantity_to_reduce: reduceQty,
      value_reduction: valueReduction,
      new_quantity: newQty,
      new_value: newValue,
      unit_value: unitValue,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Reduce Quantity / Value
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Use this when books/items are given, sold, damaged, lost or
              disposed.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">
              {asset.asset_name}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Current Qty: {currentQty} • Current Value:{" "}
              {formatCurrency(currentValue)} • Unit Value:{" "}
              {formatCurrency(unitValue)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Reason
              </label>
              <select
                value={form.reason}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              >
                {adjustmentReasons.map((reason) => (
                  <option key={reason}>{reason}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Quantity to Reduce
              </label>
              <input
                type="number"
                min="1"
                max={currentQty}
                value={form.quantity_to_reduce}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    quantity_to_reduce: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Amount Reduced
              </label>
              <input
                value={formatCurrency(valueReduction)}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-red-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-bold uppercase text-green-700">
                New Quantity
              </p>
              <p className="mt-1 text-2xl font-black text-green-700">
                {newQty}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-700">
                New Asset Value
              </p>
              <p className="mt-1 text-2xl font-black text-blue-700">
                {formatCurrency(newValue)}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Example: 25 books given to 5th class students / 2 computers damaged..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
            If books are only temporarily issued to students and will return
            later, do not reduce asset stock. Use reduce only when items are
            permanently given, sold, lost, damaged or disposed.
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-5 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-red-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Reduce Stock & Value"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MaintenanceModal({ open, asset, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    service_date: getToday(),
    service_type: "Repair",
    vendor_name: "",
    repair_cost: "",
    issue_reported: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        service_date: getToday(),
        service_type: "Repair",
        vendor_name: "",
        repair_cost: "",
        issue_reported: "",
        notes: "",
      });
    }
  }, [open]);

  if (!open || !asset) return null;

  function submit() {
    if (!form.issue_reported) {
      void Swal.fire({
        icon: "warning",
        title: "Repair details required",
        text: "Enter issue / repair details.",
      });
      return;
    }

    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Repair / Service Asset
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Use this for CCTV, computer, printer, bus, projector or any asset
              repair.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">
              {asset.asset_name}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {asset.asset_code} • {asset.asset_category} • Location:{" "}
              {asset.assigned_location || "-"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Service Date
              </label>
              <input
                type="date"
                value={form.service_date}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    service_date: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Service Type
              </label>
              <select
                value={form.service_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    service_type: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              >
                {serviceTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Vendor / Technician
              </label>
              <input
                value={form.vendor_name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    vendor_name: e.target.value,
                  }))
                }
                placeholder="Technician or service vendor"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                Repair Cost
              </label>
              <input
                type="number"
                min="0"
                value={form.repair_cost}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    repair_cost: e.target.value,
                  }))
                }
                placeholder="Amount"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Issue / Work Done
            </label>
            <textarea
              rows={3}
              value={form.issue_reported}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  issue_reported: e.target.value,
                }))
              }
              placeholder="Example: CCTV camera not working, DVR repaired, computer RAM replaced..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Warranty details, next service date, technician remarks..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
            Repair/service cost is treated as maintenance expense. Asset
            quantity is not reduced unless the item is lost, damaged beyond
            repair, sold or disposed.
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-5 py-2 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Repair / Service"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [message, setMessage] = useState("");

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/assets");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Unable to fetch assets");
      }

      setAssets(data.assets || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAssets();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchAssets]);

  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      const text = `${item.asset_code || ""} ${item.asset_name || ""} ${
        item.asset_category || ""
      }`.toLowerCase();

      return (
        text.includes(search.toLowerCase()) &&
        (!categoryFilter || item.asset_category === categoryFilter)
      );
    });
  }, [assets, search, categoryFilter]);

  const totalAssets = assets.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const totalValue = assets.reduce(
    (sum, item) => sum + Number(item.purchase_cost || 0),
    0
  );
  const categories = [
    ...new Set(assets.map((item) => item.asset_category).filter(Boolean)),
  ];
  const categoryOptions = [...new Set([...assetCategories, ...categories])];

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

  function openQuantityAdjust(item) {
    setSelectedAsset(item);
    setQuantityModalOpen(true);
  }

  function openMaintenance(item) {
    setSelectedAsset(item);
    setMaintenanceModalOpen(true);
  }

  function closeModal() {
    setModalMode(null);
    setSelectedId(null);
    setForm(emptyForm);
  }

  function closeQuantityModal() {
    setQuantityModalOpen(false);
    setSelectedAsset(null);
  }

  function closeMaintenanceModal() {
    setMaintenanceModalOpen(false);
    setSelectedAsset(null);
  }

  async function saveAsset() {
    try {
      if (!form.asset_code || !form.asset_name || !form.asset_category) {
        setMessage("Asset code, name and category are required");
        return;
      }

      setSubmitting(true);

      const method = modalMode === "edit" ? "PUT" : "POST";
      const url =
        modalMode === "edit" ? `/api/assets?id=${selectedId}` : "/api/assets";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save asset");
      }

      setMessage(
        modalMode === "edit"
          ? "Asset updated successfully"
          : "Asset added successfully"
      );
      closeModal();
      fetchAssets();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function saveQuantityAdjustment(adjustment) {
    if (!selectedAsset) return;

    try {
      setSubmittingAdjustment(true);

      const updatedDescription = appendLog(
        selectedAsset.description,
        "ASSET QUANTITY / VALUE ADJUSTMENT",
        [
          `Date: ${adjustment.date}`,
          `Reason: ${adjustment.reason}`,
          `Quantity Reduced: ${adjustment.quantity_to_reduce}`,
          `Unit Value: ${formatCurrency(adjustment.unit_value)}`,
          `Amount Reduced: ${formatCurrency(adjustment.value_reduction)}`,
          `New Quantity: ${adjustment.new_quantity}`,
          `New Asset Value: ${formatCurrency(adjustment.new_value)}`,
          adjustment.notes ? `Notes: ${adjustment.notes}` : "",
        ]
      );

      const updatedAsset = {
        ...selectedAsset,
        quantity: adjustment.new_quantity,
        purchase_cost: adjustment.new_value,
        description: updatedDescription,
      };

      const response = await fetch(`/api/assets?id=${selectedAsset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedAsset),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to update asset quantity");
      }

      setMessage(
        `${selectedAsset.asset_name} reduced by ${
          adjustment.quantity_to_reduce
        } item(s). Asset value reduced by ${formatCurrency(
          adjustment.value_reduction
        )}.`
      );

      closeQuantityModal();
      fetchAssets();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmittingAdjustment(false);
    }
  }

  async function saveMaintenance(service) {
    if (!selectedAsset) return;

    try {
      setSubmittingMaintenance(true);

      const updatedDescription = appendLog(
        selectedAsset.description,
        "ASSET REPAIR / SERVICE LOG",
        [
          `Date: ${service.service_date}`,
          `Service Type: ${service.service_type}`,
          service.vendor_name ? `Vendor/Technician: ${service.vendor_name}` : "",
          service.repair_cost
            ? `Repair Cost: ${formatCurrency(service.repair_cost)}`
            : "",
          `Issue/Work Done: ${service.issue_reported}`,
          service.notes ? `Notes: ${service.notes}` : "",
        ]
      );

      const updatedAsset = {
        ...selectedAsset,
        description: updatedDescription,
      };

      const response = await fetch(`/api/assets?id=${selectedAsset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedAsset),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save repair/service log");
      }

      if (Number(service.repair_cost || 0) > 0) {
        try {
          await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: service.service_date,
              title: `${service.service_type} - ${selectedAsset.asset_name}`,
              category: "Maintenance",
              amount: Number(service.repair_cost || 0),
              notes: `${service.issue_reported}${
                service.vendor_name ? ` | Vendor: ${service.vendor_name}` : ""
              }${service.notes ? ` | ${service.notes}` : ""}`,
              receipt_file_name: "",
            }),
          });
        } catch (expenseError) {
          console.warn("Maintenance expense save failed:", expenseError);
        }
      }

      setMessage(
        `Repair/service log saved for ${selectedAsset.asset_name}. ${
          service.repair_cost
            ? `Expense recorded: ${formatCurrency(service.repair_cost)}.`
            : ""
        }`
      );

      closeMaintenanceModal();
      fetchAssets();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmittingMaintenance(false);
    }
  }

  async function deleteAsset(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete asset?",
      text: `Delete ${item.asset_name}?`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/assets?id=${item.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete asset");
      }

      setMessage("Asset deleted successfully");
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Asset deleted successfully.",
        timer: 1400,
        showConfirmButton: false,
      });
      fetchAssets();
    } catch (error) {
      setMessage(error.message);
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: error.message || "Failed to delete asset",
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Assets
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Track books, computers, CCTV, furniture, vehicles, invoices,
                quantity reductions and repair/service history.
              </p>
            </div>

            <button
              type="button"
              onClick={openAdd}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + Add Asset
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Asset Quantity
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {totalAssets}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Current Asset Value
            </p>
            <h2 className="mt-3 text-3xl font-bold text-green-700">
              {formatCurrency(totalValue)}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Categories</p>
            <h2 className="mt-3 text-3xl font-bold text-blue-700">
              {categories.length}
            </h2>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, code or category..."
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
            Client rule: use <b>Reduce Qty</b> for books/items permanently
            given, sold, damaged, lost or disposed. Use <b>Repair/Service</b>{" "}
            for CCTV, computer, printer, projector or vehicle repair without
            reducing stock.
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              Asset Register
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Click a row or View to open full asset details.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px]">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[31%]" />
              </colgroup>
              <thead className="bg-primary">
                <tr>
                  {[
                    "Asset",
                    "Category",
                    "Qty",
                    "Value",
                    "Purchase Date",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-4 text-xs font-bold uppercase tracking-wide text-white ${
                        h === "Actions" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((item) => {
                  const unitValue = getUnitValue(item);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openView(item)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {item.asset_name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {item.asset_code}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {item.asset_category}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-900">
                          {item.quantity}
                        </p>
                        {Number(item.quantity || 0) > 1 && (
                          <p className="text-xs text-slate-500">
                            Unit: {formatCurrency(unitValue)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(item.purchase_cost)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {formatDate(item.purchase_date)}
                      </td>

                      <td
                        className="px-5 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openView(item)}
                            className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openQuantityAdjust(item)}
                            disabled={Number(item.quantity || 0) <= 0}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reduce Qty
                          </button>
                          <button
                            type="button"
                            onClick={() => openMaintenance(item)}
                            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                          >
                            Repair/Service
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAsset(item)}
                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {loading && (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">
                Loading assets...
              </div>
            )}

            {!loading && filteredAssets.length === 0 && (
              <div className="p-10 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  No assets found
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Add benches, computers, CCTV, library books, vehicles and
                  other school assets.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AssetModal
        open={!!modalMode}
        mode={modalMode}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSubmit={saveAsset}
        submitting={submitting}
      />

      <QuantityAdjustModal
        open={quantityModalOpen}
        asset={selectedAsset}
        onClose={closeQuantityModal}
        onSubmit={saveQuantityAdjustment}
        submitting={submittingAdjustment}
      />

      <MaintenanceModal
        open={maintenanceModalOpen}
        asset={selectedAsset}
        onClose={closeMaintenanceModal}
        onSubmit={saveMaintenance}
        submitting={submittingMaintenance}
      />
    </div>
  );
}
