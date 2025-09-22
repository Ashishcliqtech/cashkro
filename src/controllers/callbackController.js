const User = require('../models/User');
const Click = require('../models/Click');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Handles new transaction notifications from affiliate networks
exports.handleAffiliatePostback = catchAsync(async (req, res, next) => {
    const { clickId, orderId, saleAmount, commission } = req.body;

    if (!clickId || !orderId || !saleAmount || !commission) {
        return next(new AppError('Missing required fields in postback', 400));
    }

    const click = await Click.findOne({ clickId });
    if (!click || !click.user) {
        logger.warn(`Postback received for untracked or anonymous clickId: ${clickId}`);
        // We still send a 200 OK so the network doesn't keep retrying.
        return res.status(200).json({ status: 'success', message: 'Postback received but not processed (no user).' });
    }

    // Prevent duplicate transactions for the same orderId
    const existingTransaction = await Transaction.findOne({ orderId });
    if (existingTransaction) {
        logger.warn(`Duplicate transaction attempt for orderId: ${orderId}`);
        return res.status(200).json({ status: 'success', message: 'Duplicate transaction.' });
    }

    // Calculate cashback amount (example: 50% of the commission goes to the user)
    const cashbackAmount = parseFloat(commission) * 0.5;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const transaction = await Transaction.create([{
            user: click.user,
            retailer: click.retailer,
            offer: click.offer,
            orderId,
            amount: parseFloat(saleAmount),
            commissionAmount: parseFloat(commission),
            cashbackAmount,
            clickId,
            status: 'pending',
            webhookData: req.body
        }], { session });

        await User.findByIdAndUpdate(click.user, {
            $inc: { 'balance.pending': cashbackAmount }
        }, { session });
        
        await Click.updateOne({ _id: click._id }, { isConverted: true, convertedAt: new Date(), transaction: transaction[0]._id }, { session });

        await session.commitTransaction();
        logger.info(`Transaction processed for orderId: ${orderId}, User: ${click.user}`);

        res.status(200).json({ status: 'success', message: 'Transaction processed' });
    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error processing postback for clickId ${clickId}:`, error);
        throw error; // Let global error handler catch it
    } finally {
        session.endSession();
    }
});

// Handles transaction status updates (e.g., confirmed, rejected)
exports.handleStatusUpdate = catchAsync(async (req, res, next) => {
    const { orderId, status } = req.body; // Expecting status like 'confirmed' or 'rejected'

    if (!orderId || !status) {
        return next(new AppError('Missing orderId or status', 400));
    }

    const transaction = await Transaction.findOne({ orderId });
    if (!transaction || transaction.status !== 'pending') {
        logger.warn(`Status update for non-pending or non-existent orderId: ${orderId}`);
        return res.status(200).json({ status: 'success', message: 'Update ignored.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        let userUpdate = {};
        if (status === 'confirmed') {
            transaction.status = 'confirmed';
            transaction.confirmedDate = new Date();
            userUpdate = {
                $inc: { 
                    'balance.pending': -transaction.cashbackAmount,
                    'balance.available': transaction.cashbackAmount,
                }
            };
        } else if (status === 'rejected') {
            transaction.status = 'rejected';
            transaction.rejectedDate = new Date();
            userUpdate = {
                $inc: { 'balance.pending': -transaction.cashbackAmount }
            };
        } else {
            return res.status(200).json({ status: 'success', message: 'Status not updated.' });
        }
        
        await transaction.save({ session });
        await User.findByIdAndUpdate(transaction.user, userUpdate, { session });
        
        await session.commitTransaction();
        logger.info(`Status updated to ${status} for orderId: ${orderId}`);
        
        res.status(200).json({ status: 'success', message: 'Status updated' });

    } catch (error) {
        await session.abortTransaction();
        logger.error(`Error updating status for orderId ${orderId}:`, error);
        throw error;
    } finally {
        session.endSession();
    }
});

// Handles webhooks from Razorpay for payout status updates
exports.handleRazorpayWebhook = catchAsync(async (req, res) => {
    const event = req.body;
    const withdrawalId = event.payload.payout.entity.notes.withdrawal_id;

    if (!withdrawalId) {
        logger.warn('Razorpay webhook received without withdrawal_id in notes');
        return res.status(200).send('OK');
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
        logger.error(`Withdrawal not found for Razorpay webhook: ${withdrawalId}`);
        return res.status(200).send('OK');
    }

    const eventType = event.event;
    
    if (eventType === 'payout.processed') {
        withdrawal.status = 'completed';
        withdrawal.completedDate = new Date();
        withdrawal.externalTransactionId = event.payload.payout.entity.id;
    } else if (eventType === 'payout.failed' || eventType === 'payout.reversed') {
        withdrawal.status = 'failed';
        withdrawal.failedDate = new Date();
        withdrawal.failureReason = event.payload.payout.entity.failure_reason || 'Reversed by bank';

        // IMPORTANT: Add the money back to the user's available balance
        await User.findByIdAndUpdate(withdrawal.user, {
            $inc: { 'balance.available': withdrawal.amount }
        });
    }

    await withdrawal.save();
    logger.info(`Razorpay webhook processed for withdrawal ${withdrawalId}, status: ${withdrawal.status}`);

    res.status(200).json({ status: 'ok' });
});
