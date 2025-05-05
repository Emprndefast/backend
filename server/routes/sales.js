const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const saleController = require('../controllers/saleController');
const auth = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { plan } = require('../middleware/plan');

// Obtener todas las ventas
router.get('/', auth(['admin', 'supervisor']), saleController.getSales);

// Obtener una venta por ID
router.get('/:id', auth(['admin', 'supervisor']), saleController.getSaleById);

// Crear una nueva venta
router.post('/', [
  auth(['admin', 'vendedor']),
  plan(['basic', 'premium']),
  body('products').isArray({ min: 1 }),
  body('total').isNumeric(),
  validateRequest
], saleController.createSale);

// Actualizar una venta
router.patch('/:id', auth(['admin']), saleController.updateSale);

// Eliminar una venta
router.delete('/:id', auth(['admin']), saleController.deleteSale);

// Obtener ventas por rango de fechas
router.get('/fecha/:inicio/:fin', async (req, res) => {
  try {
    const { inicio, fin } = req.params;
    // TODO: Implementar lógica para obtener ventas por rango de fechas
    res.json({ message: `Ventas entre ${inicio} y ${fin}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener ventas por usuario
router.get('/usuario/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // TODO: Implementar lógica para obtener ventas por usuario
    res.json({ message: `Ventas del usuario ${userId}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas de ventas
router.get('/estadisticas/generales', async (req, res) => {
  try {
    // TODO: Implementar lógica para obtener estadísticas
    res.json({ 
      message: 'Estadísticas de ventas',
      data: {
        totalVentas: 0,
        ventasHoy: 0,
        ventasSemana: 0,
        ventasMes: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 