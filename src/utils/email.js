const Brevo = require('@getbrevo/brevo');
const config = require('../config/config');
const logger = require('./logger');

function getBrevoClient() {
    const client = new Brevo.TransactionalEmailsApi();
    client.authentications.apiKey.apiKey = config.email.brevoApiKey;
    return client;
}

class Email {
    constructor(user, data) {
        this.to = user.email;
        this.name = user.name;
        this.otp = data?.otp;
        this.url = data?.url;
        this.from = config.email.from;
    }

    async send(subject, textContent, htmlContent) {
        const client = getBrevoClient();
        const email = {
            sender: { email: this.from },
            to: [{ email: this.to }],
            subject,
            textContent,
            htmlContent,
        };

        try {
            await client.sendTransacEmail(email);
            logger.info(`✅ Email sent successfully to ${this.to}`);
        } catch (error) {
            logger.error(`❌ Error sending email to ${this.to}: ${error.message}`);
            if (error.response?.body) {
                logger.error(`Brevo Error Response: ${JSON.stringify(error.response.body)}`);
            }
            throw error; // Re-throw error so controller can handle it
        }
    }

    async sendOtp() {
        const subject = 'Your OTP for Account Verification';
        const textContent = `Your One Time Password (OTP) is: ${this.otp}. It is valid for 10 minutes.`;
        const htmlContent = `<div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h2>Cashkro Account Verification</h2>
            <p>Your One Time Password (OTP) is:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${this.otp}</p>
            <p>This code is valid for 10 minutes.</p>
            </div>`;
        await this.send(subject, textContent, htmlContent);
    }

    async sendWelcome() {
        const subject = 'Welcome to the Cashkro Family!';
        const textContent = `Hi ${this.name},\n\nWelcome to Cashkro! We are excited to have you on board. Start earning cashback on your favorite stores now.`;
        const htmlContent = `<div style="font-family: sans-serif; padding: 20px;">
            <h1>Welcome, ${this.name}!</h1>
            <p>We are excited to have you on board. Start earning cashback on your favorite stores now.</p>
            </div>`;
        await this.send(subject, textContent, htmlContent);
    }

    async sendPasswordReset() {
        const subject = 'Your Password Reset OTP (valid for 10 min)';
        const textContent = `Forgot your password? Your One Time Password (OTP) is: ${this.otp}. It is valid for 10 minutes.`;
        const htmlContent = `<div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h2>Cashkro Password Reset</h2>
            <p>Forgot your password? Your One Time Password (OTP) is:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${this.otp}</p>
            <p>This code is valid for 10 minutes.</p>
            </div>`;
        await this.send(subject, textContent, htmlContent);
    }
}

module.exports = Email;
