const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  frontendUrl: process.env.FRONTEND_URL,
  database: {
    uri: process.env.NODE_ENV === 'test' ? process.env.MONGODB_URI_TEST : process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    cookieExpiresIn: process.env.JWT_COOKIE_EXPIRES_IN,
    refreshTokenExpire: process.env.JWT_REFRESH_TOKEN_EXPIRE_IN_DAYS || 7,
  },
  email: {
    brevoApiKey: process.env.BREVO_API_KEY,
    from: process.env.BREVO_FROM_EMAIL,
    adminEnquiry: process.env.ADMIN_EMAIL_ENQUIRY,
  },
  upstash: {
    redisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
    redisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
  fileUpload: {
    maxSize: process.env.MAX_FILE_SIZE,
    allowedTypes: process.env.ALLOWED_FILE_TYPES.split(','),
  },
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    accountNumber: process.env.RAZORPAY_ACCOUNT_NUMBER,
  },
  cashback: {
    minWithdrawal: process.env.MIN_WITHDRAWAL_AMOUNT,
    commissionRate: process.env.CASHBACK_COMMISSION_RATE,
    defaultPercentage: process.env.DEFAULT_CASHBACK_PERCENTAGE,
  },
  callback: {
    apiKey: process.env.CALLBACK_API_KEY,
  }
};
