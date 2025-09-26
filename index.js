// FILE: index.js

const dotenv = require('dotenv');
const logger = require('./src/utils/logger');

// Configure dotenv before any other imports
dotenv.config({ path: './.env' });

const app = require('./src/app');

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  logger.info(`App running on port ${port}...`);
});

// Gracefully handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(`${err.name}: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});