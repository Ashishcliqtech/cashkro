// FILE: src/middleware/auth.js

const jwt = require('jsonwebtoken');
const { supabase } = require('../services/supabase');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Middleware to protect routes.
 * Verifies JWT and attaches user to the request object.
 */
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token from the authorization header
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Verify the token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3) Check if the user associated with the token still exists
  const { data: currentUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', decoded.id)
    .single();

  if (error || !currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }
  
  // 4) Grant access to the protected route and attach the user to the request
  req.user = currentUser;
  next();
});

/**
 * Middleware to restrict routes to specific roles.
 * Example usage: restrictTo('admin')
 * @param {...string} roles - The roles allowed to access the route.
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};