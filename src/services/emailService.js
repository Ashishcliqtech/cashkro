// FILE: src/services/emailService.js

const SibApiV3Sdk = require('@sendinblue/client');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } = process.env;

if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL || !BREVO_SENDER_NAME) {
    logger.error('Brevo API key or sender details are not configured.');
}

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = BREVO_API_KEY;

/**
 * Sends an OTP email to the user via Brevo.
 * @param {string} to - The recipient's email address.
 * @param {string} otp - The One-Time Password.
 */
const sendOtpEmail = async (to, otp) => {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = "Your SaveMoney Verification Code";
  sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; color: #333;">
      <h2 style="color: #8B5CF6;">Welcome to SaveMoney!</h2>
      <p>Your One-Time Password (OTP) to complete your registration is:</p>
      <h1 style="font-size: 48px; letter-spacing: 10px; margin: 20px 0; color: #7C3AED;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p style="font-size: 12px; color: #888;">If you did not request this, please ignore this email.</p>
    </div>
  `;
  sendSmtpEmail.sender = { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL };
  sendSmtpEmail.to = [{ email: to }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info(`OTP email sent successfully to ${to} via Brevo.`);
  } catch (error) {
    logger.error(`Error sending OTP email to ${to} via Brevo:`, error);
    throw new Error('Could not send OTP email.');
  }
};

module.exports = { sendOtpEmail };