import nodemailer from "nodemailer";

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

// Verify connection configuration
transporter.verify(function (error) {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

export const sendVerificationEmail = async (email: string, token: string) => {
  const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`;
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"FinTrack" <${emailUser}>`,
    to: email,
    subject: "Verify your FinTrack account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #F97316;">Welcome to FinTrack!</h2>
        <p>You're almost there. Please click the button below to verify your email address and activate your account.</p>
        <a href="${verifyUrl}" style="display: inline-block; background-color: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">Verify Email</a>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">If you did not request this email, you can safely ignore it.</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`;
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"FinTrack" <${emailUser}>`,
    to: email,
    subject: "Reset your FinTrack password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #F97316;">Reset Password</h2>
        <p>We received a request to reset your password. Click the button below to choose a new password.</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">Reset Password</a>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">If you did not request this email, you can safely ignore it.</p>
      </div>
    `,
  });
};

export const sendAdminInviteEmail = async (email: string, token: string) => {
  const configuredBaseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!configuredBaseUrl) throw new Error("Application URL is not configured");

  const inviteUrl = new URL("/accept-invite", configuredBaseUrl);
  inviteUrl.searchParams.set("token", token);

  await transporter.sendMail({
    from: `"FinTrack" <${emailUser}>`,
    to: email,
    subject: "You have been invited to FinTrack",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #F97316;">Set up your FinTrack account</h2>
        <p>An administrator invited you to create a FinTrack account. Use the link below to choose your password. This link expires in 24 hours and can only be used once.</p>
        <a href="${inviteUrl.toString()}" style="display: inline-block; background-color: #F97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">Accept invitation</a>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">If you were not expecting this invitation, you can ignore this email.</p>
      </div>
    `,
  });
};
export const send2FACodeEmail = async (email: string, code: string) => {
  await transporter.sendMail({
    from: `"FinTrack" <${emailUser}>`,
    to: email,
    subject: "FinTrack - Your 2-Factor Authentication Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #F97316;">Authentication Code</h2>
        <p>Please use the following 6-digit code to complete your sign-in process:</p>
        <div style="background-color: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="margin: 0; color: #1e293b; letter-spacing: 5px; font-size: 32px;">${code}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">If you did not request this code, please secure your account immediately.</p>
      </div>
    `,
  });
};
