import { Pool } from "pg";

const pool =
  global.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

if (!global.pgPool) global.pgPool = pool;

const ALLOWED_STATUS = [
  "Follow-up Required",
  "Admission Confirmed",
  "Not Interested",
];

const ALLOWED_TEST_STATUS = ["Appeared", "Not Appeared"];

const ALLOWED_RESULT_STATUS = [
  "Not Applicable",
  "Pending",
  "Qualified",
  "Not Qualified",
];

const ALLOWED_SORT_COLUMNS = {
  source_sheet_row: "source_sheet_row",
  parent_name: "parent_name",
  child_name: "child_name",
  class_number: "class_number",
  mobile_number: "mobile_number",
  admission_status: "admission_status",
  test_status: "test_status",
  result_status: "result_status",
};

function toInt(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const {
      search = "",
      classNumber = "",
      admissionStatus = "",
      testStatus = "",
      resultStatus = "",
      page = "1",
      limit = "50",
      sortBy = "source_sheet_row",
      sortOrder = "asc",
    } = req.query;

    const currentPage = toInt(page, 1);
    const pageLimit = Math.min(toInt(limit, 50), 200);
    const offset = (currentPage - 1) * pageLimit;

    const searchValue = search.trim() || null;
    const classValue = classNumber ? Number(classNumber) : null;
    const admissionValue = ALLOWED_STATUS.includes(admissionStatus) ? admissionStatus : null;
    const testValue = ALLOWED_TEST_STATUS.includes(testStatus) ? testStatus : null;
    const resultValue = ALLOWED_RESULT_STATUS.includes(resultStatus) ? resultStatus : null;

    const safeSortColumn = ALLOWED_SORT_COLUMNS[sortBy] || "source_sheet_row";
    const safeSortOrder = sortOrder === "desc" ? "DESC" : "ASC";

    const recordsResult = await pool.query(
      `
      SELECT 
        id,
        source_sheet_row,
        response_timestamp,
        parent_name,
        mobile_number,
        child_name,
        class_number,
        class_label,
        raw_class,
        data_status,
        admission_status,
        test_status,
        result_status,
        exam_class_number,
        test_marks,
        result_rank,
        result_note,
        result_source
      FROM talent_hunt_responses
      WHERE data_status = 'OK'
        AND (
          $1::text IS NULL OR
          parent_name ILIKE '%' || $1 || '%' OR
          child_name ILIKE '%' || $1 || '%' OR
          mobile_number ILIKE '%' || $1 || '%'
        )
        AND ($2::int IS NULL OR class_number = $2)
        AND ($3::text IS NULL OR admission_status = $3)
        AND ($4::text IS NULL OR test_status = $4)
        AND ($5::text IS NULL OR result_status = $5)
      ORDER BY ${safeSortColumn} ${safeSortOrder} NULLS LAST, source_sheet_row ASC, id ASC
      LIMIT $6
      OFFSET $7
      `,
      [searchValue, classValue, admissionValue, testValue, resultValue, pageLimit, offset]
    );

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM talent_hunt_responses
      WHERE data_status = 'OK'
        AND (
          $1::text IS NULL OR
          parent_name ILIKE '%' || $1 || '%' OR
          child_name ILIKE '%' || $1 || '%' OR
          mobile_number ILIKE '%' || $1 || '%'
        )
        AND ($2::int IS NULL OR class_number = $2)
        AND ($3::text IS NULL OR admission_status = $3)
        AND ($4::text IS NULL OR test_status = $4)
        AND ($5::text IS NULL OR result_status = $5)
      `,
      [searchValue, classValue, admissionValue, testValue, resultValue]
    );

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE admission_status = 'Follow-up Required')::int AS follow_up,
        COUNT(*) FILTER (WHERE admission_status = 'Admission Confirmed')::int AS confirmed,
        COUNT(*) FILTER (WHERE admission_status = 'Not Interested')::int AS not_interested
      FROM talent_hunt_responses
      WHERE data_status = 'OK'
    `);

    const classResult = await pool.query(`
      SELECT 
        class_number,
        COALESCE(class_label, 'Unknown') AS class_label,
        COUNT(*)::int AS count
      FROM talent_hunt_responses
      WHERE data_status = 'OK'
      GROUP BY class_number, class_label
      ORDER BY class_number ASC NULLS LAST
    `);

    const statsRow = statsResult.rows[0] || {};
    const totalCount = countResult.rows[0]?.count || 0;

    return res.status(200).json({
      success: true,
      records: recordsResult.rows,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        count: totalCount,
        totalPages: Math.ceil(totalCount / pageLimit),
      },
      stats: {
        followUp: statsRow.follow_up || 0,
        confirmed: statsRow.confirmed || 0,
        notInterested: statsRow.not_interested || 0,
      },
      classBreakdown: classResult.rows,
    });
  } catch (err) {
    console.error("Talent Hunt API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}