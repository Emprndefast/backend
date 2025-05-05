const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');

// Modelo de venta simple (ajusta según tu esquema real)
const Sale = mongoose.model('Sale', new mongoose.Schema({
  products: Array,
  total: Number,
  customer: String,
  ticketNumber: String,
  userId: String,
  createdAt: { type: Date, default: Date.now }
}));

async function sendWhatsAppMessage(phone, message, apiKey) {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
  return axios.get(url);
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
        await sendWhatsAppMessage(user.whatsapp.number, message, user.whatsapp.apiKey);
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