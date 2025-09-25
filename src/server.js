const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./middleware/errorHandler');
const config = require('./config/config');
const logger = require('./utils/logger');

// Routes
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const retailerRouter = require('./routes/retailer');
const offerRouter = require('./routes/offer');
const clickRouter = require('./routes/click');
const transactionRouter = require('./routes/transaction');
const withdrawalRouter = require('./routes/withdrawal');
const callbackRouter = require('./routes/callback');
const adminRouter = require('./routes/admin');

const app = express();

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Development logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Enable CORS
app.use(cors());

// Expose custom headers to client JavaScript
app.use((req, res, next) => {
    res.setHeader(
      'Access-Control-Expose-Headers',
      'x-access-token, x-user-id, x-user-role, x-refresh-token'
    );
    next();
});

// 2) ROUTES
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/retailers', retailerRouter);
app.use('/api/offers', offerRouter);
app.use('/api/clicks', clickRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/withdrawals', withdrawalRouter);
app.use('/api/callback', callbackRouter);
app.use('/api/admin', adminRouter);


app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
