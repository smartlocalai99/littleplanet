"use client";

import React, { useState } from "react";
import Swal from "sweetalert2";

const SCHOOL_NAME = "Little Planet";
const SCHOOL_ADDRESS = "Prakash Nagar, Kadapa, Andhra Pradesh";
const SCHOOL_PHONE = "00000 00000";

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

export default function AdmissionForm({ embedded = false }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [savedAdmission, setSavedAdmission] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const feesAmount = Number(form.fees) || 0;
  const discountPercent = Math.min(Math.max(Number(form.discount) || 0, 0), 100);
  const discountAmount = Math.round((feesAmount * discountPercent) / 100);
  const finalFeeAmount = feesAmount - discountAmount;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const formatDate = (value) => {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      return new Date().toLocaleDateString("en-IN");
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleOnlyDigits = (name, value, maxLength) => {
    setForm((previous) => ({
      ...previous,
      [name]: value.replace(/\D/g, "").slice(0, maxLength),
    }));
  };

  const validateForm = () => {
    if (!form.student_name || !form.father_mobile) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill student name and father mobile number.",
      });
      return false;
    }

    if (!form.class_applying) {
      Swal.fire({
        icon: "warning",
        title: "Missing Class",
        text: "Please enter class applying for.",
      });
      return false;
    }

    return true;
  };

  const openReceiptPreview = () => {
    if (!validateForm()) return;

    setSavedAdmission(null);
    setIsSaved(false);
    setReceiptOpen(true);
  };

  const closeReceiptPreview = () => {
    if (isSaved) {
      setForm({});
    }

    setReceiptOpen(false);
    setSavedAdmission(null);
    setIsSaved(false);
  };

  const waitForImages = (doc) => {
    const images = Array.from(doc.images || []);

    return Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  };

  const printReceiptOnly = async () => {
    const receiptElement = document.getElementById("receipt-preview-source");

    if (!receiptElement) {
      Swal.fire({
        icon: "error",
        title: "Receipt Not Found",
        text: "Please open the receipt preview before printing.",
      });
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
            @page {
              size: A4 landscape;
              margin: 0;
            }

            html,
            body {
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

            body {
              display: block !important;
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

            .receipt-school-name {
              font-size: 13px !important;
              line-height: 1.05 !important;
            }

            .receipt-main-title {
              font-size: 12px !important;
              letter-spacing: 0.16em !important;
              line-height: 1.1 !important;
            }

            .receipt-p-1 {
              padding: 2px 4px !important;
            }

            .receipt-p-2 {
              padding: 3px 5px !important;
            }

            .receipt-row-label {
              width: 100% !important;
            }

            .no-print,
            .swal2-container {
              display: none !important;
            }
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

    setTimeout(async () => {
      await waitForImages(printDocument);

      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      setTimeout(() => {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }, 400);
  };

  const handleSaveAndPrint = async () => {
    if (!validateForm()) return;

    setLoading(true);

    const payload = {
      ...form,
      class_applying: formatClassName(form.class_applying),
      previous_class: formatClassName(form.previous_class),
      fees: feesAmount,
      discount: discountPercent,
      final_fee: finalFeeAmount,
    };

    try {
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        const savedData = {
          ...payload,
          ...(data.data || {}),
        };

        setSavedAdmission(savedData);
        setIsSaved(true);

        Swal.fire({
          icon: "success",
          title: "Admission Saved!",
          text: "Receipt is ready for printing.",
          timer: 700,
          showConfirmButton: false,
        });

        setTimeout(() => {
          Swal.close();
          printReceiptOnly();

          if (embedded) {
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          }
        }, 900);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "Something went wrong",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const printAgain = () => {
    setTimeout(() => {
      printReceiptOnly();
    }, 200);
  };

  const receiptData = savedAdmission || {
    ...form,
    created_at: new Date().toISOString(),
  };

  return (
    <>
      <div
        className={`admission-form-screen ${embedded ? "w-full" : "min-h-screen"}`}
      >
        <div
          className={
            embedded
              ? "w-full space-y-8"
              : "mx-auto w-full space-y-8 bg-white p-6"
          }
        >
          <h1 className="text-center text-2xl font-bold">
            Little Planet Admission Form 2026 - 2027
          </h1>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Student Information">
              <Input
                label="Full Name"
                name="student_name"
                onChange={handleChange}
                value={form.student_name || ""}
              />

              <Select
                label="Gender"
                name="gender"
                onChange={handleChange}
                value={form.gender || ""}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>

              <Input
                label="Date of Birth"
                type="date"
                name="dob"
                onChange={handleChange}
                value={form.dob || ""}
              />

              <Input
                label="Age"
                name="age"
                onChange={handleChange}
                value={form.age || ""}
              />

              <Select
                label="Blood Group"
                name="blood_group"
                onChange={handleChange}
                value={form.blood_group || ""}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </Select>

              <Input
                label="Aadhar (Last 4 Digits)"
                name="aadhar"
                type="text"
                inputMode="numeric"
                maxLength={4}
                onChange={(e) => handleOnlyDigits("aadhar", e.target.value, 4)}
                value={form.aadhar || ""}
              />

              <Input
                label="Nationality"
                name="nationality"
                onChange={handleChange}
                value={form.nationality || ""}
              />

              <Input
                label="Religion"
                name="religion"
                onChange={handleChange}
                value={form.religion || ""}
              />

            </Section>

            <Section title="Academic Details">
              <Select
                label="Class Applying For"
                name="class_applying"
                onChange={handleChange}
                value={form.class_applying || ""}
              >
                <option value="">Select Class</option>
                <option value="Nursery">Nursery</option>
                <option value="LKG">LKG</option>
                <option value="UKG">UKG</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
                <option value="5th">5th</option>
                <option value="6th">6th</option>
                <option value="7th">7th</option>
                <option value="8th">8th</option>
              </Select>

              <Input
                label="Previous School"
                name="previous_school"
                onChange={handleChange}
                value={form.previous_school || ""}
              />

              <Select
                label="Previous Class"
                name="previous_class"
                onChange={handleChange}
                value={form.previous_class || ""}
              >
                <option value="">Select Class</option>
                <option value="Nursery">Nursery</option>
                <option value="LKG">LKG</option>
                <option value="UKG">UKG</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
                <option value="5th">5th</option>
                <option value="6th">6th</option>
                <option value="7th">7th</option>
                <option value="8th">8th</option>
              </Select>

              <Select
                label="Transfer Certificate"
                name="tc"
                onChange={handleChange}
                value={form.tc || ""}
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </Select>

              <Select
                label="Medium"
                name="medium"
                onChange={handleChange}
                value={form.medium || ""}
              >
                <option value="">Select</option>
                <option value="English">English</option>
                <option value="Telugu">Telugu</option>
              </Select>

            </Section>
          </div>


          <div className="mb-6">
            <h2 className="mb-4 rounded-t-lg border-b bg-primary px-4 py-3 text-center text-lg font-semibold text-white">
              Fee Details
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Total School Fees (₹)</label>
                <input
                  type="number"
                  name="fees"
                  min="0"
                  placeholder="Enter total school fees"
                  onChange={handleChange}
                  value={form.fees || ""}
                  className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Discount (%)</label>
                <input
                  type="number"
                  name="discount"
                  min="0"
                  max="100"
                  placeholder="Enter discount percentage"
                  onChange={handleChange}
                  value={form.discount || ""}
                  className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-black"
                />
              </div>

            </div>

            {feesAmount > 0 && (
              <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200">
                <div className="border-r border-slate-200 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total School Fees</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(feesAmount)}</p>
                </div>
                <div className="border-r border-slate-200 bg-amber-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Discount ({discountPercent}%)</p>
                  <p className="mt-1 text-xl font-black text-amber-700">− {formatCurrency(discountAmount)}</p>
                </div>
                <div className="bg-emerald-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Net School Fee</p>
                  <p className="mt-1 text-xl font-black text-emerald-700">{formatCurrency(finalFeeAmount)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Parent Details">
              <Input
                label="Father Name"
                name="father_name"
                onChange={handleChange}
                value={form.father_name || ""}
              />

              <Input
                label="Father Mobile"
                name="father_mobile"
                onChange={handleChange}
                value={form.father_mobile || ""}
              />

              <Input
                label="Father Occupation"
                name="father_occupation"
                onChange={handleChange}
                value={form.father_occupation || ""}
              />

              <Input
                label="Mother Name"
                name="mother_name"
                onChange={handleChange}
                value={form.mother_name || ""}
              />

              <Input
                label="Mother Mobile"
                name="mother_mobile"
                onChange={handleChange}
                value={form.mother_mobile || ""}
              />

              <Input
                label="Mother Occupation"
                name="mother_occupation"
                onChange={handleChange}
                value={form.mother_occupation || ""}
              />

              <Input
                label="Guardian Name"
                name="guardian_name"
                onChange={handleChange}
                value={form.guardian_name || ""}
              />
            </Section>

            <Section title="Bank Details">
              <Input
                label="Mother Aadhar (Last 4)"
                name="mother_aadhar"
                type="text"
                inputMode="numeric"
                maxLength={4}
                onChange={(e) =>
                  handleOnlyDigits("mother_aadhar", e.target.value, 4)
                }
                value={form.mother_aadhar || ""}
              />

              <Input
                label="Bank Account Number"
                name="bank_account"
                onChange={handleChange}
                value={form.bank_account || ""}
              />

              <Input
                label="Bank Name"
                name="bank_name"
                onChange={handleChange}
                value={form.bank_name || ""}
              />

              <Input
                label="Branch"
                name="branch"
                onChange={handleChange}
                value={form.branch || ""}
              />

              <Input
                label="IFSC Code"
                name="ifsc"
                onChange={handleChange}
                value={form.ifsc || ""}
              />
            </Section>
          </div>

          <Section title="Address Details">
            <Input
              label="Address"
              name="address"
              onChange={handleChange}
              value={form.address || ""}
            />

            <Input
              label="Door No"
              name="door_no"
              onChange={handleChange}
              value={form.door_no || ""}
            />

            <Input
              label="Street"
              name="street"
              onChange={handleChange}
              value={form.street || ""}
            />

            <Input
              label="City"
              name="city"
              onChange={handleChange}
              value={form.city || ""}
            />

            <Input
              label="Village/Ward"
              name="village"
              onChange={handleChange}
              value={form.village || ""}
            />

            <Input
              label="Pin Code"
              name="pin_code"
              onChange={handleChange}
              value={form.pin_code || ""}
            />

            <Input
              label="Emergency Contact"
              name="emergency"
              onChange={handleChange}
              value={form.emergency || ""}
            />
          </Section>

          <button
            type="button"
            onClick={openReceiptPreview}
            disabled={loading}
            className="w-full rounded-xl bg-black py-3 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Preview Receipt
          </button>
        </div>
      </div>

      {receiptOpen && (
        <ReceiptPreviewModal
          data={receiptData}
          isSaved={isSaved}
          loading={loading}
          onClose={closeReceiptPreview}
          onSaveAndPrint={handleSaveAndPrint}
          onPrintAgain={printAgain}
          formatDate={formatDate}
        />
      )}
    </>
  );
}

function ReceiptPreviewModal({
  data,
  isSaved,
  loading,
  onClose,
  onSaveAndPrint,
  onPrintAgain,
  formatDate,
}) {
  return (
    <div className="receipt-modal-shell fixed inset-0 z-50 overflow-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="receipt-modal-card mx-auto max-w-7xl rounded-2xl bg-white shadow-2xl">
        <div className="no-print flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Receipt Preview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Check details first. Data will save only after clicking Submit &
              Print.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isSaved ? "Close & New Admission" : "Edit Details"}
            </button>

            {isSaved && (
              <button
                type="button"
                onClick={onPrintAgain}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Print Again
              </button>
            )}

            {!isSaved && (
              <button
                type="button"
                onClick={onSaveAndPrint}
                disabled={loading}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : "Submit & Print"}
              </button>
            )}
          </div>
        </div>

        <div id="receipt-preview-source" className="receipt-print-area bg-white p-4">
          <ReceiptSheet
            data={data}
            isSaved={isSaved}
            formatDate={formatDate}
          />
        </div>
      </div>
    </div>
  );
}

function ReceiptSheet({ data, isSaved, formatDate }) {
  return (
    <div className="print-receipt-sheet grid gap-6 md:grid-cols-2">
      <ReceiptCopy
        data={data}
        isSaved={isSaved}
        formatDate={formatDate}
        copyLabel="School Copy"
      />

      <ReceiptCopy
        data={data}
        isSaved={isSaved}
        formatDate={formatDate}
        copyLabel="Parent Copy"
      />
    </div>
  );
}

function ReceiptCopy({
  data,
  isSaved,
  formatDate,
  copyLabel,
}) {
  const receiptNo =
    isSaved && data?.id ? String(data.id).padStart(5, "0") : "PREVIEW";

  const registrationNo =
    isSaved && data?.id
      ? `QH-${String(data.id).padStart(5, "0")}`
      : "Will generate after submit";

  return (
    <div className="receipt-copy border-2 border-black bg-white text-[11px] leading-tight text-black">
      <div className="receipt-p-2 border-b-2 border-black text-center">
        <div className="flex items-center justify-center gap-3">
        

          <div>
           <img
            src="/logo.jpg"
            alt="School Logo"
className="receipt-logo h-28 w-[420px] object-contain"          />
          </div>
        </div>

        <div className="mt-2 border-y-2 border-black py-1">
          <h2 className="receipt-main-title text-xl font-black tracking-[0.15em]">
            ADMISSION CONFIRMATION RECEIPT
          </h2>
        </div>

        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em]">
          {copyLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 border-b border-black">
        <div className="receipt-p-1 border-r border-black">
          <span className="font-black">Receipt No.</span>
          <span className="ml-2 font-bold">{receiptNo}</span>
        </div>

        <div className="receipt-p-1">
          <span className="font-black">Date :</span>
          <span className="ml-2 font-bold">{formatDate(data?.created_at)}</span>
        </div>
      </div>

      <ReceiptRow label="Regn No." value={registrationNo} />
      <ReceiptRow label="Student Name" value={data?.student_name || "-"} />
      <ReceiptRow label="Father's Name" value={data?.father_name || "-"} />

      <div className="border-b border-black">
        <div className="receipt-p-1">
          <span className="font-black">Class / Standard</span>
          <span className="ml-2 font-bold">{data?.class_applying || "-"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 text-[10px]">
        <div className="receipt-p-1">
          <p className="font-black">Note:</p>
          <p>This document confirms the student admission details.</p>
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

function ReceiptRow({ label, value }) {
  return (
    <div className="grid grid-cols-[110px_1fr] border-b border-black">
      <div className="receipt-row-label receipt-p-1 border-r border-black font-black">
        {label}
      </div>
      <div className="receipt-p-1 font-bold">{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="mb-4 rounded-t-lg border-b bg-primary px-4 py-3 text-center text-lg font-semibold text-white">
        {title}
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>

      <input
        {...props}
        className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-black"
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>

      <select
        {...props}
        className="mt-1 w-full rounded-lg border p-2 outline-none focus:ring-2 focus:ring-black"
      >
        {children}
      </select>
    </div>
  );
}
