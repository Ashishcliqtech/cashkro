// FILE: src/services/redisService.js

const { Redis } = require('@upstash/redis');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const { UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN } = process.env;

if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) {
  logger.error("Upstash Redis credentials are not defined. OTP and session functionality will not work.");
  // Exit gracefully if Redis is essential for the app to run
  process.exit(1);
}

const redisClient = new Redis({
  url: UPSTASH_REDIS_URL,
  token: UPSTASH_REDIS_TOKEN,
});

logger.info('Upstash Redis client configured.');

module.exports = redisClient;