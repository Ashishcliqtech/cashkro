const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.getMyTransactions = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Transaction.find({ user: req.user.id }), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    
    const transactions = await features.query;

    res.status(200).json({
        status: 'success',
        results: transactions.length,
        data: {
            transactions,
        },
    });
});

exports.getTransaction = catchAsync(async (req, res, next) => {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
        return next(new AppError('No transaction found with that ID', 404));
    }
    
    // Check if the logged-in user owns the transaction
    if (transaction.user.toString() !== req.user.id) {
        return next(new AppError('You do not have permission to view this transaction', 403));
    }

    res.status(200).json({
        status: 'success',
        data: {
            transaction,
        },
    });
});
