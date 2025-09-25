const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../utils/logger');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB Connected for seeding');

    await User.deleteMany({ role: 'admin' });

    await User.create({
      name: 'Admin',
      email: config.admin.email,
      password: config.admin.password,
      role: 'admin',
      isVerified: true,
      isActive: true,
    });
    logger.info('Admin user seeded');

    mongoose.disconnect();
  } catch (error) {
    logger.error('Error during seeding:', error);
    process.exit(1);
  }
};

seedAdmin();