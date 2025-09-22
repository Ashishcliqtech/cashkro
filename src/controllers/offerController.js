const Offer = require('../models/Offer');
const factory = require('./handlerFactory');

exports.getAllOffers = factory.getAll(Offer);
exports.getOffer = factory.getOne(Offer);
exports.createOffer = factory.createOne(Offer);
exports.updateOffer = factory.updateOne(Offer);
exports.deleteOffer = factory.deleteOne(Offer);
