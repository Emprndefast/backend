const { logger, errorLogger } = require('../logs/logger');
const Plan = require('../models/Plan');
const User = require('../models/User');

const planLimits = {
  free: {
    maxProducts: 50,
    maxDailySales: 10,
    maxUsers: 1,
    features: ['basic_sales', 'basic_reports']
  },
  basic: {
    maxProducts: 500,
    maxDailySales: 100,
    maxUsers: 3,
    features: ['basic_sales', 'basic_reports', 'inventory_management', 'customer_management']
  },
  premium: {
    maxProducts: 5000,
    maxDailySales: 1000,
    maxUsers: 10,
    features: ['basic_sales', 'basic_reports', 'inventory_management', 'customer_management', 
              'advanced_reports', 'multi_branch', 'api_access']
  }
};

const checkPlanLimits = async (req, res, next) => {
  try {
    const user = req.user;
    const planType = user.plan?.type || 'free';
    const limits = planLimits[planType];

    // Verificar si el plan ha expirado
    if (user.plan?.expiresAt && new Date(user.plan.expiresAt) < new Date()) {
      user.plan.type = 'free';
      await user.save();
      return res.status(403).json({
        error: 'Plan expirado',
        message: 'Su plan ha expirado. Por favor actualice para continuar usando las funciones premium.'
      });
    }

    // Verificar límites según la ruta
    const route = req.path;
    
    if (route.includes('/products')) {
      const productCount = await Product.countDocuments({ userId: user._id });
      if (productCount >= limits.maxProducts) {
        return res.status(403).json({
          error: 'Límite alcanzado',
          message: `Ha alcanzado el límite de productos (${limits.maxProducts}) para su plan ${planType}.`
        });
      }
    }

    if (route.includes('/sales')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailySales = await Sale.countDocuments({
        userId: user._id,
        createdAt: { $gte: today }
      });

      if (dailySales >= limits.maxDailySales) {
        return res.status(403).json({
          error: 'Límite diario alcanzado',
          message: `Ha alcanzado el límite de ventas diarias (${limits.maxDailySales}) para su plan ${planType}.`
        });
      }
    }

    if (route.includes('/users')) {
      const userCount = await User.countDocuments({ businessId: user.businessId });
      if (userCount >= limits.maxUsers) {
        return res.status(403).json({
          error: 'Límite de usuarios alcanzado',
          message: `Ha alcanzado el límite de usuarios (${limits.maxUsers}) para su plan ${planType}.`
        });
      }
    }

    // Verificar características del plan
    if (route.includes('/api') && !limits.features.includes('api_access')) {
      return res.status(403).json({
        error: 'Característica no disponible',
        message: 'El acceso a la API no está incluido en su plan actual.'
      });
    }

    if (route.includes('/reports/advanced') && !limits.features.includes('advanced_reports')) {
      return res.status(403).json({
        error: 'Característica no disponible',
        message: 'Los reportes avanzados no están incluidos en su plan actual.'
      });
    }

    // Añadir información del plan al request
    req.planLimits = limits;
    next();
  } catch (error) {
    logger.error(`Error al verificar límites del plan: ${error.message}`);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al verificar los límites del plan.'
    });
  }
};

module.exports = checkPlanLimits; 