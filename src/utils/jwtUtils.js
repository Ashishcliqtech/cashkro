const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');

const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

const generateRefreshToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

const sendTokenResponse = (user, accessToken, refreshToken, statusCode, res) => {
  if (typeof res.setHeader === 'function') {
    res.setHeader('x-refresh-token', refreshToken);
  } else if (res.headers && typeof res.headers.set === 'function') {
    res.headers.set('x-refresh-token', refreshToken);
  }

  res.status(statusCode).json({
    status: 'success',
    token: accessToken,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  sendTokenResponse,
};
