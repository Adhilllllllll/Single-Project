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

/**
 * Send review assignment email to student and reviewer
 */
exports.sendReviewAssignmentEmail = async ({
  studentEmail,
  studentName,
  reviewerEmail,
  reviewerName,
  advisorName,
  scheduledAt,
  mode,
  meetingLink,
  location,
  week,
}) => {
  try {
    const dateObj = new Date(scheduledAt);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const locationInfo = mode === "online"
      ? `<p><b>Mode:</b> Online</p><p><b>Meeting Link:</b> <a href="${meetingLink}">${meetingLink}</a></p>`
      : `<p><b>Mode:</b> Offline</p><p><b>Location:</b> ${location || "To be announced"}</p>`;

    // Email to Student
    await transporter.sendMail({
      from: `"RMS - Review Management" <${process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: `Review Scheduled - Week ${week}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Review Scheduled</h2>
          </div>
          <div style="padding: 24px; background: #f8fafc;">
            <h3 style="color: #1e293b;">Hello ${studentName},</h3>
            <p style="color: #475569;">Your advisor <b>${advisorName}</b> has scheduled a review for you.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <p><b>📅 Date:</b> ${formattedDate}</p>
              <p><b>⏰ Time:</b> ${formattedTime}</p>
              <p><b>📝 Week:</b> ${week}</p>
              <p><b>👨‍🏫 Reviewer:</b> ${reviewerName}</p>
              ${locationInfo}
            </div>
            
            <p style="color: #64748b; font-size: 14px;">Please be prepared for your review session. Good luck!</p>
          </div>
          <div style="background: #1e293b; padding: 16px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">RMS - Review Management System</p>
          </div>
        </div>
      `,
    });
    console.log("📧 Review email sent to student:", studentEmail);

    // Email to Reviewer
    await transporter.sendMail({
      from: `"RMS - Review Management" <${process.env.SMTP_USER}>`,
      to: reviewerEmail,
      subject: `New Review Assignment - Week ${week}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">New Review Assignment</h2>
          </div>
          <div style="padding: 24px; background: #f8fafc;">
            <h3 style="color: #1e293b;">Hello ${reviewerName},</h3>
            <p style="color: #475569;">You have been assigned a new review by advisor <b>${advisorName}</b>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <p><b>📅 Date:</b> ${formattedDate}</p>
              <p><b>⏰ Time:</b> ${formattedTime}</p>
              <p><b>📝 Week:</b> ${week}</p>
              <p><b>🎓 Student:</b> ${studentName}</p>
              ${locationInfo}
            </div>
            
            <p style="color: #64748b; font-size: 14px;">Please accept or reject this review from your dashboard.</p>
          </div>
          <div style="background: #1e293b; padding: 16px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">RMS - Review Management System</p>
          </div>
        </div>
      `,
    });
    console.log("📧 Review email sent to reviewer:", reviewerEmail);

  } catch (err) {
    console.error("❌ Review assignment email failed:", err.message);
    // Don't throw - email failure shouldn't block review creation
  }
};


