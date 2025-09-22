const express = require('express');
const withdrawalController = require('../controllers/withdrawalController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(withdrawalController.getMyWithdrawals)
    .post(withdrawalController.requestWithdrawal);

module.exports = router;
