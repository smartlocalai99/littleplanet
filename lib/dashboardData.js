import { query } from "@/lib/db";
import dashboardFeeSummary from "@/lib/dashboardFeeSummary";

const { loadDashboardFeeSummary } = dashboardFeeSummary;

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function findTable(candidates) {
  const result = await query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
      ORDER BY array_position($1::text[], table_name)
      LIMIT 1
    `,
    [candidates]
  );

  return result.rows[0]?.table_name || null;
}

async function findColumn(tableName, candidates) {
  const result = await query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2)
      ORDER BY array_position($2::text[], column_name)
      LIMIT 1
    `,
    [tableName, candidates]
  );

  return result.rows[0]?.column_name || null;
}

async function countRows(tableName) {
  const result = await query(
    `SELECT COUNT(*)::int AS value FROM public.${quoteIdentifier(tableName)}`,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

async function sumFirstMatchingColumn(tableCandidates, columnCandidates) {
  const tableName = await findTable(tableCandidates);

  if (!tableName) {
    return null;
  }

  const columnName = await findColumn(tableName, columnCandidates);

  if (!columnName) {
    return null;
  }

  const result = await query(
    `SELECT COALESCE(SUM(${quoteIdentifier(columnName)}), 0)::numeric AS value FROM public.${quoteIdentifier(tableName)}`,
    []
  );

  return Number(result.rows[0]?.value || 0);
}

async function sumSalaries() {
  const payrollTable = await findTable(["payroll", "salaries", "salary_payments", "staff_salaries"]);

  if (payrollTable) {
    const amountCol = await findColumn(payrollTable, ["amount", "salary", "net_salary", "total", "paid_amount"]);

    if (amountCol) {
      const result = await query(
        `SELECT COALESCE(SUM(${quoteIdentifier(amountCol)}), 0)::numeric AS value FROM public.${quoteIdentifier(payrollTable)}`,
        []
      );
      return Number(result.rows[0]?.value || 0);
    }
  }

  const expensesTable = await findTable(["expenses", "expense_records", "cash_expenses", "expense_transactions"]);

  if (expensesTable) {
    const amountCol = await findColumn(expensesTable, ["amount", "expense_amount", "total_amount"]);
    const categoryCol = await findColumn(expensesTable, ["category", "type", "expense_type", "head"]);

    if (amountCol && categoryCol) {
      const result = await query(
        `SELECT COALESCE(SUM(${quoteIdentifier(amountCol)}), 0)::numeric AS value FROM public.${quoteIdentifier(expensesTable)} WHERE LOWER(${quoteIdentifier(categoryCol)}) LIKE '%salary%'`,
        []
      );
      return Number(result.rows[0]?.value || 0);
    }
  }

  return null;
}

export async function getDashboardProps() {
  const [totalStudents, totalAdmissions, latestAdmissions, admissionStatusCounts, feeSummary, expenses, salaries, totalAssets] = await Promise.all([
    countRows("students").catch(() => 0),
    countRows("admissions").catch(() => 0),
    query(
      `
        SELECT id, student_name, class_applying_for, admission_status, created_at, father_name, father_mobile, fees
        FROM public.admissions
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 5
      `,
      []
    )
      .then((result) =>
        result.rows.map((row) => ({
          ...row,
          created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        }))
      )
      .catch(() => []),
    query(
      `
        SELECT
          COALESCE(NULLIF(UPPER(TRIM(admission_status)), ''), 'NEW') AS status,
          COUNT(*)::int AS value
        FROM public.admissions
        GROUP BY COALESCE(NULLIF(UPPER(TRIM(admission_status)), ''), 'NEW')
        ORDER BY value DESC, status ASC
      `,
      []
    )
      .then((result) => result.rows.map((row) => ({
        status: row.status,
        value: Number(row.value || 0),
      })))
      .catch(() => []),
    loadDashboardFeeSummary(query).catch(() => ({
      totalFees: 0,
      pendingFees: 0,
      todaysCollection: 0,
    })),
    sumFirstMatchingColumn(["expenses", "expense_records", "cash_expenses", "expense_transactions"], ["amount", "expense_amount", "total_amount"]).catch(() => null),
    sumSalaries().catch(() => null),
    countRows("assets").catch(() => 0),
  ]);
  return {
    totalStudents,
    totalAdmissions,
    latestAdmissions,
    admissionStatusCounts,
    totalFees: feeSummary.totalFees,
    pendingFees: feeSummary.pendingFees,
    todaysCollection: feeSummary.todaysCollection,
    expenses: Number(expenses || 0),
    salaries: Number(salaries || 0),
    totalAssets,
  };
}
