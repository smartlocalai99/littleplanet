import { Pool } from "pg";

function getAttendanceDbUrl() {
  const raw = process.env.ATTENDANCE_DATABASE_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const mode = u.searchParams.get("sslmode");
    if (mode && ["prefer", "require", "verify-ca"].includes(mode)) {
      u.searchParams.set("sslmode", "verify-full");
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export function getAttendancePool() {
  const url = getAttendanceDbUrl();
  if (!url) return null;
  if (!global.attendanceDbPool) {
    global.attendanceDbPool = new Pool({ connectionString: url });
  }
  return global.attendanceDbPool;
}
