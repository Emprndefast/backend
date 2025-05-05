const { body, validationResult } = require('express-validator');
const { logger, errorLogger } = require('../logs/logger');

// Sanitización básica de datos
const sanitize = (req, res, next) => {
  // Sanitizar body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  // Sanitizar query params
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};

// Validación de productos
const productValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  
  body('stock')
    .isInt({ min: 0 })
    .withMessage('El stock debe ser un número entero positivo'),
  
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('La categoría no puede exceder 50 caracteres'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
];

// Validación de ventas
const saleValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un producto'),
  
  body('items.*.productId')
    .isMongoId()
    .withMessage('ID de producto inválido'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser al menos 1'),
  
  body('paymentMethod')
    .isIn(['cash', 'card', 'transfer'])
    .withMessage('Método de pago inválido'),
  
  body('customer')
    .optional()
    .isObject()
    .withMessage('Datos del cliente inválidos')
];

// Validación de usuarios
const userValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  
  body('role')
    .optional()
    .isIn(['admin', 'user', 'cashier'])
    .withMessage('Rol inválido')
];

// Middleware para validar los resultados de express-validator
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Error de validación', {
      errors: errors.array(),
      path: req.path,
      method: req.method
    });
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validación de planes
const planValidation = [
  body('type')
    .isIn(['free', 'basic', 'premium'])
    .withMessage('Tipo de plan inválido'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Fecha de expiración inválida'),
  
  body('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('Auto renovación debe ser true o false')
];

module.exports = {
  sanitize,
  productValidation,
  saleValidation,
  userValidation,
  planValidation,
  validateRequest
}; 