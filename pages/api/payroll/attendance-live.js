import { getAttendancePool } from "@/lib/attendanceDb";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const attendanceStaffId = String(req.query.attendance_staff_id || req.query.staff_id || "");
  const month = String(req.query.month || "");

  if (!UUID_PATTERN.test(attendanceStaffId) || !MONTH_PATTERN.test(month)) {
    return res.status(400).json({
      success: false,
      error: "A valid attendance staff UUID and month (YYYY-MM) are required",
    });
  }

  const attendancePool = getAttendancePool();
  if (!attendancePool) {
    return res.status(503).json({ success: false, error: "Attendance DB not configured" });
  }

  try {
    const [year, monthNumber] = month.split("-").map(Number);
    const startDate = `${month}-01`;
    const endDate = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);

    const [staffResult, attendanceResult] = await Promise.all([
      attendancePool.query(
        `SELECT id, teacher_id, full_name, subject, salary
         FROM public.staff
         WHERE id = $1 AND is_active = true`,
        [attendanceStaffId]
      ),
      attendancePool.query(
        `SELECT attendance_date, check_in, check_out, status
         FROM public.attendance
         WHERE staff_id = $1
           AND attendance_date BETWEEN $2 AND $3
         ORDER BY attendance_date ASC`,
        [attendanceStaffId, startDate, endDate]
      ),
    ]);

    if (staffResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Attendance staff not found" });
    }

    const staff = staffResult.rows[0];
    const records = attendanceResult.rows;
    const presentDays = records.filter((record) => record.status === "Present").length;
    const absentDays = records.filter((record) => record.status === "Absent").length;
    const halfDays = records.filter((record) => record.status === "Half Day").length;
    const workingDays = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const salary = Number(staff.salary || 0);
    const effectiveDays = presentDays + halfDays * 0.5;
    const lopDays = Math.max(workingDays - effectiveDays, 0);
    const deduction = workingDays > 0 ? Math.round((salary / workingDays) * lopDays) : 0;

    return res.status(200).json({
      success: true,
      staff_id: staff.id,
      teacher_id: staff.teacher_id,
      staff_name: staff.full_name,
      subject: staff.subject,
      monthly_salary: salary,
      month,
      summary: {
        working_days: workingDays,
        present_days: presentDays,
        absent_days: absentDays,
        half_days: halfDays,
        lop_days: lopDays,
        basic_salary: salary,
        deduction_amount: deduction,
        net_salary: Math.max(salary - deduction, 0),
        total_records: records.length,
      },
      records: records.map((record) => ({
        date: record.attendance_date,
        status: record.status,
        check_in: record.check_in,
        check_out: record.check_out,
      })),
    });
  } catch (error) {
    console.error("Attendance live read error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
