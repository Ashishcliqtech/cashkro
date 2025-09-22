const express = require('express');
const offerController = require('../controllers/offerController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(offerController.getAllOffers)
  .post(protect, restrictTo('admin'), offerController.createOffer);

router
  .route('/:id')
  .get(offerController.getOffer)
  .patch(protect, restrictTo('admin'), offerController.updateOffer)
  .delete(protect, restrictTo('admin'), offerController.deleteOffer);

module.exports = router;
