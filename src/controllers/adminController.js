const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const razorpay = require('../config/razorpay');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// User Management
exports.getAllUsers = factory.getAll(User);
exports.updateUserStatus = catchAsync(async (req, res, next) => {
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: req.body.isActive },
        { new: true, runValidators: true }
    );
    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }
    res.status(200).json({ status: 'success', data: { user } });
});


// Withdrawal Management
exports.getAllWithdrawals = factory.getAll(Withdrawal, { path: 'user', select: 'fullName email' });

exports.processWithdrawal = catchAsync(async (req, res, next) => {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    if (!withdrawal || withdrawal.status !== 'pending') {
        return next(new AppError('Withdrawal not found or not pending', 404));
    }

    const { user } = withdrawal;

    // This is a simplified payout flow. In a real app, you would create a Contact and Fund Account first.
    // We assume these details are correct for a direct Payout.
    if (withdrawal.paymentMethod !== 'bank_transfer') {
        return next(new AppError('Only bank transfer payouts are currently supported.', 400));
    }
    
    try {
        // Create Payout with Razorpay
        const payout = await razorpay.payouts.create({
            account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
            fund_account_id: user.razorpayFundAccountId, // You would need a flow to create and store this
            amount: withdrawal.amount * 100, // Amount in paise
            currency: 'INR',
            mode: 'IMPS',
            purpose: 'payout',
            queue_if_low_balance: true,
            notes: {
                withdrawal_id: withdrawal._id.toString(),
                user_email: user.email
            }
        });

        withdrawal.status = 'processing';
        withdrawal.processedDate = new Date();
        withdrawal.externalTransactionId = payout.id;
        await withdrawal.save();
        
        logger.info(`Withdrawal ${withdrawal._id} processed via Razorpay. Payout ID: ${payout.id}`);

        res.status(200).json({ status: 'success', data: { withdrawal } });
    } catch (error) {
        logger.error(`Razorpay payout failed for withdrawal ${withdrawal._id}:`, error);
        return next(new AppError('Razorpay payout creation failed.', 500));
    }
});


exports.failWithdrawal = catchAsync(async (req, res, next) => {
    const { reason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal || withdrawal.status !== 'pending') {
        return next(new AppError('Withdrawal not found or cannot be failed', 404));
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        withdrawal.status = 'failed';
        withdrawal.failedDate = new Date();
        withdrawal.failureReason = reason || 'Manually failed by admin';
        await withdrawal.save({ session });

        // IMPORTANT: Refund the amount to the user's available balance
        await User.findByIdAndUpdate(withdrawal.user, {
            $inc: { 'balance.available': withdrawal.amount }
        }, { session });
        
        await session.commitTransaction();

        logger.info(`Withdrawal ${withdrawal._id} manually failed by admin.`);

        res.status(200).json({ status: 'success', data: { withdrawal } });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});


// Transaction Management
exports.getAllTransactions = factory.getAll(Transaction, { path: 'user retailer', select: 'fullName email name' });

exports.createManualTransaction = catchAsync(async (req, res, next) => {
    // Logic to manually add cashback for a user
    // ...
    res.status(201).json({ status: 'success', message: 'Manual transaction created' });
});
