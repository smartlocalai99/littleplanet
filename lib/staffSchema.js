async function ensureStaffAttendanceColumn(client) {
  await client.query(`
    ALTER TABLE public.staff
    ADD COLUMN IF NOT EXISTS attendance_staff_id UUID
  `);
}

module.exports = {
  ensureStaffAttendanceColumn,
};
