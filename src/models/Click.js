const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  // Tracking information
  clickId: {
    type: String,
    required: [true, 'Click ID is required'],
    unique: true
  },
  sessionId: String,
  ipAddress: String,
  userAgent: String,
  referrer: String,
  // Device and browser information
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  browser: String,
  os: String,
  // Location information
  country: String,
  region: String,
  city: String,
  // Conversion tracking
  isConverted: {
    type: Boolean,
    default: false
  },
  convertedAt: Date,
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  // Click source
  source: {
    type: String,
    enum: ['web', 'mobile_app', 'email', 'social', 'affiliate'],
    default: 'web'
  },
  campaign: String,
  medium: String,
  // Additional tracking parameters
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  utmTerm: String,
  utmContent: String
}, {
  timestamps: true
});

// Indexes
clickSchema.index({ user: 1 });
clickSchema.index({ retailer: 1 });
clickSchema.index({ offer: 1 });
clickSchema.index({ createdAt: -1 });
clickSchema.index({ isConverted: 1 });
clickSchema.index({ ipAddress: 1 });

// Instance method to mark as converted
clickSchema.methods.markConverted = function(transactionId) {
  this.isConverted = true;
  this.convertedAt = new Date();
  this.transaction = transactionId;
  return this.save();
};

// Static method to get click statistics
clickSchema.statics.getClickStats = function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalClicks: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        conversions: { $sum: { $cond: ['$isConverted', 1, 0] } }
      }
    },
    {
      $project: {
        totalClicks: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        conversions: 1,
        conversionRate: {
          $cond: [
            { $gt: ['$totalClicks', 0] },
            { $multiply: [{ $divide: ['$conversions', '$totalClicks'] }, 100] },
            0
          ]
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('Click', clickSchema);