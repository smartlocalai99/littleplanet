import { Pool } from "pg";
import { createPoolOptions } from "@/lib/postgresConfig";
import { getAttendancePool } from "@/lib/attendanceDb";

const pool =
  global.pgPool ||
  new Pool(createPoolOptions({ ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false }));
if (!global.pgPool) global.pgPool = pool;

async function ensureAttendanceStaffIdColumn(client) {
  await client.query(`
    ALTER TABLE public.staff
    ADD COLUMN IF NOT EXISTS attendance_staff_id UUID
  `);
}

export default async function handler(req, res) {
  const attendancePool = getAttendancePool();
  if (!attendancePool) {
    return res.status(503).json({ success: false, error: "Attendance database not configured (ATTENDANCE_DATABASE_URL missing)" });
  }

  try {
    // GET — list all attendance DB staff, mark which are already synced
    if (req.method === "GET") {
      const [attStaff, schoolStaff] = await Promise.all([
        attendancePool.query(`
          SELECT id, teacher_id, full_name, subject, salary, is_active, created_at
          FROM staff
          WHERE is_active = true
          ORDER BY teacher_id ASC
        `),
        pool.query(`SELECT attendance_staff_id FROM public.staff WHERE attendance_staff_id IS NOT NULL`),
      ]);

      const syncedUuids = new Set(schoolStaff.rows.map((r) => r.attendance_staff_id));

      const staff = attStaff.rows.map((s) => ({
        ...s,
        already_synced: syncedUuids.has(s.id),
      }));

      return res.status(200).json({ success: true, staff });
    }

    // POST — import one or all staff from attendance DB into school DB
    if (req.method === "POST") {
      const { ids } = req.body; // array of attendance-DB UUIDs to import

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: "ids array is required" });
      }

      const attStaff = await attendancePool.query(
        `SELECT id, teacher_id, full_name, subject, salary FROM staff WHERE id = ANY($1::uuid[])`,
        [ids]
      );

      const client = await pool.connect();
      let created = 0;
      let skipped = 0;

      try {
        await client.query("BEGIN");
        await ensureAttendanceStaffIdColumn(client);

        for (const s of attStaff.rows) {
          // Skip if already synced
          const existing = await client.query(
            `SELECT id FROM public.staff WHERE attendance_staff_id = $1 OR LOWER(TRIM(full_name)) = LOWER(TRIM($2)) LIMIT 1`,
            [s.id, s.full_name]
          );

          if (existing.rows.length > 0) {
            // Just ensure attendance_staff_id is linked
            await client.query(
              `UPDATE public.staff SET attendance_staff_id = $1 WHERE id = $2`,
              [s.id, existing.rows[0].id]
            );
            skipped++;
            continue;
          }

          await client.query(
            `
            INSERT INTO public.staff (
              staff_code, full_name, staff_type, designation,
              subject, salary_type, monthly_salary, work_status,
              employment_type, attendance_staff_id, notes
            ) VALUES ($1,$2,'Teaching','Teacher',$3,'Monthly',$4,'Active','Permanent',$5,$6)
            `,
            [
              s.teacher_id,
              s.full_name,
              s.subject || "Other",
              Number(s.salary) || 0,
              s.id,
              `Synced from attendance system (${s.teacher_id})`,
            ]
          );
          created++;
        }

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }

      return res.status(200).json({ success: true, created, skipped });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Staff sync error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
