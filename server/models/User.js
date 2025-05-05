const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logger, errorLogger } = require('../logs/logger');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre no puede exceder los 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingrese un email válido']
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'supervisor', 'vendedor'],
    default: 'vendedor'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  plan: {
    type: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días por defecto
    },
    features: [String],
    lastPayment: Date
  },
  tokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // 24 horas
    }
  }],
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  twoFactorSecret: String,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  telegramBotToken: {
    type: String,
    default: null
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
userSchema.index({ email: 1 });
userSchema.index({ businessId: 1 });
userSchema.index({ 'plan.type': 1 });
userSchema.index({ isActive: 1 });

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
  const user = this;
  
  if (user.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    } catch (error) {
      logger.error('Error al hashear contraseña:', error);
      return next(error);
    }
  }
  
  this.updatedAt = Date.now();
  next();
});

// Método para generar token JWT
userSchema.methods.generateAuthToken = async function() {
  const user = this;
  
  try {
    const token = jwt.sign(
      { _id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Guardar token en el array de tokens
    user.tokens = user.tokens.concat({ token });
    await user.save();
    
    return token;
  } catch (error) {
    logger.error('Error al generar token:', error);
    throw error;
  }
};

// Método para generar refresh token
userSchema.methods.generateRefreshToken = async function() {
  const user = this;
  
  try {
    const refreshToken = jwt.sign(
      { _id: user._id.toString() },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );
    
    return refreshToken;
  } catch (error) {
    logger.error('Error al generar refresh token:', error);
    throw error;
  }
};

// Método para verificar contraseña
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    logger.error('Error al comparar contraseñas:', error);
    throw error;
  }
};

// Método para verificar si el usuario tiene acceso a una característica
userSchema.methods.hasFeature = function(feature) {
  if (!this.plan || !this.plan.features) return false;
  return this.plan.features.includes(feature);
};

// Método para verificar si el plan está activo
userSchema.methods.isPlanActive = function() {
  if (!this.plan || !this.plan.expiresAt) return true;
  return new Date(this.plan.expiresAt) > new Date();
};

// Método para actualizar el plan
userSchema.methods.updatePlan = async function(planType, duration) {
  const now = new Date();
  const expiresAt = new Date(now);
  
  // Calcular fecha de expiración según la duración
  switch (duration) {
    case 'month':
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      break;
    case 'year':
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      break;
    default:
      expiresAt.setMonth(expiresAt.getMonth() + 1);
  }
  
  this.plan = {
    type: planType,
    expiresAt,
    lastPayment: now
  };
  
  await this.save();
  return this;
};

// Método para registrar inicio de sesión
userSchema.methods.logLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
};

// Método para revocar todos los tokens
userSchema.methods.revokeAllTokens = async function() {
  this.tokens = [];
  await this.save();
};

// Método para revocar un token específico
userSchema.methods.revokeToken = async function(token) {
  this.tokens = this.tokens.filter(t => t.token !== token);
  await this.save();
};

// Método para generar token de restablecimiento de contraseña
userSchema.methods.generatePasswordResetToken = async function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hora
  
  await this.save();
  
  return resetToken;
};

// Método para verificar si el token de restablecimiento es válido
userSchema.methods.isPasswordResetTokenValid = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return (
    this.resetPasswordToken === hashedToken &&
    this.resetPasswordExpires > Date.now()
  );
};

// Método para habilitar/deshabilitar autenticación de dos factores
userSchema.methods.toggleTwoFactor = async function(secret) {
  this.twoFactorEnabled = !this.twoFactorEnabled;
  if (this.twoFactorEnabled) {
    this.twoFactorSecret = secret;
  } else {
    this.twoFactorSecret = null;
  }
  await this.save();
  return this.twoFactorEnabled;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 