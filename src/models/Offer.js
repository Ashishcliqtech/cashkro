const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Offer title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Offer description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  retailer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Retailer',
    required: [true, 'Retailer is required']
  },
  type: {
    type: String,
    required: [true, 'Offer type is required'],
    enum: ['cashback', 'coupon', 'deal'],
    default: 'cashback'
  },
  // Cashback specific fields
  cashbackType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: function() {
      return this.type === 'cashback';
    }
  },
  cashbackValue: {
    type: Number,
    required: function() {
      return this.type === 'cashback';
    },
    min: [0, 'Cashback value cannot be negative']
  },
  maxCashback: {
    type: Number,
    min: [0, 'Max cashback cannot be negative']
  },
  // Coupon specific fields
  couponCode: {
    type: String,
    trim: true,
    uppercase: true,
    required: function() {
      return this.type === 'coupon';
    }
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: function() {
      return this.type === 'coupon';
    }
  },
  discountValue: {
    type: Number,
    required: function() {
      return this.type === 'coupon';
    },
    min: [0, 'Discount value cannot be negative']
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  // Deal specific fields
  originalPrice: {
    type: Number,
    required: function() {
      return this.type === 'deal';
    },
    min: [0, 'Original price cannot be negative']
  },
  salePrice: {
    type: Number,
    required: function() {
      return this.type === 'deal';
    },
    min: [0, 'Sale price cannot be negative']
  },
  // Common fields
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Fashion', 'Electronics', 'Home & Garden', 'Health & Beauty',
      'Sports & Outdoors', 'Books & Media', 'Food & Dining',
      'Travel', 'Automotive', 'Services', 'Other'
    ]
  },
  tags: [{
    type: String,
    trim: true
  }],
  image: {
    type: String,
    default: null
  },
  affiliateUrl: {
    type: String,
    required: [true, 'Affiliate URL is required'],
    match: [/^https?:\/\/.+\..+/, 'Please enter a valid affiliate URL']
  },
  // Validity
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  // Usage limits
  usageLimit: {
    type: Number,
    min: [0, 'Usage limit cannot be negative']
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  userUsageLimit: {
    type: Number,
    default: 1,
    min: [1, 'User usage limit must be at least 1']
  },
  // Status and priority
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 0,
    min: [0, 'Priority cannot be negative']
  },
  // Analytics
  clickCount: {
    type: Number,
    default: 0,
    min: [0, 'Click count cannot be negative']
  },
  conversionCount: {
    type: Number,
    default: 0,
    min: [0, 'Conversion count cannot be negative']
  },
  // Terms and conditions
  termsAndConditions: {
    type: String,
    maxlength: [2000, 'Terms and conditions cannot exceed 2000 characters']
  },
  // SEO
  metaTitle: String,
  metaDescription: String,
  // Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
offerSchema.index({ retailer: 1 });
offerSchema.index({ category: 1 });
offerSchema.index({ type: 1 });
offerSchema.index({ isActive: 1 });
offerSchema.index({ isFeatured: 1, priority: -1 });
offerSchema.index({ startDate: 1, endDate: 1 });
offerSchema.index({ endDate: 1 });
offerSchema.index({ title: 'text', description: 'text' });

// Virtual for savings percentage (deals)
offerSchema.virtual('savingsPercentage').get(function() {
  if (this.type === 'deal' && this.originalPrice > 0) {
    return Math.round(((this.originalPrice - this.salePrice) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual for savings amount (deals)
offerSchema.virtual('savingsAmount').get(function() {
  if (this.type === 'deal') {
    return this.originalPrice - this.salePrice;
  }
  return 0;
});

// Virtual for display value
offerSchema.virtual('displayValue').get(function() {
  if (this.type === 'cashback') {
    return this.cashbackType === 'percentage' 
      ? `${this.cashbackValue}%` 
      : `$${this.cashbackValue}`;
  } else if (this.type === 'coupon') {
    return this.discountType === 'percentage' 
      ? `${this.discountValue}% OFF` 
      : `$${this.discountValue} OFF`;
  } else if (this.type === 'deal') {
    return `${this.savingsPercentage}% OFF`;
  }
  return '';
});

// Virtual for expiry status
offerSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

// Virtual for availability
offerSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  const hasNotStarted = now < this.startDate;
  const hasExpired = now > this.endDate;
  const usageLimitReached = this.usageLimit && this.usageCount >= this.usageLimit;
  
  return this.isActive && !hasNotStarted && !hasExpired && !usageLimitReached;
});

// Method to calculate cashback for a given amount
offerSchema.methods.calculateCashback = function(amount) {
  if (this.type !== 'cashback') return 0;
  
  let cashback = 0;
  
  if (this.cashbackType === 'percentage') {
    cashback = (amount * this.cashbackValue) / 100;
    if (this.maxCashback && cashback > this.maxCashback) {
      cashback = this.maxCashback;
    }
  } else {
    cashback = this.cashbackValue;
  }
  
  return parseFloat(cashback.toFixed(2));
};

// Method to increment click count
offerSchema.methods.incrementClickCount = function() {
  this.clickCount += 1;
  return this.save();
};

// Method to increment conversion count
offerSchema.methods.incrementConversionCount = function() {
  this.conversionCount += 1;
  this.usageCount += 1;
  return this.save();
};

// Static method to find active offers
offerSchema.statics.findActiveOffers = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { usageLimit: { $exists: false } },
      { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
    ]
  });
};

module.exports = mongoose.model('Offer', offerSchema);