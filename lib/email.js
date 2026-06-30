import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set to send email");
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

export async function sendOtpEmail(to, otp) {
  const fromUser = process.env.GMAIL_USER;

  await getTransporter().sendMail({
    from: `"SmartBooks AI" <${fromUser}>`,
    to,
    subject: "Your password reset code",
    text: `Your one-time password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>Use this code to reset your SmartBooks AI password:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 24px 0;">${otp}</p>
        <p style="color: #6b7280; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}
