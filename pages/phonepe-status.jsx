import Link from "next/link";
import { useEffect, useState } from "react";

const STATUS_CONTENT = {
  COMPLETED: {
    title: "Payment Successful",
    message: "PhonePe confirmed the school fee payment.",
    styles: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  FAILED: {
    title: "Payment Failed",
    message: "The payment could not be completed.",
    styles: "border-rose-200 bg-rose-50 text-rose-800",
  },
  PENDING: {
    title: "Payment Pending",
    message: "PhonePe is still processing this payment.",
    styles: "border-amber-200 bg-amber-50 text-amber-800",
  },
};

function formatRupeesFromPaise(value) {
  if (value === null || value === undefined) return "Not available";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(value) / 100);
}

export function getServerSideProps({ query }) {
  return {
    props: {
      merchantOrderId: String(query?.merchantOrderId || "").trim(),
    },
  };
}

export default function PhonePeStatusPage({ merchantOrderId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(Boolean(merchantOrderId));
  const [error, setError] = useState(
    merchantOrderId ? "" : "Merchant order ID is missing."
  );

  useEffect(() => {
    if (!merchantOrderId) return;

    async function checkStatus() {
      try {
        const response = await fetch(
          `/api/phonepe/order-status?merchantOrderId=${encodeURIComponent(
            merchantOrderId
          )}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to verify payment status");
        }

        setStatus(data);

        if (data.state === "COMPLETED") {
          // Later: update the matching fee status to Paid in the database.
          // Later: create the SmartBooks payment-success notification.
        }
      } catch (requestError) {
        setError(requestError.message || "Unable to verify payment status");
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [merchantOrderId]);

  const content =
    STATUS_CONTENT[status?.state] || {
      title: "Payment Status",
      message: "PhonePe returned an unknown payment state.",
      styles: "border-slate-200 bg-slate-50 text-slate-800",
    };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="mb-6 text-center text-xl font-black text-white">
          SmartBooks AI
        </p>

        <section className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-2xl shadow-violet-950/40 sm:p-9">
          {loading && (
            <div className="py-16 text-center">
              <h1 className="text-2xl font-bold text-slate-900">
                Checking payment status
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Verifying the latest order state directly with PhonePe...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
              <h1 className="text-2xl font-bold">Unable to verify payment</h1>
              <p className="mt-2 text-sm">{error}</p>
            </div>
          )}

          {!loading && status && (
            <>
              <div className={`rounded-2xl border p-6 text-center ${content.styles}`}>
                <h1 className="text-2xl font-bold">{content.title}</h1>
                <p className="mt-2 text-sm opacity-80">{content.message}</p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <StatusCard label="Merchant Order ID">
                  {status.merchantOrderId}
                </StatusCard>
                <StatusCard label="State">{status.state}</StatusCard>
                <StatusCard label="Amount">
                  {formatRupeesFromPaise(status.amount)}
                </StatusCard>
                <StatusCard label="Payment Details">
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs font-medium leading-5 text-slate-600">
                    {JSON.stringify(status.paymentDetails, null, 2)}
                  </pre>
                </StatusCard>
              </div>
            </>
          )}

          <Link
            href="/fees"
            className="mt-7 flex w-full items-center justify-center rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-violet-500"
          >
            Back to Fees
          </Link>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ label, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <div className="mt-3 break-words text-sm font-semibold text-slate-800">
        {children}
      </div>
    </div>
  );
}

PhonePeStatusPage.publicPage = true;
