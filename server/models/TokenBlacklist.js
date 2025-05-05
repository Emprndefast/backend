const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  reason: {
    type: String,
    enum: ['logout', 'security', 'expired'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '7d' // Los tokens expiran después de 7 días
  }
});

// Índice para búsquedas rápidas
tokenBlacklistSchema.index({ token: 1 });
tokenBlacklistSchema.index({ createdAt: 1 }, { expireAfterSeconds: 0 });

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

module.exports = TokenBlacklist; 