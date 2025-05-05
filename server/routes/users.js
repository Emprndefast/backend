const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const asyncHandler = require('../utils/asyncHandler');

// Crear usuario
router.post('/', 
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    validateRequest
  ],
  asyncHandler(userController.createUser)
);

// Obtener todos los usuarios (solo admin)
router.get('/', auth(['admin']), asyncHandler(userController.getUsers));

// Obtener usuario por ID
router.get('/:id', auth(['admin', 'supervisor']), asyncHandler(userController.getUserById));

// Actualizar usuario
router.patch('/:id', auth(['admin', 'supervisor']), asyncHandler(userController.updateUser));

// Eliminar usuario
router.delete('/:id', auth(['admin']), asyncHandler(userController.deleteUser));

module.exports = router; 