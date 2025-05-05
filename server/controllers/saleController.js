const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');
const whatsappService = require('../services/whatsappService');

// Modelo de venta simple (ajusta según tu esquema real)
const Sale = mongoose.model('Sale', new mongoose.Schema({
  products: Array,
  total: Number,
  customer: String,
  ticketNumber: String,
  userId: String,
  createdAt: { type: Date, default: Date.now }
}));

async function sendWhatsAppMessage(userId, message) {
  try {
    // Obtener la configuración de WhatsApp del usuario
    const user = await User.findById(userId);
    if (!user || !user.whatsapp) {
      throw new Error('Usuario no encontrado o sin configuración de WhatsApp');
    }

    const { instanceId, token, number } = user.whatsapp;
    if (!instanceId || !token || !number) {
      throw new Error('Configuración de WhatsApp incompleta');
    }

    // Enviar mensaje usando UltraMsg
    const result = await whatsappService.sendMessage(instanceId, token, number, message);
    if (!result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error('Error al enviar mensaje por WhatsApp:', error);
    throw error;
  }
}

exports.createSale = async (req, res) => {
  try {
    // 1. Guardar la venta
    const { products, total, customer } = req.body;
    const ticketNumber = 'TICKET-' + Date.now();
    const userId = req.user.id;
    const sale = await Sale.create({ products, total, customer, ticketNumber, userId });

    // 2. Buscar el usuario
    const user = await User.findById(userId);

    // 3. Si tiene WhatsApp configurado, enviar notificación
    if (user && user.whatsapp && user.whatsapp.number && user.whatsapp.apiKey) {
      const fecha = new Date().toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
      const message =
        `🧾 Nueva venta realizada\n` +
        `------------------------\n` +
        `🆔 Ticket: ${ticketNumber}\n` +
        `💵 Total: $${total}\n` +
        `👤 Cliente: ${customer || 'General'}\n` +
        `📅 Fecha: ${fecha}`;
      try {
        await sendWhatsAppMessage(userId, message);
      } catch (err) {
        console.error('Error enviando WhatsApp:', err.message);
      }
    }

    res.status(201).json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Puedes agregar aquí otras funciones como getSales, getSaleById, etc. 