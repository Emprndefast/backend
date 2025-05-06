const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

// Ruta para crear una venta
router.post('/', saleController.createSale);

module.exports = router; 