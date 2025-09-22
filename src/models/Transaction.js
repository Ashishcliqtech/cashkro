const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Retailer',
    required: [true, 'Retailer is required']
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  },
  // Transaction details
  orderId: {
    type: String,
    trim: true,
    maxlength: [100, 'Order ID cannot exceed 100 characters']
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: [true, 'Transaction amount is required'],
    min: [0, 'Transaction amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  // Cashback details
  cashbackAmount: {
    type: Number,
    required: [true, 'Cashback amount is required'],
    min: [0, 'Cashback amount cannot be negative']
  },
  cashbackPercentage: {
    type: Number,
    min: [0, 'Cashback percentage cannot be negative'],
    max: [100, 'Cashback percentage cannot exceed 100%']
  },
  // Status tracking
  status: {
    type: String,
    required: [true, 'Transaction status is required'],
    enum: ['pending', 'confirmed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  // Tracking information
  clickId: {
    type: String,
    trim: true
  },
  sessionId: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  referrer: {
    type: String,
    trim: true
  },
  // Commission information
  commissionAmount: {
    type: Number,
    min: [0, 'Commission amount cannot be negative']
  },
  commissionPercentage: {
    type: Number,
    min: [0, 'Commission percentage cannot be negative'],
    max: [100, 'Commission percentage cannot exceed 100%']
  },
  // Date tracking
  clickDate: {
    type: Date,
    default: Date.now
  },
  confirmedDate: Date,
  cancelledDate: Date,
  rejectedDate: Date,
  // Additional information
  productInfo: [{
    name: String,
    category: String,
    quantity: {
      type: Number,
      min: [0, 'Quantity cannot be negative']
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative']
    }
  }],
  // Customer information (for tracking)
  customerEmail: {
    type: String,
    lowercase: true
  },
  // Reason for cancellation/rejection
  statusReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Status reason cannot exceed 500 characters']
  },
  // Webhook information
  webhookData: {
    type: mongoose.Schema.Types.Mixed
  },
  // Settlement information
  isSettled: {
    type: Boolean,
    default: false
  },
  settledDate: Date,
  settlementId: String,
  // Dispute information
  isDisputed: {
    type: Boolean,
    default: false
  },
  disputeReason: String,
  disputeDate: Date,
  disputeResolution: String,
  disputeResolvedDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
transactionSchema.index({ user: 1 });
transactionSchema.index({ retailer: 1 });
transactionSchema.index({ offer: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ orderDate: -1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ clickId: 1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ isSettled: 1 });

// Virtual for days pending
transactionSchema.virtual('daysPending').get(function() {
  if (this.status !== 'pending') return 0;
  
  const now = new Date();
  const diffTime = now - this.createdAt;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Virtual for formatted cashback
transactionSchema.virtual('formattedCashback').get(function() {
  return `${this.currency} ${this.cashbackAmount.toFixed(2)}`;
});

// Instance method to confirm transaction
transactionSchema.methods.confirm = function(reason = '') {
  this.status = 'confirmed';
  this.confirmedDate = new Date();
  this.statusReason = reason;
  return this.save();
};

// Instance method to cancel transaction
transactionSchema.methods.cancel = function(reason = '') {
  this.status = 'cancelled';
  this.cancelledDate = new Date();
  this.statusReason = reason;
  return this.save();
};

// Instance method to reject transaction
transactionSchema.methods.reject = function(reason = '') {
  this.status = 'rejected';
  this.rejectedDate = new Date();
  this.statusReason = reason;
  return this.save();
};

// Instance method to settle transaction
transactionSchema.methods.settle = function(settlementId) {
  this.isSettled = true;
  this.settledDate = new Date();
  this.settlementId = settlementId;
  return this.save();
};

// Static method to get transaction summary for user
transactionSchema.statics.getUserSummary = function(userId) {
  return this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalCashback: { $sum: '$cashbackAmount' }
      }
    }
  ]);
};

// Static method to get monthly transaction stats
transactionSchema.statics.getMonthlyStats = function(year) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        }
      }
    },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalCashback: { $sum: '$cashbackAmount' },
        totalCommission: { $sum: '$commissionAmount' }
      }
    },
    { $sort: { '_id.month': 1 } }
  ]);
};

// Pre-save middleware to calculate commission
transactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.commissionAmount) {
    try {
      const Retailer = mongoose.model('Retailer');
      const retailer = await Retailer.findById(this.retailer);
      
      if (retailer && retailer.commission) {
        this.commissionAmount = (this.amount * retailer.commission) / 100;
        this.commissionPercentage = retailer.commission;
      }
    } catch (error) {
      console.error('Error calculating commission:', error);
    }
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);