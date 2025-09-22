const { v4: uuidv4 } = require('uuid');
const Click = require('../models/Click');
const Retailer = require('../models/Retailer');
const Offer = require('../models/Offer');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.trackClick = catchAsync(async (req, res, next) => {
    const { retailerId, offerId } = req.body;

    if (!retailerId) {
        return next(new AppError('Retailer ID is required', 400));
    }

    const retailer = await Retailer.findById(retailerId);
    if (!retailer || !retailer.isActive) {
        return next(new AppError('Retailer not found or is inactive', 404));
    }

    let targetUrl = retailer.affiliateUrl;
    if (offerId) {
        const offer = await Offer.findById(offerId);
        if (offer && offer.isActive) {
            targetUrl = offer.affiliateUrl;
        }
    }

    const clickId = uuidv4();
    const finalUrl = new URL(targetUrl);
    // Append our unique click ID as a sub-ID. 'subId' is a common parameter name.
    // This may need to be adjusted based on the affiliate network's requirements.
    finalUrl.searchParams.set('subId', clickId); 
    
    const clickData = {
        clickId,
        retailer: retailerId,
        user: req.user ? req.user._id : null,
        offer: offerId || null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    };
    
    await Click.create(clickData);
    
    logger.info(`Click tracked: ${clickId} for retailer ${retailer.name}`);

    res.status(200).json({
        status: 'success',
        data: {
            redirectUrl: finalUrl.href
        }
    });
});

// Admin Function: Get all clicks
exports.getAllClicks = catchAsync(async (req, res, next) => {
    // Basic pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const clicks = await Click.find()
        .populate('user', 'firstName lastName email')
        .populate('retailer', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalClicks = await Click.countDocuments();

    res.status(200).json({
        status: 'success',
        results: clicks.length,
        total: totalClicks,
        data: {
            clicks
        }
    });
});
