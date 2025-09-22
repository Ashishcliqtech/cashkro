const express = require('express');
const retailerController = require('../controllers/retailerController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(retailerController.getAllRetailers)
  .post(protect, restrictTo('admin'), retailerController.createRetailer);

router
  .route('/:id')
  .get(retailerController.getRetailer)
  .patch(protect, restrictTo('admin'), retailerController.updateRetailer)
  .delete(protect, restrictTo('admin'), retailerController.deleteRetailer);

module.exports = router;
