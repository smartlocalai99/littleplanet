import { Pool } from "pg";
import { createPoolOptions } from "@/lib/postgresConfig";
import { getAttendancePool } from "@/lib/attendanceDb";

const pool =
  global.pgPool ||
  new Pool(createPoolOptions({
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  }));

if (!global.pgPool) {
  global.pgPool = pool;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await pool.query(`
        SELECT
          id,
          staff_code,
          full_name,
          gender,
          mobile,
          email,
          staff_type,
          designation,
          department,
          subject,
          classes_handling,
          qualification,
          experience_years,
          joining_date,
          employment_type,
          salary_type,
          monthly_salary,
          work_status,
          photo_url,
          created_at
        FROM public.staff
        ORDER BY id DESC
      `);

      return res.status(200).json({
        success: true,
        staff: result.rows,
      });
    }

    if (req.method === "POST") {
      const {
        staff_code,
        full_name,
        gender,
        date_of_birth,
        age,
        blood_group,
        mobile,
        alternate_mobile,
        email,
        address,
        aadhar_last4,
        pan_number,
        photo_url,
        staff_type,
        designation,
        department,
        subject,
        classes_handling,
        qualification,
        experience_years,
        joining_date,
        employment_type,
        salary_type,
        monthly_salary,
        work_status,
        bank_account_name,
        bank_name,
        bank_branch,
        bank_account_number,
        ifsc_code,
        upi_id,
        has_login_access,
        login_account_id,
        emergency_contact_name,
        emergency_contact_mobile,
        notes,
      } = req.body;

      if (!full_name) {
        return res.status(400).json({
          success: false,
          error: "Staff full name is required",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO public.staff (
          staff_code,
          full_name,
          gender,
          date_of_birth,
          age,
          blood_group,
          mobile,
          alternate_mobile,
          email,
          address,
          aadhar_last4,
          pan_number,
          photo_url,
          staff_type,
          designation,
          department,
          subject,
          classes_handling,
          qualification,
          experience_years,
          joining_date,
          employment_type,
          salary_type,
          monthly_salary,
          work_status,
          bank_account_name,
          bank_name,
          bank_branch,
          bank_account_number,
          ifsc_code,
          upi_id,
          has_login_access,
          login_account_id,
          emergency_contact_name,
          emergency_contact_mobile,
          notes
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
          $31,$32,$33,$34,$35,$36
        )
        RETURNING *
        `,
        [
          staff_code || null,
          full_name,
          gender || null,
          date_of_birth || null,
          age || null,
          blood_group || null,
          mobile || null,
          alternate_mobile || null,
          email || null,
          address || null,
          aadhar_last4 || null,
          pan_number || null,
          photo_url || null,
          staff_type || "Teaching",
          designation || null,
          department || null,
          subject || null,
          classes_handling || null,
          qualification || null,
          experience_years || null,
          joining_date || null,
          employment_type || "Permanent",
          salary_type || "Monthly",
          monthly_salary || 0,
          work_status || "Active",
          bank_account_name || null,
          bank_name || null,
          bank_branch || null,
          bank_account_number || null,
          ifsc_code || null,
          upi_id || null,
          has_login_access || false,
          login_account_id || null,
          emergency_contact_name || null,
          emergency_contact_mobile || null,
          notes || null,
        ]
      );

      const newStaff = result.rows[0];

      // Mirror to attendance DB (non-fatal if it fails)
      try {
        const attendancePool = getAttendancePool();
        if (attendancePool) {
          // Ensure school DB has attendance_staff_id column
          await pool.query(`ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS attendance_staff_id UUID`);

          const teacherId = newStaff.staff_code || `T-${newStaff.id}`;
          const attResult = await attendancePool.query(
            `INSERT INTO staff (teacher_id, full_name, subject, salary, is_active)
             VALUES ($1, $2, $3, $4, true)
             ON CONFLICT (teacher_id) DO UPDATE SET full_name = EXCLUDED.full_name, salary = EXCLUDED.salary
             RETURNING id`,
            [teacherId, full_name, subject || "Other", monthly_salary || 0]
          );
          if (attResult.rows[0]?.id) {
            await pool.query(
              `UPDATE public.staff SET attendance_staff_id = $1 WHERE id = $2`,
              [attResult.rows[0].id, newStaff.id]
            );
            newStaff.attendance_staff_id = attResult.rows[0].id;
          }
        }
      } catch (syncErr) {
        console.error("Attendance DB mirror failed (non-fatal):", syncErr.message);
      }

      return res.status(201).json({
        success: true,
        staff: newStaff,
      });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Staff id is required",
        });
      }

      // Better than hard delete: make staff inactive
      const result = await pool.query(
        `
        UPDATE public.staff
        SET 
          work_status = 'Inactive',
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name, work_status
        `,
        [Number(id)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Staff not found",
        });
      }

      return res.status(200).json({
        success: true,
        staff: result.rows[0],
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  } catch (err) {
    console.error("Staff API Error:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
