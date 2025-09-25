const app = require('./src/server');
const logger = require('./src/utils/logger');
const config = require('./src/config/config');
const connectDB = require('./src/config/database');

// Connect to database
connectDB();

const port = config.port || 3000;
const server = app.listen(port, () => {
  logger.info(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(`${err.name}: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
