const Joi = require('joi');
const AppError = require('../utils/appError');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return next(new AppError(errors.join(', '), 400));
    }
    
    next();
  };
};

// User validation schemas
const userSchemas = {
  register: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required().messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: Joi.string().trim().min(2).max(50).required().messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'Password is required'
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().messages({
      'string.pattern.base': 'Please enter a valid phone number'
    }),
    dateOfBirth: Joi.date().max('now').optional().messages({
      'date.max': 'Date of birth must be in the past'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required'
    })
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).optional(),
    lastName: Joi.string().trim().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
    dateOfBirth: Joi.date().max('now').optional(),
    preferences: Joi.object({
      emailNotifications: Joi.boolean().optional(),
      smsNotifications: Joi.boolean().optional(),
      newsletter: Joi.boolean().optional()
    }).optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'string.empty': 'Current password is required'
    }),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'New password is required'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Password confirmation does not match new password',
      'string.empty': 'Password confirmation is required'
    })
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().lowercase().required().messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required'
    })
  }),

  resetPassword: Joi.object({
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'Password is required'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Password confirmation does not match password',
      'string.empty': 'Password confirmation is required'
    })
  })
};

// Withdrawal validation schemas
const withdrawalSchemas = {
  create: Joi.object({
    amount: Joi.number().min(parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT) || 10).required().messages({
      'number.min': `Minimum withdrawal amount is $${process.env.MIN_WITHDRAWAL_AMOUNT || 10}`,
      'number.base': 'Amount must be a number',
      'any.required': 'Amount is required'
    }),
    paymentMethod: Joi.string().valid('paypal', 'bank_transfer', 'check', 'gift_card', 'crypto').required().messages({
      'any.only': 'Invalid payment method',
      'string.empty': 'Payment method is required'
    }),
    paymentDetails: Joi.object({
      paypalEmail: Joi.when('...paymentMethod', {
        is: 'paypal',
        then: Joi.string().email().required().messages({
          'string.email': 'Please enter a valid PayPal email',
          'string.empty': 'PayPal email is required'
        }),
        otherwise: Joi.optional()
      }),
      accountName: Joi.when('...paymentMethod', {
        is: 'bank_transfer',
        then: Joi.string().required().messages({
          'string.empty': 'Account name is required'
        }),
        otherwise: Joi.optional()
      }),
      accountNumber: Joi.when('...paymentMethod', {
        is: 'bank_transfer',
        then: Joi.string().required().messages({
          'string.empty': 'Account number is required'
        }),
        otherwise: Joi.optional()
      }),
      routingNumber: Joi.when('...paymentMethod', {
        is: 'bank_transfer',
        then: Joi.string().required().messages({
          'string.empty': 'Routing number is required'
        }),
        otherwise: Joi.optional()
      }),
      bankName: Joi.when('...paymentMethod', {
        is: 'bank_transfer',
        then: Joi.string().required().messages({
          'string.empty': 'Bank name is required'
        }),
        otherwise: Joi.optional()
      })
    }).required()
  })
};

// Retailer validation schemas
const retailerSchemas = {
  create: Joi.object({
    name: Joi.string().trim().max(100).required().messages({
      'string.empty': 'Retailer name is required',
      'string.max': 'Name cannot exceed 100 characters'
    }),
    slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).required().messages({
      'string.empty': 'Slug is required',
      'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens'
    }),
    description: Joi.string().max(1000).required().messages({
      'string.empty': 'Description is required',
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    logo: Joi.string().uri().required().messages({
      'string.empty': 'Logo URL is required',
      'string.uri': 'Logo must be a valid URL'
    }),
    website: Joi.string().uri().required().messages({
      'string.empty': 'Website URL is required',
      'string.uri': 'Website must be a valid URL'
    }),
    affiliateUrl: Joi.string().uri().required().messages({
      'string.empty': 'Affiliate URL is required',
      'string.uri': 'Affiliate URL must be a valid URL'
    }),
    category: Joi.string().valid(
      'Fashion', 'Electronics', 'Home & Garden', 'Health & Beauty',
      'Sports & Outdoors', 'Books & Media', 'Food & Dining',
      'Travel', 'Automotive', 'Services', 'Other'
    ).required().messages({
      'any.only': 'Invalid category',
      'string.empty': 'Category is required'
    }),
    cashbackType: Joi.string().valid('percentage', 'fixed', 'tiered').required(),
    cashbackValue: Joi.number().min(0).required().messages({
      'number.min': 'Cashback value cannot be negative',
      'any.required': 'Cashback value is required'
    }),
    commission: Joi.number().min(0).max(100).required().messages({
      'number.min': 'Commission cannot be negative',
      'number.max': 'Commission cannot exceed 100%',
      'any.required': 'Commission is required'
    })
  })
};

module.exports = {
  validate,
  userSchemas,
  withdrawalSchemas,
  retailerSchemas
};