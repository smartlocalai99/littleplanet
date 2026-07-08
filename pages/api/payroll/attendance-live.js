import { Pool } from "pg";
import { createPoolOptions } from "@/lib/postgresConfig";
import { getAttendancePool } from "@/lib/attendanceDb";
import { loadAttendanceSalaryMap } from "@/lib/staffSalarySync";
import { ensureStaffAttendanceColumn } from "@/lib/staffSchema";

const pool =
  global.pgPool ||
  new Pool(createPoolOptions({ ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false }));
if (!global.pgPool) global.pgPool = pool;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { staff_id, month } = req.query; // month = "YYYY-MM"

  if (!staff_id || !month) {
    return res.status(400).json({ success: false, error: "staff_id and month are required" });
  }

  const attendancePool = getAttendancePool();
  if (!attendancePool) {
    return res.status(503).json({ success: false, error: "Attendance DB not configured" });
  }

  try {
    await ensureStaffAttendanceColumn(pool);

    // Look up attendance_staff_id for this school staff
    const schoolStaff = await pool.query(
      `SELECT id, full_name, monthly_salary, attendance_staff_id FROM public.staff WHERE id = $1`,
      [Number(staff_id)]
    );

    if (schoolStaff.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Staff not found" });
    }

    const staff = schoolStaff.rows[0];

    if (!staff.attendance_staff_id) {
      return res.status(404).json({
        success: false,
        error: "This staff member is not linked to the attendance system",
        not_linked: true,
      });
    }

    // Fetch attendance records for this month
    const [year, mon] = month.split("-");
    const startDate = `${year}-${mon}-01`;
    const endDate = new Date(Number(year), Number(mon), 0).toISOString().slice(0, 10);

    const attResult = await attendancePool.query(
      `
      SELECT
        attendance_date,
        check_in,
        check_out,
        status
      FROM attendance
      WHERE staff_id = $1
        AND attendance_date BETWEEN $2 AND $3
      ORDER BY attendance_date ASC
      `,
      [staff.attendance_staff_id, startDate, endDate]
    );

    const records = attResult.rows;
    const presentDays = records.filter((r) => r.status === "Present").length;
    const absentDays = records.filter((r) => r.status === "Absent").length;
    const halfDays = records.filter((r) => r.status === "Half Day").length;
    const totalDays = records.length;

    const salaryByAttendanceId = await loadAttendanceSalaryMap(attendancePool, [
      staff.attendance_staff_id,
    ]);
    const attendanceSalary = Number(
      salaryByAttendanceId.get(staff.attendance_staff_id) || 0
    );
    const monthlySalary = attendanceSalary || Number(staff.monthly_salary) || 0;
    const workingDaysInMonth = new Date(Number(year), Number(mon), 0).getDate();
    const effectiveDays = presentDays + halfDays * 0.5;
    const lopDays = Math.max(workingDaysInMonth - effectiveDays, 0);
    const deduction = workingDaysInMonth > 0 ? Math.round((monthlySalary / workingDaysInMonth) * lopDays) : 0;
    const netSalary = Math.max(monthlySalary - deduction, 0);

    return res.status(200).json({
      success: true,
      staff_name: staff.full_name,
      monthly_salary: monthlySalary,
      month,
      summary: {
        working_days: workingDaysInMonth,
        present_days: presentDays,
        absent_days: absentDays,
        half_days: halfDays,
        lop_days: lopDays,
        basic_salary: monthlySalary,
        deduction_amount: deduction,
        net_salary: netSalary,
        total_records: totalDays,
      },
      records: records.map((r) => ({
        date: r.attendance_date,
        status: r.status,
        check_in: r.check_in,
        check_out: r.check_out,
      })),
    });
  } catch (err) {
    console.error("Attendance live error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
