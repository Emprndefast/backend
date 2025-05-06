const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');

// Rutas para clientes CRM
router.get('/customers', crmController.getCustomers);
router.post('/customers', crmController.createCustomer);
router.get('/customers/:id', crmController.getCustomerById);
router.put('/customers/:id', crmController.updateCustomer);

// Rutas para seguimientos
router.post('/customers/:id/followups', crmController.addFollowUp);
router.get('/customers/:id/followups', crmController.getFollowUps);

// Rutas para tareas
router.post('/customers/:id/tasks', crmController.addTask);
router.get('/customers/:id/tasks', crmController.getTasks);

// Rutas para notas
router.post('/customers/:id/notes', crmController.addNote);
router.get('/customers/:id/notes', crmController.getNotes);

module.exports = router; 