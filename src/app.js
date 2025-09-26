// FILE: src/app.js

const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./middleware/errorHandler');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');

// Initialize Express app
const app = express();

// --- GLOBAL MIDDLEWARES ---
// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting to prevent brute-force attacks from a single IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Data sanitization against XSS attacks
app.use(xss());

// Enable CORS for all routes
app.use(cors());

// --- ROUTES ---
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter); // Add user routes

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;