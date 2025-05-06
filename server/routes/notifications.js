const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Obtener configuración de resumen diario
router.get('/daily-summary-config', notificationController.getDailySummaryConfig);
// Guardar configuración de resumen diario
router.post('/daily-summary-config', notificationController.saveDailySummaryConfig);
// Enviar resumen diario bajo demanda
router.post('/send-daily-summary', notificationController.sendDailySummaryNow);

module.exports = router; 