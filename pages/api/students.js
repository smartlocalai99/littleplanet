import { Pool } from "pg";
import { createPoolOptions } from "@/lib/postgresConfig";

const pool = new Pool(createPoolOptions());

export default async function handler(req, res) {
  if (req.method === "PUT") {
    const studentId = Number(req.query.id || req.body?.id);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ success: false, error: "Valid student id is required" });
    }

    const {
      full_name,
      gender,
      date_of_birth,
      age,
      class: className,
      blood_group,
      nationality,
      religion,
      medium,
    } = req.body || {};

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          UPDATE public.students
          SET full_name = $1,
              gender = $2,
              date_of_birth = $3,
              age = $4,
              class = $5,
              blood_group = $6,
              nationality = $7,
              religion = $8,
              medium = $9
          WHERE id = $10
          RETURNING id, full_name, gender, date_of_birth, age, class, blood_group, nationality, religion, medium, admission_id, student_unique_id, created_at
        `,
        [
          full_name || null,
          gender || null,
          date_of_birth || null,
          age || null,
          className || null,
          blood_group || null,
          nationality || null,
          religion || null,
          medium || null,
          studentId,
        ]
      );

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Student not found" });
      }

      const student = result.rows[0];

      if (student.admission_id) {
        await client.query(
          `
            UPDATE public.admissions
            SET student_name = $1,
                gender = $2,
                date_of_birth = $3,
                age = $4,
                class_applying_for = $5,
                blood_group = $6,
                nationality = $7,
                religion = $8,
                medium = $9
            WHERE id = $10
          `,
          [
            full_name || null,
            gender || null,
            date_of_birth || null,
            age || null,
            className || null,
            blood_group || null,
            nationality || null,
            religion || null,
            medium || null,
            student.admission_id,
          ]
        );
      }

      await client.query("COMMIT");
      return res.status(200).json({ success: true, student });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Students API Error:", err);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  try {
    const { q } = req.query;
    const search = String(q || "").trim();

    let result;
    if (search) {
      result = await pool.query(
        `SELECT s.id, s.full_name, s.class, s.admission_id,
                a.father_name, a.father_mobile, a.mother_mobile
         FROM public.students s
         LEFT JOIN public.admissions a ON a.id = s.admission_id
         WHERE s.full_name ILIKE $1
            OR a.father_name ILIKE $1
            OR a.father_mobile ILIKE $1
            OR a.student_name ILIKE $1
         ORDER BY s.full_name ASC
         LIMIT 20`,
        [`%${search}%`]
      );
      return res.status(200).json({ success: true, students: result.rows });
    }

    result = await pool.query(
      `SELECT id, full_name, gender, date_of_birth, age, class, blood_group, nationality, religion, medium, admission_id, student_unique_id, created_at FROM students ORDER BY id DESC`
    );
    res.status(200).json({ success: true, students: result.rows });
  } catch (err) {
    console.error("Students API Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
