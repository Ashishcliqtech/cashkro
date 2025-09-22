const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  amount: {
    type: Number,
    required: [true, 'Withdrawal amount is required'],
    min: [0.01, 'Withdrawal amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  status: {
    type: String,
    required: [true, 'Withdrawal status is required'],
    enum: ['pending', 'processing', 'completed', 'cancelled', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['paypal', 'bank_transfer', 'check', 'gift_card', 'crypto']
  },
  paymentDetails: {
    // PayPal
    paypalEmail: String,
    
    // Bank Transfer
    accountName: String,
    accountNumber: String,
    routingNumber: String,
    bankName: String,
    swiftCode: String,
    iban: String,
    
    // Check
    mailingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    
    // Gift Card
    giftCardType: String,
    
    // Crypto
    walletAddress: String,
    cryptoType: String
  },
  // Processing information
  processingFee: {
    type: Number,
    default: 0,
    min: [0, 'Processing fee cannot be negative']
  },
  netAmount: {
    type: Number,
    min: [0, 'Net amount cannot be negative']
  },
  exchangeRate: {
    type: Number,
    default: 1,
    min: [0, 'Exchange rate must be positive']
  },
  // Transaction tracking
  transactionId: String,
  externalTransactionId: String,
  paymentProvider: String,
  // Date tracking
  requestDate: {
    type: Date,
    default: Date.now
  },
  processedDate: Date,
  completedDate: Date,
  cancelledDate: Date,
  failedDate: Date,
  // Additional information
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  failureReason: String,
  cancellationReason: String,
  // Approval workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date,
  // Tax information
  taxDeducted: {
    type: Number,
    default: 0,
    min: [0, 'Tax deducted cannot be negative']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  // Minimum withdrawal validation
  meetsMinimumThreshold: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
withdrawalSchema.index({ user: 1 });
withdrawalSchema.index({ status: 1 });
withdrawalSchema.index({ requestDate: -1 });
withdrawalSchema.index({ createdAt: -1 });
withdrawalSchema.index({ paymentMethod: 1 });

// Virtual for formatted amount
withdrawalSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Virtual for formatted net amount
withdrawalSchema.virtual('formattedNetAmount').get(function() {
  return `${this.currency} ${this.netAmount.toFixed(2)}`;
});

// Virtual for processing time
withdrawalSchema.virtual('processingDays').get(function() {
  if (this.status === 'pending') {
    const now = new Date();
    const diffTime = now - this.requestDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Pre-save middleware to calculate net amount
withdrawalSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('processingFee') || this.isModified('taxDeducted')) {
    this.netAmount = this.amount - (this.processingFee || 0) - (this.taxDeducted || 0);
    
    if (this.exchangeRate && this.exchangeRate !== 1) {
      this.netAmount = this.netAmount * this.exchangeRate;
    }
  }
  next();
});

// Instance method to process withdrawal
withdrawalSchema.methods.process = function(adminId, notes = '') {
  this.status = 'processing';
  this.processedDate = new Date();
  this.approvedBy = adminId;
  this.approvedDate = new Date();
  if (notes) this.adminNotes = notes;
  return this.save();
};

// Instance method to complete withdrawal
withdrawalSchema.methods.complete = function(transactionId, externalTransactionId = '') {
  this.status = 'completed';
  this.completedDate = new Date();
  this.transactionId = transactionId;
  if (externalTransactionId) this.externalTransactionId = externalTransactionId;
  return this.save();
};

// Instance method to cancel withdrawal
withdrawalSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.cancelledDate = new Date();
  this.cancellationReason = reason;
  return this.save();
};

// Instance method to fail withdrawal
withdrawalSchema.methods.fail = function(reason) {
  this.status = 'failed';
  this.failedDate = new Date();
  this.failureReason = reason;
  return this.save();
};

// Static method to get user withdrawal summary
withdrawalSchema.statics.getUserSummary = function(userId) {
  return this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalNetAmount: { $sum: '$netAmount' }
      }
    }
  ]);
};

// Static method to validate minimum withdrawal
withdrawalSchema.statics.validateMinimumWithdrawal = function(amount) {
  const minimumAmount = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT) || 10;
  return amount >= minimumAmount;
};

module.exports = mongoose.model('Withdrawal', withdrawalSchema);