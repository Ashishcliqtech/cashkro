// FILE: src/routes/auth.js

const express = require('express');
const authController = require('../controllers/authController');
const { validateSignup, validateLogin, validateVerifyOtp } = require('../middleware/validation');

const router = express.Router();

router.post('/signup', validateSignup, authController.signup);
router.post('/verify-otp', validateVerifyOtp, authController.verifyOtp); // This now correctly points to the updated verifyOtp function
router.post('/login', validateLogin, authController.login);

module.exports = router;