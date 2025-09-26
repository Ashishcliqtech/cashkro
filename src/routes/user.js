// FILE: src/routes/user.js

const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// This middleware will protect all subsequent routes in this file
router.use(protect);

router.get('/me', userController.getMe);

// Example of an admin-only route you can add later
// router.get('/', restrictTo('admin'), userController.getAllUsers);

module.exports = router;