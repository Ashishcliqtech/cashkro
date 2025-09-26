// FILE: src/controllers/authController.js

const { supabase } = require('../services/supabase');
const { sendOtpEmail } = require('../services/emailService');
const redisClient = require('../services/redisService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger'); // Import the logger

const OTP_EXPIRATION_SECONDS = 600; // 10 minutes

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.signup = catchAsync(async (req, res, next) => {
  const { email, name, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .single();

  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const otp = generateOTP();
  const redisKey = `signup:${normalizedEmail}`;
  const redisValue = JSON.stringify({ otp, userData: { ...req.body, email: normalizedEmail } });

  logger.debug(`Setting Redis key: ${redisKey} with value: ${redisValue}`);
  await redisClient.set(redisKey, redisValue, { EX: OTP_EXPIRATION_SECONDS });
  await sendOtpEmail(normalizedEmail, otp);

  res.status(200).json({ success: true, message: 'OTP sent to your email.' });
});

exports.verifyOtp = catchAsync(async (req, res, next) => {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const redisKey = `signup:${normalizedEmail}`;
    const storedData = await redisClient.get(redisKey);
    logger.debug(`Data from Redis for key "${redisKey}": ${storedData}`);
    if (!storedData || typeof storedData !== 'string') {
        logger.error(`No signup session found for key: ${redisKey}`);
        return next(new AppError('Invalid or expired signup session. Please try again.', 400));
    }
    let parsedData;
    try {
        parsedData = JSON.parse(storedData);
    } catch (error) {
        logger.error(`Failed to parse Redis data for key ${redisKey}. Raw data: "${storedData}"`);
        return next(new AppError('An internal error occurred during verification. Please try again.', 500));
    }
    const { otp: storedOtp, userData } = parsedData;
    if (storedOtp !== otp || userData.email !== normalizedEmail) {
        return next(new AppError('The OTP you entered is incorrect.', 400));
    }
    const { data: authResponse, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                name: userData.name,
                phone: userData.phone,
                avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.name)}`
            },
        },
    });
    if (signUpError) return next(new AppError(signUpError.message, 500));
    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authResponse.user.id)
        .single();
    if (profileError) return next(new AppError(profileError.message, 500));
    await redisClient.del(redisKey);
    const token = jwt.sign({ id: userProfile.id, role: userProfile.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(201).json({ success: true, user: userProfile, token });
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    const { data: authResponse, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (signInError) return next(new AppError('Invalid email or password.', 401));

    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authResponse.user.id)
        .single();

    if (profileError) return next(new AppError('Could not find user profile.', 500));
    
    const token = jwt.sign({ id: userProfile.id, role: userProfile.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.status(200).json({ success: true, user: userProfile, token });
});