const express = require('express');
const adminController = require('../controllers/adminController');

const router = express.Router();

// User Management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);

// Withdrawal Management
router.get('/withdrawals', adminController.getAllWithdrawals);
router.post('/withdrawals/:id/process', adminController.processWithdrawal);
router.post('/withdrawals/:id/fail', adminController.failWithdrawal);

// Transaction Management
router.get('/transactions', adminController.getAllTransactions);
router.post('/transactions/manual', adminController.createManualTransaction);

module.exports = router;
