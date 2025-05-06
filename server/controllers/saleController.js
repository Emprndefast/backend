const axios = require('axios');
const whatsappService = require('../services/whatsappService');
const { sendTelegram, sendWhatsApp } = require('../services/notificationService');

// Array temporal para guardar ventas
const sales = [];

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
    const sale = req.body;
    sales.push(sale); // Guardar en memoria para pruebas
    console.log('Venta recibida:', sale);
    await sendTelegram(sale);
    // Si no hay cliente, usar el número global para WhatsApp
    if (!sale.customer) {
      sale.customer = { name: 'Cliente General', phone: process.env.WHATSAPP_PHONE };
    }
    const userConfig = sale.whatsappConfig || {};
    await sendWhatsApp(sale, userConfig);
    res.status(201).json({ success: true, sale });
  } catch (error) {
    console.error('Error al procesar venta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Puedes agregar aquí otras funciones como getSales, getSaleById, etc. 