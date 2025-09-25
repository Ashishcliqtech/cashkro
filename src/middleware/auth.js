const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const redis = require('../utils/redisClient/redis');
const config = require('../config/config');

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }
  
  const isBlacklisted = await redis.get(`blacklist:${token}`);
  if (isBlacklisted) {
      return next(new AppError('Token is blacklisted. Please log in again.', 401));
  }

  const decoded = await promisify(jwt.verify)(token, config.jwt.secret);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  if (!currentUser.isActive) {
      return next(new AppError('Your account has been deactivated.', 401));
  }

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Add optionalAuth middleware for click tracking
exports.optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers['x-access-token']) {
    token = req.headers['x-access-token'];
  }

  if (!token) {
    return next(); // No user, but not an error
  }

  try {
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return next();
    }
    const decoded = await promisify(jwt.verify)(token, config.jwt.secret);
    const currentUser = await User.findById(decoded.id);
    if (currentUser && currentUser.isActive) {
      req.user = currentUser;
      res.locals.user = currentUser;
    }
  } catch (err) {
    // Ignore token errors for optional auth
  }
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};
