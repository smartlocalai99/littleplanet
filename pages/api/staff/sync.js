import { getAttendancePool } from "@/lib/attendanceDb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      success: false,
      error: "This endpoint is read-only. Attendance staff are not copied into the school database.",
    });
  }

  const attendancePool = getAttendancePool();
  if (!attendancePool) {
    return res.status(503).json({
      success: false,
      error: "Attendance database not configured (ATTENDANCE_DATABASE_URL missing)",
    });
  }

  try {
    const result = await attendancePool.query(`
      SELECT
        id,
        teacher_id,
        full_name,
        subject,
        photo_url,
        is_enrolled,
        is_active,
        salary,
        created_at,
        updated_at
      FROM public.staff
      WHERE is_active = true
      ORDER BY full_name ASC
    `);

    return res.status(200).json({ success: true, staff: result.rows });
  } catch (error) {
    console.error("Attendance staff read error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
