function applyAttendanceSalaries(staffRows, salaryByAttendanceId) {
  return staffRows.map((row) => {
    const attendanceId = row.attendance_staff_id;
    const attendanceSalary = attendanceId
      ? Number(salaryByAttendanceId.get(attendanceId) || 0)
      : 0;

    if (attendanceSalary <= 0) {
      return row;
    }

    return {
      ...row,
      monthly_salary: attendanceSalary,
    };
  });
}

async function loadAttendanceSalaryMap(attendancePool, attendanceIds) {
  const ids = Array.from(new Set(attendanceIds.filter(Boolean)));

  if (!attendancePool || ids.length === 0) {
    return new Map();
  }

  const result = await attendancePool.query(
    `
    SELECT id, salary
    FROM public.staff
    WHERE id = ANY($1::uuid[])
    `,
    [ids]
  );

  return new Map(result.rows.map((row) => [row.id, Number(row.salary || 0)]));
}

async function applyLiveAttendanceSalaries(staffRows, attendancePool) {
  try {
    const salaryByAttendanceId = await loadAttendanceSalaryMap(
      attendancePool,
      staffRows.map((row) => row.attendance_staff_id)
    );

    return applyAttendanceSalaries(staffRows, salaryByAttendanceId);
  } catch (error) {
    console.error("Attendance salary refresh failed (non-fatal):", error.message);
    return staffRows;
  }
}

module.exports = {
  applyAttendanceSalaries,
  applyLiveAttendanceSalaries,
  loadAttendanceSalaryMap,
};
