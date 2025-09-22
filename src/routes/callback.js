const express = require('express');
const callbackController = require('../controllers/callbackController');
const { verifyCallbackApiKey, verifyRazorpayWebhook } = require('../middleware/authCallbacks');

const router = express.Router();

// Route for affiliate networks to post transaction data
// This endpoint is secured by a simple API key
router.post('/postback', verifyCallbackApiKey, callbackController.handleAffiliatePostback);

// Route for affiliate networks to update transaction status
router.post('/status', verifyCallbackApiKey, callbackController.handleStatusUpdate);

// Route for Razorpay to send webhook events for payouts
router.post('/razorpay', express.raw({ type: 'application/json' }), verifyRazorpayWebhook, callbackController.handleRazorpayWebhook);


module.exports = router;
