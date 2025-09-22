const express = require('express');
const transactionController = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', transactionController.getMyTransactions);
router.get('/:id', transactionController.getTransaction);

module.exports = router;
