import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

const OTP_TTL_MINUTES = 10;

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function maskEmail(email) {
  const [local, domain] = String(email).split("@");

  if (!domain) {
    return email;
  }

  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { username } = req.body || {};

    if (!username || !String(username).trim()) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }

    const result = await query(
      'SELECT id, email FROM public."Login_accounts" WHERE username = $1 LIMIT 1',
      [String(username).trim()]
    );

    const account = result.rows[0];

    if (!account || !account.email) {
      return res.status(404).json({
        success: false,
        message: "No email is on file for this account. Contact an administrator.",
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await query("DELETE FROM public.password_reset_otps WHERE account_id = $1", [account.id]);
    await query(
      "INSERT INTO public.password_reset_otps (account_id, otp_hash, expires_at) VALUES ($1, $2, $3)",
      [account.id, otpHash, expiresAt]
    );

    await sendOtpEmail(account.email, otp);

    return res.status(200).json({ success: true, maskedEmail: maskEmail(account.email) });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return res.status(500).json({ success: false, message: "Unable to send the reset code. Try again." });
  }
}
