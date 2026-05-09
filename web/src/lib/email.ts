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

export const sendVerificationEmail = async (email: string, token: string) => {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

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
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

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
