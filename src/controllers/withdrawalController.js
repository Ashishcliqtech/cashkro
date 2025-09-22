const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const razorpay = require('../config/razorpay');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

exports.requestWithdrawal = catchAsync(async (req, res, next) => {
    const { amount, paymentMethod, paymentDetails } = req.body;
    const user = req.user;

    if (amount > user.balance.available) {
        return next(new AppError('Insufficient available balance.', 400));
    }
    
    const minAmount = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT) || 10;
    if (amount < minAmount) {
        return next(new AppError(`Minimum withdrawal amount is $${minAmount}.`, 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Deduct amount from user's available balance
        await User.findByIdAndUpdate(user.id, {
            $inc: { 'balance.available': -amount }
        }, { session });

        // Create withdrawal request
        const withdrawal = await Withdrawal.create([{
            user: user.id,
            amount,
            paymentMethod,
            paymentDetails,
            status: 'pending'
        }], { session });

        await session.commitTransaction();

        logger.info(`Withdrawal request for $${amount} created by user ${user.email}`);

        res.status(201).json({
            status: 'success',
            data: {
                withdrawal: withdrawal[0]
            }
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error creating withdrawal for user ${user.email}:`, error);
        throw error;
    } finally {
        session.endSession();
    }
});

exports.getMyWithdrawals = catchAsync(async (req, res, next) => {
    const withdrawals = await Withdrawal.find({ user: req.user.id }).sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: withdrawals.length,
        data: {
            withdrawals
        }
    });
});
