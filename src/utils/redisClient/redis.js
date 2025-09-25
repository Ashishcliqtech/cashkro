const { Redis } = require('@upstash/redis');
const config = require('../../config/config');

const redis = new Redis({
  url: config.upstash.redisRestUrl,
  token: config.upstash.redisRestToken,
});

module.exports = redis;
