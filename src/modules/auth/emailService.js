const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config()

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // MUST be false for 587
  auth: {
    user: process.env.SMTP_USER, // your gmail
    pass: process.env.SMTP_PASS, // APP PASSWORD
  },
});

/**
 * Send user credentials email
 */
exports.sendUserCredentials = async (toEmail, name, tempPassword) => {
  try {
    console.log(toEmail, name, tempPassword);
    await transporter.sendMail({
      from: `"RMS Admin" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: "Your RMS Account Login Credentials",
      html: `
        <h3>Hello ${name},</h3>
        <p>Your account has been created by the admin.</p>

        <p><b>Email:</b> ${toEmail}</p>
        <p><b>Temporary Password:</b> ${tempPassword}</p>

        <p>
          This password will expire in <b>3 days</b>.<br/>
          You must change this password when you log in for the first time.
        </p>

        <br/>
        <p>Regards,<br/>RMS Team</p>
      `,
    });

    console.log("📧 User email sent:", toEmail);
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    throw new Error("Email service failed");
  }
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (toEmail, name, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"RMS Admin" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: "Password Reset Request - RMS",
      html: `
        <h3>Hello ${name},</h3>
        <p>You requested to reset your password.</p>

        <p>Click the link below to reset your password:</p>
        <p>
          <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Reset Password
          </a>
        </p>

        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          This link will expire in <b>1 hour</b>.<br/>
          If you did not request this, please ignore this email.
        </p>

        <br/>
        <p>Regards,<br/>RMS Team</p>
      `,
    });

    console.log("📧 Password reset email sent:", toEmail);
  } catch (err) {
    console.error("❌ Password reset email failed:", err.message);
    throw new Error("Email service failed");
  }
};

