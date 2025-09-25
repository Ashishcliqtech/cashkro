const mongoose = require('mongoose');

const retailerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Retailer name is required'],
    trim: true,
    maxlength: [100, 'Retailer name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: [true, 'Retailer slug is required'],
    unique: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    required: [true, 'Retailer description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  logo: {
    type: String,
    required: [true, 'Retailer logo is required']
  },
  website: {
    type: String,
    required: [true, 'Retailer website is required'],
    match: [/^https?:\/\/.+\..+/, 'Please enter a valid website URL']
  },
  affiliateUrl: {
    type: String,
    required: [true, 'Affiliate URL is required'],
    match: [/^https?:\/\/.+\..+/, 'Please enter a valid affiliate URL']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Fashion', 'Electronics', 'Home & Garden', 'Health & Beauty',
      'Sports & Outdoors', 'Books & Media', 'Food & Dining',
      'Travel', 'Automotive', 'Services', 'Other'
    ]
  },
  cashbackType: {
    type: String,
    required: [true, 'Cashback type is required'],
    enum: ['percentage', 'fixed', 'tiered'],
    default: 'percentage'
  },
  cashbackValue: {
    type: Number,
    required: [true, 'Cashback value is required'],
    min: [0, 'Cashback value cannot be negative']
  },
  maxCashback: {
    type: Number,
    default: null,
    min: [0, 'Max cashback cannot be negative']
  },
  // Tiered cashback structure
  cashbackTiers: [{
    minAmount: {
      type: Number,
      required: function() {
        return this.parent().cashbackType === 'tiered';
      }
    },
    maxAmount: Number,
    cashbackValue: {
      type: Number,
      required: function() {
        return this.parent().cashbackType === 'tiered';
      }
    }
  }],
  // Tracking and analytics
  totalClicks: {
    type: Number,
    default: 0,
    min: [0, 'Total clicks cannot be negative']
  },
  totalTransactions: {
    type: Number,
    default: 0,
    min: [0, 'Total transactions cannot be negative']
  },
  totalSales: {
    type: Number,
    default: 0,
    min: [0, 'Total sales cannot be negative']
  },
  totalCashbackPaid: {
    type: Number,
    default: 0,
    min: [0, 'Total cashback paid cannot be negative']
  },
  conversionRate: {
    type: Number,
    default: 0,
    min: [0, 'Conversion rate cannot be negative'],
    max: [100, 'Conversion rate cannot exceed 100%']
  },
  // Status and configuration
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
  // Additional information
  tags: [{
    type: String,
    trim: true
  }],
  termsAndConditions: {
    type: String,
    maxlength: [2000, 'Terms and conditions cannot exceed 2000 characters']
  },
  // Tracking pixels and codes
  trackingCode: String,
  cookieDuration: {
    type: Number,
    default: 30, // days
    min: [1, 'Cookie duration must be at least 1 day'],
    max: [365, 'Cookie duration cannot exceed 365 days']
  },
  // Commission information
  commission: {
    type: Number,
    required: [true, 'Commission rate is required'],
    min: [0, 'Commission cannot be negative'],
    max: [100, 'Commission cannot exceed 100%']
  },
  // Contact information
  contactInfo: {
    email: String,
    phone: String,
    supportUrl: String
  },
  // SEO
  metaTitle: String,
  metaDescription: String,
  // Ratings and reviews
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
retailerSchema.index({ category: 1 });
retailerSchema.index({ isActive: 1 });
retailerSchema.index({ isFeatured: 1, priority: -1 });
retailerSchema.index({ rating: -1 });
retailerSchema.index({ name: 'text', description: 'text' });

// Virtual for cashback display
retailerSchema.virtual('cashbackDisplay').get(function() {
  if (this.cashbackType === 'percentage') {
    return `${this.cashbackValue}%`;
  } else if (this.cashbackType === 'fixed') {
    return `$${this.cashbackValue}`;
  } else {
    return 'Up to ' + Math.max(...this.cashbackTiers.map(tier => tier.cashbackValue)) + 
           (this.cashbackTiers[0].cashbackValue < 1 ? '%' : '');
  }
});

// Method to calculate cashback for a given amount
retailerSchema.methods.calculateCashback = function(amount) {
  let cashback = 0;
  
  if (this.cashbackType === 'percentage') {
    cashback = (amount * this.cashbackValue) / 100;
    if (this.maxCashback && cashback > this.maxCashback) {
      cashback = this.maxCashback;
    }
  } else if (this.cashbackType === 'fixed') {
    cashback = this.cashbackValue;
  } else if (this.cashbackType === 'tiered') {
    for (const tier of this.cashbackTiers) {
      if (amount >= tier.minAmount && (!tier.maxAmount || amount <= tier.maxAmount)) {
        if (tier.cashbackValue < 1) {
          cashback = (amount * tier.cashbackValue) / 100;
        } else {
          cashback = tier.cashbackValue;
        }
        break;
      }
    }
  }
  
  return parseFloat(cashback.toFixed(2));
};

// Method to update statistics
retailerSchema.methods.updateStats = function(transaction) {
  this.totalTransactions += 1;
  this.totalSales += transaction.amount;
  this.totalCashbackPaid += transaction.cashbackAmount;
  this.conversionRate = (this.totalTransactions / this.totalClicks) * 100;
  return this.save();
};

module.exports = mongoose.model('Retailer', retailerSchema);