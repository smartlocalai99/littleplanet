import { getAttendancePool } from "@/lib/attendanceDb";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toUiStaff(row) {
  return {
    id: row.id,
    attendance_staff_id: row.id,
    staff_code: row.teacher_id,
    full_name: row.full_name,
    staff_type: "Teaching",
    designation: "Teacher",
    subject: row.subject,
    photo_url: row.photo_url,
    monthly_salary: Number(row.salary || 0),
    work_status: row.is_active ? "Active" : "Inactive",
    is_enrolled: row.is_enrolled,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export default async function handler(req, res) {
  const attendancePool = getAttendancePool();
  if (!attendancePool) {
    return res.status(503).json({
      success: false,
      error: "Attendance database not configured (ATTENDANCE_DATABASE_URL missing)",
    });
  }

  try {
    if (req.method === "GET") {
      const result = await attendancePool.query(`
        SELECT id, teacher_id, full_name, subject, photo_url, is_enrolled,
               is_active, salary, created_at, updated_at
        FROM public.staff
        ORDER BY full_name ASC
      `);

      return res.status(200).json({
        success: true,
        staff: result.rows.map(toUiStaff),
      });
    }

    if (req.method === "POST") {
      const fullName = String(req.body.full_name || "").trim();
      const teacherId = String(req.body.staff_code || "").trim();
      if (!fullName || !teacherId) {
        return res.status(400).json({
          success: false,
          error: "Staff code and full name are required",
        });
      }

      const result = await attendancePool.query(
        `INSERT INTO public.staff
           (teacher_id, full_name, subject, photo_url, salary, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (teacher_id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           subject = EXCLUDED.subject,
           photo_url = EXCLUDED.photo_url,
           salary = EXCLUDED.salary,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()
         RETURNING id, teacher_id, full_name, subject, photo_url, is_enrolled,
                   is_active, salary, created_at, updated_at`,
        [
          teacherId,
          fullName,
          req.body.subject || "Other",
          req.body.photo_url || null,
          Number(req.body.monthly_salary) || 0,
          req.body.work_status !== "Inactive",
        ]
      );

      return res.status(201).json({ success: true, staff: toUiStaff(result.rows[0]) });
    }

    if (req.method === "PUT") {
      const id = String(req.query.id || "");
      const fullName = String(req.body.full_name || "").trim();
      const teacherId = String(req.body.staff_code || "").trim();
      if (!UUID_PATTERN.test(id) || !fullName || !teacherId) {
        return res.status(400).json({
          success: false,
          error: "Valid attendance staff id, staff code, and full name are required",
        });
      }

      const result = await attendancePool.query(
        `UPDATE public.staff SET
           teacher_id = $1,
           full_name = $2,
           subject = $3,
           photo_url = $4,
           salary = $5,
           is_active = $6,
           updated_at = NOW()
         WHERE id = $7
         RETURNING id, teacher_id, full_name, subject, photo_url, is_enrolled,
                   is_active, salary, created_at, updated_at`,
        [
          teacherId,
          fullName,
          req.body.subject || "Other",
          req.body.photo_url || null,
          Number(req.body.monthly_salary) || 0,
          req.body.work_status !== "Inactive",
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Attendance staff not found" });
      }
      return res.status(200).json({ success: true, staff: toUiStaff(result.rows[0]) });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!UUID_PATTERN.test(id)) {
        return res.status(400).json({ success: false, error: "Valid attendance staff id is required" });
      }

      const result = await attendancePool.query(
        `UPDATE public.staff
         SET is_active = false, updated_at = NOW()
         WHERE id = $1
         RETURNING id, teacher_id, full_name, subject, photo_url, is_enrolled,
                   is_active, salary, created_at, updated_at`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Attendance staff not found" });
      }
      return res.status(200).json({ success: true, staff: toUiStaff(result.rows[0]) });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("Attendance staff API error:", error);
    const status = error.code === "23505" ? 409 : 500;
    const message = error.code === "23505" ? "Staff code already exists" : error.message;
    return res.status(status).json({ success: false, error: message });
  }
}
