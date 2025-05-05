const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const businessController = require('../controllers/businessController');
const auth = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// Crear negocio
router.post('/', [
  auth(['admin']),
  body('name').notEmpty(),
  body('email').isEmail(),
  validateRequest
], businessController.createBusiness);

// Obtener todos los negocios (solo admin)
router.get('/', auth(['admin']), businessController.getBusinesses);

// Obtener negocio por ID
router.get('/:id', auth(['admin', 'supervisor']), businessController.getBusiness);

// Actualizar negocio
router.patch('/:id', auth(['admin', 'supervisor']), businessController.updateBusiness);

// Eliminar negocio
router.delete('/:id', auth(['admin']), businessController.deleteBusiness);

module.exports = router; 