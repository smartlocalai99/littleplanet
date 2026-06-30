import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

const MAX_ATTEMPTS = 5;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { username, otp, newPassword } = req.body || {};

    if (!username || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (String(newPassword).length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters" });
    }

    const accountResult = await query(
      'SELECT id FROM public."Login_accounts" WHERE username = $1 LIMIT 1',
      [String(username).trim()]
    );
    const account = accountResult.rows[0];

    if (!account) {
      return res.status(404).json({ success: false, message: "Invalid request" });
    }

    const otpResult = await query(
      `SELECT id, otp_hash, expires_at, used_at, attempts
       FROM public.password_reset_otps
       WHERE account_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [account.id]
    );
    const record = otpResult.rows[0];

    if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: "Code expired. Request a new one." });
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      return res.status(400).json({ success: false, message: "Too many incorrect attempts. Request a new code." });
    }

    const matches = await bcrypt.compare(String(otp), record.otp_hash);

    if (!matches) {
      await query("UPDATE public.password_reset_otps SET attempts = attempts + 1 WHERE id = $1", [record.id]);
      return res.status(400).json({ success: false, message: "Incorrect code" });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 12);

    await query('UPDATE public."Login_accounts" SET password = $1 WHERE id = $2', [hashedPassword, account.id]);
    await query("UPDATE public.password_reset_otps SET used_at = now() WHERE id = $1", [record.id]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Reset password API error:", error);
    return res.status(500).json({ success: false, message: "Unable to reset password. Try again." });
  }
}
