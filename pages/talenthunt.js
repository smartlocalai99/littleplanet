import { useEffect, useState } from "react";

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function SortIcon({ column, sortBy, sortOrder }) {
  if (column !== sortBy) {
    return <span className="ml-1 text-slate-300">↕</span>;
  }

  return (
    <span className="ml-1 text-slate-900">
      {sortOrder === "asc" ? "↑" : "↓"}
    </span>
  );
}

function SortHeader({ label, column, sortBy, sortOrder, onSort }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase text-slate-500">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 hover:text-slate-900"
      >
        {label}
        <SortIcon column={column} sortBy={sortBy} sortOrder={sortOrder} />
      </button>
    </th>
  );
}

function TestBadge({ status }) {
  if (status === "Appeared") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        Appeared
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
      Not Appeared
    </span>
  );
}

function ResultBadge({ status }) {
  if (status === "Qualified") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        Qualified
      </span>
    );
  }

  if (status === "Not Qualified") {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        Not Qualified
      </span>
    );
  }

  if (status === "Pending") {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
        Pending
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
      Not Applicable
    </span>
  );
}

function AdmissionBadge({ status }) {
  if (status === "Admission Confirmed") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        Admission Confirmed
      </span>
    );
  }

  if (status === "Not Interested") {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        Not Interested
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
      Follow-up Required
    </span>
  );
}

export default function TalentHuntPage() {
  const [records, setRecords] = useState([]);

  const [stats, setStats] = useState({
    followUp: 0,
    confirmed: 0,
    notInterested: 0,
  });

  const [classBreakdown, setClassBreakdown] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    count: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [admissionStatus, setAdmissionStatus] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [resultStatus, setResultStatus] = useState("");
  const [page, setPage] = useState(1);

  const [sortBy, setSortBy] = useState("source_sheet_row");
  const [sortOrder, setSortOrder] = useState("asc");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchTalentHuntData() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        search,
        classNumber,
        admissionStatus,
        testStatus,
        resultStatus,
        page: String(page),
        limit: "50",
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/talenthunt?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || data.error || "Unable to fetch data");
      }

      setRecords(data.records || []);
      setStats(data.stats || {});
      setClassBreakdown(data.classBreakdown || []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTalentHuntData();
  }, [
    search,
    classNumber,
    admissionStatus,
    testStatus,
    resultStatus,
    page,
    sortBy,
    sortOrder,
  ]);

  function handleClassChange(value) {
    setClassNumber(value);
    setPage(1);
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  function handleAdmissionFilter(value) {
    setAdmissionStatus(value);
    setPage(1);
  }

  function handleTestFilter(value) {
    setTestStatus(value);
    setPage(1);
  }

  function handleResultFilter(value) {
    setResultStatus(value);
    setPage(1);
  }

  function handleSort(column) {
    setPage(1);

    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                Talent Hunt Admissions
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage test attendance, results and admission status
              </p>
            </div>

            <button
              onClick={fetchTalentHuntData}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Follow-up Required
            </p>
            <h2 className="mt-2 text-3xl font-bold text-yellow-600">
              {stats.followUp || 0}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Admission Confirmed
            </p>
            <h2 className="mt-2 text-3xl font-bold text-green-600">
              {stats.confirmed || 0}
            </h2>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Not Interested
            </p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {stats.notInterested || 0}
            </h2>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search
              </label>
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search parent, child or mobile..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Class
              </label>
              <select
                value={classNumber}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
              >
                <option value="">All Classes</option>
                {classBreakdown.map((item) => (
                  <option
                    key={item.class_number || "unknown"}
                    value={item.class_number || ""}
                  >
                    {item.class_label} - {item.count}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Test Status
              </label>
              <select
                value={testStatus}
                onChange={(e) => handleTestFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
              >
                <option value="">All</option>
                <option value="Appeared">Appeared</option>
                <option value="Not Appeared">Not Appeared</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Result
              </label>
              <select
                value={resultStatus}
                onChange={(e) => handleResultFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
              >
                <option value="">All</option>
                <option value="Not Applicable">Not Applicable</option>
                <option value="Pending">Pending</option>
                <option value="Qualified">Qualified</option>
                <option value="Not Qualified">Not Qualified</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Admission Status
            </label>
            <select
              value={admissionStatus}
              onChange={(e) => handleAdmissionFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 md:w-72"
            >
              <option value="">All Status</option>
              <option value="Follow-up Required">Follow-up Required</option>
              <option value="Admission Confirmed">Admission Confirmed</option>
              <option value="Not Interested">Not Interested</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Registration List
              </h3>
              <p className="text-sm text-slate-500">
                Showing {records.length} of {pagination.count || 0} records
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm font-semibold text-slate-600">
                Page {pagination.page || page} / {pagination.totalPages || 1}
              </span>

              <button
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          {loading && (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">
              Loading Talent Hunt data...
            </div>
          )}

          {error && (
            <div className="m-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && records.length === 0 && (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">
              No records found.
            </div>
          )}

          {!loading && !error && records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <SortHeader
                      label="ID"
                      column="source_sheet_row"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />

                    <SortHeader
                      label="Parent"
                      column="parent_name"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />

                    <SortHeader
                      label="Child"
                      column="child_name"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />

                    <SortHeader
                      label="Class"
                      column="class_number"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />

                    <SortHeader
                      label="Mobile"
                      column="mobile_number"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />

                    <SortHeader
                      label="Test Status"
                      column="test_status"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />

                  <SortHeader
  label="Marks"
  column="test_marks"
  sortBy={sortBy}
  sortOrder={sortOrder}
  onSort={handleSort}
/>

                    <SortHeader
                      label="Admission Status"
                      column="admission_status"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {records.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-700">
                        {item.source_sheet_row || "-"}
                      </td>

                      <td className="min-w-[180px] px-4 py-4 text-sm font-semibold text-slate-900">
                        {item.parent_name || "-"}
                      </td>

                      <td className="min-w-[180px] px-4 py-4 text-sm font-semibold text-slate-900">
                        {item.child_name || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-700">
                        {item.class_label || item.raw_class || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-700">
                        {item.mobile_number || "-"}
                      </td>

                      <td className="min-w-[150px] px-4 py-4">
                        <TestBadge status={item.test_status} />
                      </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-800">
  {item.test_marks ?? "-"}
</td>

                      <td className="min-w-[210px] px-4 py-4">
                        <AdmissionBadge status={item.admission_status} />
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