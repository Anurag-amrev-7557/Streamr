const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: `Streamr <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };
  return transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (to, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  const html = `<p>You requested a password reset for your Streamr account.</p>
    <p>Click <a href="${resetUrl}">here</a> to reset your password, or paste this link in your browser:</p>
    <p>${resetUrl}</p>
    <p>If you did not request this, you can ignore this email.</p>`;
  return sendEmail(to, 'Reset your Streamr password', html);
};

const sendVerificationEmail = async (to, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  const html = `<p>Welcome to Streamr!</p>
    <p>Click <a href="${verifyUrl}">here</a> to verify your email address, or paste this link in your browser:</p>
    <p>${verifyUrl}</p>`;
  return sendEmail(to, 'Verify your Streamr email', html);
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
}; 