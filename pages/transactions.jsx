import { useMemo, useState } from "react";
import { FaFileExcel } from "react-icons/fa";
import PaginationControls from "@/components/PaginationControls";
import { withAuthPage } from "@/lib/withAuthPage";
import { downloadExcel } from "@/lib/exportToExcel";

export const getServerSideProps = withAuthPage({ path: "/transactions" });

const columns = [
  "Date",
  "Type",
  "Category",
  "Payment Mode",
  "Amount",
  "Reference",
  "Created By",
  "Notes",
];

const transactions = [];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function TransactionsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 2;

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));

  const paginatedTransactions = useMemo(
    () => transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage]
  );

  function exportTransactions() {
    if (transactions.length === 0) {
      return;
    }

    downloadExcel({
      fileName: "transaction-register.xlsx",
      sheetName: "Transactions",
      rows: transactions.map((row) => ({
        Date: row.date,
        Type: row.type,
        Category: row.category,
        PaymentMode: row.paymentMode,
        Amount: Number(row.amount || 0),
        Reference: row.reference,
        CreatedBy: row.createdBy,
        Notes: row.notes,
      })),
    });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_560px] 2xl:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Transactions
              </p>

              <h1 className="mt-2 text-2xl font-black leading-tight text-slate-900 md:text-3xl">
                Money movement ledger
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
                View fee receipts, admission fee receipts, expenses, payroll,
                refunds, and cash or bank transfers in one place.
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5 md:px-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Transaction register</h2>

                <p className="mt-1 text-sm text-slate-500">
                  All accountant money movement in a single stream.
                </p>
              </div>

              <button
                type="button"
                onClick={exportTransactions}
                disabled={transactions.length === 0}
                className="inline-flex w-fit items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaFileExcel />
                Download Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-primary">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-white"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map((row) => (
                  <tr key={`${row.reference}-${row.type}`} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">{row.date}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{row.type}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{row.category}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{row.paymentMode}</td>
                    <td className="px-5 py-4 text-sm font-bold text-emerald-700">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{row.reference}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{row.createdBy}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {transactions.length === 0 && (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">
                No transactions found.
              </div>
            )}
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={transactions.length}
            pageSize={pageSize}
            label="transactions"
            onPageChange={setCurrentPage}
          />
        </section>
      </div>
    </div>
  );
}
