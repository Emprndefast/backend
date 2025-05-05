const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['free', 'basic', 'premium'],
    default: 'free',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    monthly: {
      type: Number,
      required: true
    },
    yearly: {
      type: Number,
      required: true
    }
  },
  features: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  limits: {
    maxProducts: {
      type: Number,
      required: true
    },
    maxDailySales: {
      type: Number,
      required: true
    },
    maxUsers: {
      type: Number,
      required: true
    },
    maxBranches: {
      type: Number,
      required: true
    }
  },
  trialPeriod: {
    enabled: {
      type: Boolean,
      default: true
    },
    days: {
      type: Number,
      default: 14
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para búsquedas rápidas
planSchema.index({ type: 1 });
planSchema.index({ 'price.monthly': 1 });
planSchema.index({ 'price.yearly': 1 });

// Middleware para actualizar updatedAt
planSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan; 