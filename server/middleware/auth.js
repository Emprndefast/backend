const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger, errorLogger } = require('../logs/logger');
const rateLimit = require('express-rate-limit');
const TokenBlacklist = require('../models/TokenBlacklist');
const Sale = require('../models/Sale');

// Limitar intentos de autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por IP
  message: 'Demasiados intentos de autenticación, por favor intente más tarde'
});

const auth = (allowedRoles = []) => async (req, res, next) => {
  try {
    // Verificar IP y limitar intentos
    await authLimiter(req, res, () => {});

    const accessToken = req.header('Authorization')?.replace('Bearer ', '');
    const refreshToken = req.cookies['refresh_token'];

    if (!accessToken) {
      throw new Error('No autorizado - Token no proporcionado');
    }

    try {
      // Verificar token de acceso
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      
      // Verificar si el token está en la lista negra
      const isBlacklisted = await TokenBlacklist.findOne({ token: accessToken });
      if (isBlacklisted) {
        throw new Error('Token inválido - Sesión cerrada');
      }

      const user = await User.findOne({ 
        _id: decoded._id,
        'tokens.token': accessToken,
        isActive: true // Verificar que el usuario esté activo
      });

      if (!user) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      // Verificar rol si se especificaron roles permitidos
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        logger.warn(`Acceso denegado - Usuario: ${user.email}, Rol: ${user.role}, Roles permitidos: ${allowedRoles.join(', ')}`);
        throw new Error('No tiene permisos para acceder a este recurso');
      }

      // Verificar si el token está por expirar (menos de 5 minutos)
      const tokenExp = decoded.exp * 1000;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (tokenExp - Date.now() < fiveMinutes && refreshToken) {
        // Generar nuevo access token
        const newAccessToken = await user.generateAuthToken();
        res.setHeader('New-Access-Token', newAccessToken);
      }

      // Verificar plan activo y límites
      if (user.plan) {
        const now = new Date();
        if (user.plan.expiresAt && new Date(user.plan.expiresAt) < now) {
          user.plan.type = 'free';
          await user.save();
        }
        
        // Verificar límites del plan
        if (user.plan.type === 'free') {
          const dailySales = await Sale.countDocuments({
            userId: user._id,
            createdAt: { $gte: new Date().setHours(0,0,0,0) }
          });
          
          if (dailySales >= 10) {
            throw new Error('Límite de ventas diarias alcanzado. Actualice su plan.');
          }
        }
      }

      // Añadir información de seguridad al request
      req.token = accessToken;
      req.user = user;
      req.userIp = req.ip;
      req.userAgent = req.get('user-agent');
      
      // Registrar acceso exitoso
      logger.info(`Acceso autorizado - Usuario: ${user.email}, IP: ${req.ip}`);
      
      next();
    } catch (error) {
      // Si el access token expiró, intentar usar el refresh token
      if (error.name === 'TokenExpiredError' && refreshToken) {
        try {
          const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
          const user = await User.findById(decoded._id);

          if (!user) {
            throw new Error('Usuario no encontrado');
          }

          // Verificar rol si se especificaron roles permitidos
          if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            logger.warn(`Acceso denegado - Usuario: ${user.email}, Rol: ${user.role}, Roles permitidos: ${allowedRoles.join(', ')}`);
            throw new Error('No tiene permisos para acceder a este recurso');
          }

          // Generar nuevo access token
          const newAccessToken = await user.generateAuthToken();
          res.setHeader('New-Access-Token', newAccessToken);

          req.token = newAccessToken;
          req.user = user;
          next();
        } catch (refreshError) {
          throw new Error('Sesión expirada - Por favor inicie sesión nuevamente');
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error(`Error de autenticación: ${error.message} - IP: ${req.ip}`);
    res.status(401).json({ 
      error: 'No autorizado',
      message: error.message
    });
  }
};

module.exports = auth; 