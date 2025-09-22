const Razorpay = require('razorpay');
const logger = require('../utils/logger');

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  logger.error('Razorpay Key ID or Key Secret is not defined in environment variables.');
  // In a real application, you might want to throw an error or exit
  // process.exit(1); 
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = razorpay;
