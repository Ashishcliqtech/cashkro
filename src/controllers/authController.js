const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { generateAccessToken, generateRefreshToken, sendTokenResponse, verifyAccessToken } = require('../utils/jwtUtils');
const Email = require('../utils/email');
const redis = require('../utils/redisClient/redis');
const config = require('../config/config');

// Helper function
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Function to sign and send tokens
const createSendToken = (user, statusCode, req, res) => {
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken();

    user.refreshToken = refreshToken;
    user.refreshTokenExpires = Date.now() + config.jwt.refreshTokenExpireMs;
    user.lastLogin = Date.now();
    
    sendTokenResponse(user, accessToken, refreshToken, statusCode, res);
};

exports.signup = catchAsync(async (req, res, next) => {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        if (!existingUser.isVerified) {
            return next(new AppError('Please verify your email to activate your account.', 400));
        }
        return next(new AppError('Account already registered. Please login.', 400));
    }

    const otp = generateOTP();
    const redisKey = `signup:${email.toLowerCase()}`;
    const existingOtp = await redis.get(redisKey);

    if (existingOtp) {
        return next(new AppError('OTP already sent. Please check your email.', 400));
    }

    const redisData = { name, email, password, otp };

    try {
        await new Email({ email, name }, { otp }).sendOtp();
        await redis.set(redisKey, JSON.stringify(redisData), { EX: 600 }); // Expires in 10 minutes
        res.status(201).json({
            status: 'success',
            message: 'OTP sent to your email. Please verify.'
        });
    } catch (err) {
        // Improved error logging for debugging
        console.error('Email send error:', err);
        return next(new AppError('There was an error sending the email. Please try again later.', 500));
    }
});

exports.verifyOtp = catchAsync(async (req, res, next) => {
    const { email, otp } = req.body;
    const redisKey = `signup:${email.toLowerCase()}`;
    const userDataJson = await redis.get(redisKey);

    if (!userDataJson) {
        return next(new AppError('Signup session expired or invalid. Please try signing up again.', 400));
    }

    let parsedUserData;
    if (typeof userDataJson === 'string') {
        try {
            parsedUserData = JSON.parse(userDataJson);
        } catch (e) {
            return next(new AppError('Corrupted OTP session data. Please try again.', 500));
        }
    } else {
        parsedUserData = userDataJson;
    }

    if (parsedUserData.otp !== otp) {
        return next(new AppError('Invalid OTP', 400));
    }

    const newUser = await User.create({
        name: parsedUserData.name,
        email: parsedUserData.email,
        password: parsedUserData.password,
        isVerified: true,
        isActive: true,
    });
    
    await newUser.save({validateBeforeSave: false});
    await redis.del(redisKey);
    
    createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        return next(new AppError('Incorrect email or password', 401));
    }
    
    if (!user.isVerified) {
      return next(new AppError('Please verify your email to login.', 403));
    }

    if (!user.isActive) {
        return next(new AppError('Your account is deactivated. Please contact support.', 401));
    }

    createSendToken(user, 200, req, res);
});

exports.logout = catchAsync(async (req, res, next) => {
    const accessToken = req.headers.authorization?.split(" ")[1] || req.headers["x-access-token"];
    const refreshToken = req.headers["x-refresh-token"];

    if (accessToken) {
      try {
        const decoded = verifyAccessToken(accessToken);
        if (decoded && decoded.exp) {
          const expiresInSeconds = decoded.exp - Math.floor(Date.now() / 1000);
          if (expiresInSeconds > 0) {
            await redis.set(`blacklist:${accessToken}`, "true", { EX: expiresInSeconds });
          }
        }
      } catch (err) {
        // Ignore errors for expired tokens, etc.
      }
    }

    if (refreshToken) {
        const user = await User.findOne({ refreshToken });
        if (user) {
            user.refreshToken = undefined;
            user.refreshTokenExpires = undefined;
            await user.save({ validateBeforeSave: false });
        }
    }

    res.status(200).json({ status: 'success', message: 'Logout successful' });
});

exports.refreshAccessToken = catchAsync(async (req, res, next) => {
    const refreshToken = req.headers["x-refresh-token"];

    if (!refreshToken) {
        return next(new AppError("No refresh token provided. Please log in again.", 401));
    }

    const user = await User.findOne({ 
        refreshToken,
        refreshTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
        return next(new AppError("Invalid or expired refresh token. Please log in again.", 401));
    }

    if (!user.isActive) {
        return next(new AppError("Account deactivated.", 401));
    }

    createSendToken(user, 200, req, res);
});


exports.forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return next(new AppError(`There is no user with email address ${email}.`, 404));
    }

    const otp = generateOTP();
    const redisKey = `forgot:${email.toLowerCase()}`;
    await redis.set(redisKey, JSON.stringify({ otp }), { EX: 600 }); // 10 minute expiry

    try {
        await new Email(user, { otp }).sendPasswordReset();
        res.status(200).json({
            status: 'success',
            message: 'OTP sent to your email for password reset.'
        });
    } catch (err) {
        await redis.del(redisKey);
        return next(new AppError('There was an error sending the email. Please try again later.', 500));
    }
});

exports.resendOtp = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return next(new AppError("No account found with this email", 404));
    }
    
    if (user.isVerified) {
        return next(new AppError("This account is already verified.", 400));
    }

    const otp = generateOTP();
    // Use the same redis key as signup to overwrite any existing OTP
    const redisKey = `signup:${email.toLowerCase()}`;
    const redisData = { name: user.name, email: user.email, password: "NOT_STORED_ON_RESEND", otp };
    
    await redis.set(redisKey, JSON.stringify(redisData), { EX: 600 }); // Expires in 10 minutes

    try {
        await new Email({ email: user.email, name: user.name }, { otp }).sendOtp();
        res.status(200).json({
            status: 'success',
            message: 'A new OTP has been sent to your email.'
        });
    } catch (err) {
        await redis.del(redisKey);
        return next(new AppError('There was an error sending the email. Please try again later.', 500));
    }
});


exports.verifyForgotOtp = catchAsync(async (req, res, next) => {
    const { email, otp } = req.body;
    const redisKey = `forgot:${email.toLowerCase()}`;
    const redisDataJson = await redis.get(redisKey);

    if (!redisDataJson) {
        return next(new AppError("OTP expired or invalid", 400));
    }

    let parsed;
    if (typeof redisDataJson === 'string') {
        try {
            parsed = JSON.parse(redisDataJson);
        } catch (e) {
            return next(new AppError('Corrupted OTP session data. Please try again.', 500));
        }
    } else {
        parsed = redisDataJson;
    }

    if (parsed.otp !== otp) {
        return next(new AppError("Invalid OTP", 400));
    }

    // Mark as verified for the next step (resetPassword)
    await redis.set(`verified:${email.toLowerCase()}`, "true", { EX: 600 }); 

    res.status(200).json({
        status: 'success',
        message: 'OTP verified. You may now reset your password.'
    });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    const { email, newPassword, confirmPassword } = req.body;
    const verifiedKey = `verified:${email.toLowerCase()}`;
    const isVerified = await redis.get(verifiedKey);

    if (!isVerified) {
        return next(new AppError("OTP not verified or session expired. Please try again.", 403));
    }
    
    if (newPassword !== confirmPassword) {
      return next(new AppError("Passwords do not match", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    user.password = newPassword;
    await user.save();

    // Clean up redis keys
    await redis.del(verifiedKey);
    await redis.del(`forgot:${email.toLowerCase()}`);

    createSendToken(user, 200, req, res);
});

exports.changePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await user.comparePassword(req.body.currentPassword))) {
        return next(new AppError('Your current password is wrong', 401));
    }
    
    // 3) If so, update password
    user.password = req.body.newPassword;
    await user.save();

    // 4) Log user in, send JWT
    createSendToken(user, 200, req, res);
});

