// FILE: src/controllers/userController.js

const catchAsync = require('../utils/catchAsync');

/**
 * Get the profile of the currently logged-in user.
 * The user object is attached to the request by the `protect` middleware.
 */
exports.getMe = catchAsync(async (req, res, next) => {
  // The user object is available thanks to the protect middleware
  const user = req.user;

  res.status(200).json({
    success: true,
    user,
  });
});