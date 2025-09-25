const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const {
  validateSignup,
  validateLogin,
  validateVerifyOtp,
  validateSendOtp,
  resetPasswordDto,
  validateForgotOtp
} = require('../middleware/validation');

const router = express.Router();

router.post('/signup', validateSignup, authController.signup);
router.post('/verify-otp', validateVerifyOtp, authController.verifyOtp);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authMiddleware.protect, authController.logout);

router.post('/forgot-password', validateSendOtp, authController.forgotPassword);
router.post('/verify-forgot-otp', validateForgotOtp, authController.verifyForgotOtp);
router.patch('/reset-password', resetPasswordDto, authController.resetPassword);

router.get('/refresh-token', authController.refreshAccessToken);

router.post('/resend-otp', validateSendOtp, authController.resendOtp);


module.exports = router;

