const Retailer = require('../models/Retailer');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getAllRetailers = factory.getAll(Retailer);
exports.getRetailer = factory.getOne(Retailer, { path: 'offers' }); // Assuming virtual 'offers' population
exports.createRetailer = factory.createOne(Retailer);
exports.updateRetailer = factory.updateOne(Retailer);
exports.deleteRetailer = factory.deleteOne(Retailer);
