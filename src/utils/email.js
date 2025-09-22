const nodemailer = require('nodemailer');
const logger = require('./logger');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    this.from = process.env.EMAIL_FROM;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Production email service (e.g., SendGrid, Mailgun)
      return nodemailer.createTransporter({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    // Development email service
    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(subject, html) {
    try {
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
      };

      await this.newTransport().sendMail(mailOptions);
      logger.info(`Email sent to ${this.to}: ${subject}`);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new Error('There was an error sending the email. Try again later.');
    }
  }

  async sendWelcome() {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Cashback Platform!</h2>
        <p>Hi ${this.firstName},</p>
        <p>Welcome to our cashback platform! We're excited to have you on board.</p>
        <p>To get started, please verify your email address by clicking the button below:</p>
        <a href="${this.url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p><a href="${this.url}">${this.url}</a></p>
        <p>Thank you for joining us!</p>
        <p>Best regards,<br>The Cashback Platform Team</p>
      </div>
    `;
    
    await this.send('Welcome to Cashback Platform!', html);
  }

  async sendPasswordReset() {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${this.firstName},</p>
        <p>You requested a password reset for your account. Click the button below to reset your password:</p>
        <a href="${this.url}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p><a href="${this.url}">${this.url}</a></p>
        <p>This link will expire in 10 minutes for security reasons.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <p>Best regards,<br>The Cashback Platform Team</p>
      </div>
    `;

    await this.send('Password Reset Request', html);
  }

  async sendEmailVerification() {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Hi ${this.firstName},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${this.url}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p><a href="${this.url}">${this.url}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The Cashback Platform Team</p>
      </div>
    `;

    await this.send('Verify Your Email Address', html);
  }

  async sendCashbackNotification(amount, retailer) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Cashback Earned!</h2>
        <p>Hi ${this.firstName},</p>
        <p>Great news! You've earned cashback from your recent purchase.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0; color: #28a745;">$${amount.toFixed(2)} Cashback Earned</h3>
          <p style="margin: 10px 0 0 0;">From: ${retailer}</p>
        </div>
        <p>Your cashback will be available for withdrawal once the retailer confirms your purchase.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
        <p>Thank you for using our platform!</p>
        <p>Best regards,<br>The Cashback Platform Team</p>
      </div>
    `;

    await this.send('Cashback Earned!', html);
  }

  async sendWithdrawalNotification(amount, status) {
    const statusMessages = {
      processing: 'Your withdrawal request is being processed.',
      completed: 'Your withdrawal has been completed successfully!',
      cancelled: 'Your withdrawal request has been cancelled.',
      failed: 'Your withdrawal request has failed. Please try again or contact support.'
    };

    const statusColors = {
      processing: '#ffc107',
      completed: '#28a745',
      cancelled: '#6c757d',
      failed: '#dc3545'
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Withdrawal Update</h2>
        <p>Hi ${this.firstName},</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0; color: ${statusColors[status]};">$${amount.toFixed(2)} Withdrawal</h3>
          <p style="margin: 10px 0 0 0;">Status: <strong style="color: ${statusColors[status]};">${status.toUpperCase()}</strong></p>
        </div>
        <p>${statusMessages[status]}</p>
        <a href="${process.env.FRONTEND_URL}/withdrawals" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Withdrawals</a>
        <p>Best regards,<br>The Cashback Platform Team</p>
      </div>
    `;

    await this.send('Withdrawal Update', html);
  }
}

module.exports = Email;