const crypto = require('crypto');
const AppError = require('../utils/appError');

// Simple API Key verification for affiliate postbacks
exports.verifyCallbackApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.CALLBACK_API_KEY) {
        return next();
    }
    return next(new AppError('Unauthorized', 401));
};

// Middleware to verify Razorpay webhook signature
exports.verifyRazorpayWebhook = (req, res, next) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature) {
        return next(new AppError('Razorpay signature missing', 400));
    }

    try {
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(req.rawBody); // req.rawBody is provided by express.raw() middleware
        const digest = shasum.digest('hex');

        if (digest === signature) {
            return next();
        } else {
            return next(new AppError('Invalid Razorpay signature', 403));
        }
    } catch (error) {
        return next(new AppError('Error verifying Razorpay signature', 500));
    }
};
