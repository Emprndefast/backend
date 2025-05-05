const { logger, errorLogger } = require('../logs/logger');

const PLAN_LIMITS = {
  free: {
    maxProducts: 50,
    maxSales: 100,
    maxUsers: 2,
    features: ['basic_pos', 'basic_reports']
  },
  basic: {
    maxProducts: 200,
    maxSales: 1000,
    maxUsers: 5,
    features: ['basic_pos', 'basic_reports', 'export_data', 'email_notifications']
  },
  premium: {
    maxProducts: -1, // ilimitado
    maxSales: -1, // ilimitado
    maxUsers: 20,
    features: ['basic_pos', 'basic_reports', 'export_data', 'email_notifications', 'advanced_analytics', 'api_access']
  },
  enterprise: {
    maxProducts: -1,
    maxSales: -1,
    maxUsers: -1,
    features: ['basic_pos', 'basic_reports', 'export_data', 'email_notifications', 'advanced_analytics', 'api_access', 'white_label']
  }
};

const checkPlanLimits = (feature) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user || !user.plan) {
        throw new Error('Plan no encontrado');
      }

      const planType = user.plan.type || 'free';
      const planLimits = PLAN_LIMITS[planType];

      if (!planLimits) {
        throw new Error('Tipo de plan inválido');
      }

      // Verificar si la característica está disponible en el plan
      if (feature && !planLimits.features.includes(feature)) {
        logger.warn(`Intento de acceso a característica no disponible: ${feature}`, {
          userId: user._id,
          planType
        });
        return res.status(403).json({
          success: false,
          message: 'Esta característica no está disponible en tu plan actual',
          upgrade: true
        });
      }

      // Verificar límites específicos según la operación
      if (req.method === 'POST') {
        switch (req.baseUrl) {
          case '/api/products':
            if (planLimits.maxProducts !== -1) {
              const productCount = await req.app.locals.Product.countDocuments({ user: user._id });
              if (productCount >= planLimits.maxProducts) {
                return res.status(403).json({
                  success: false,
                  message: `Has alcanzado el límite de ${planLimits.maxProducts} productos en tu plan actual`,
                  upgrade: true
                });
              }
            }
            break;

          case '/api/users':
            if (planLimits.maxUsers !== -1) {
              const userCount = await req.app.locals.User.countDocuments({ createdBy: user._id });
              if (userCount >= planLimits.maxUsers) {
                return res.status(403).json({
                  success: false,
                  message: `Has alcanzado el límite de ${planLimits.maxUsers} usuarios en tu plan actual`,
                  upgrade: true
                });
              }
            }
            break;
        }
      }

      next();
    } catch (error) {
      logger.error('Error en verificación de plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar los límites del plan'
      });
    }
  };
};

/**
 * Middleware para verificar el plan del usuario
 * @param {string[]} allowedPlans - Array de planes permitidos
 * @returns {Function} Middleware de Express
 */
const plan = (allowedPlans = []) => (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar que el usuario tenga un plan
    if (!req.user.plan) {
      throw new Error('Usuario sin plan asignado');
    }

    // Verificar que el plan del usuario esté entre los permitidos
    if (!allowedPlans.includes(req.user.plan.type)) {
      logger.warn(`Acceso denegado - Usuario: ${req.user.email}, Plan: ${req.user.plan.type}, Planes permitidos: ${allowedPlans.join(', ')}`);
      return res.status(403).json({
        error: 'Plan no autorizado',
        message: 'Su plan actual no permite realizar esta acción',
        currentPlan: req.user.plan.type,
        requiredPlans: allowedPlans
      });
    }

    // Verificar que el plan no esté expirado
    if (req.user.plan.expiresAt && new Date(req.user.plan.expiresAt) < new Date()) {
      logger.warn(`Plan expirado - Usuario: ${req.user.email}, Plan: ${req.user.plan.type}`);
      return res.status(403).json({
        error: 'Plan expirado',
        message: 'Su plan ha expirado. Por favor, renueve su suscripción',
        expirationDate: req.user.plan.expiresAt
      });
    }

    next();
  } catch (error) {
    logger.error(`Error al verificar plan: ${error.message}`);
    res.status(403).json({
      error: 'Error de verificación de plan',
      message: error.message
    });
  }
};

module.exports = {
  checkPlanLimits,
  PLAN_LIMITS,
  plan
}; 