const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { plan } = require('../middleware/plan');

// Crear producto (solo para planes basic y premium)
router.post('/', [
  auth(['admin', 'supervisor']),
  plan(['basic', 'premium']),
  body('name').notEmpty(),
  body('price').isNumeric(),
  validateRequest
], productController.createProduct);

// Obtener todos los productos
router.get('/', auth(['admin', 'supervisor', 'vendedor']), productController.getProducts);

// Obtener producto por ID
router.get('/:id', auth(['admin', 'supervisor', 'vendedor']), productController.getProductById);

// Actualizar producto
router.patch('/:id', auth(['admin', 'supervisor']), productController.updateProduct);

// Eliminar producto
router.delete('/:id', auth(['admin']), productController.deleteProduct);

module.exports = router; 