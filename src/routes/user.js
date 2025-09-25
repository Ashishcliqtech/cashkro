const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validateUpdateMe, validateChangePassword } = require('../middleware/validation');

const router = express.Router();

// All routes below are protected for logged-in users
router.use(authMiddleware.protect);

router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', validateUpdateMe, userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

router.patch(
    '/updateMyPassword',
    validateChangePassword,
    authController.changePassword
);


// Routes below are restricted to admin users only
router.use(authMiddleware.restrictTo('admin'));

router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);

router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;

