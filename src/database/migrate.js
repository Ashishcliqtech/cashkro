const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../utils/logger');
const User = require('../models/User');

const migrateAdmin = async () => {
  try {
    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB Connected for migration');

    const adminExists = await User.findOne({ email: config.admin.email });

    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: config.admin.email,
        password: config.admin.password,
        role: 'admin',
        isVerified: true,
        isActive: true,
      });
      logger.info('Admin user created');
    } else {
      logger.info('Admin user already exists');
    }

    mongoose.disconnect();
  } catch (error) {
    logger.error('Error during migration:', error);
    process.exit(1);
  }
};

migrateAdmin();