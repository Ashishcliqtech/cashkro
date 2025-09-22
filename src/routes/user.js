const express = require('express');
const userController = require('../controllers/userController');
const { validate, userSchemas } = require('../middleware/validation');

const router = express.Router();

router.get('/me', userController.getMe);
router.patch('/updateMe', validate(userSchemas.updateProfile), userController.updateMe);
router.patch('/changePassword', validate(userSchemas.changePassword), userController.changePassword);

module.exports = router;
