const axios = require('axios');

function buildProductList(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return '- Sin productos';
  return items.map(item => `• ${item.name} x${item.quantity}`).join('\n');
}

function getLocalDateTime() {
  const now = new Date();
  return now.toLocaleString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

exports.sendTelegram = async (sale) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const ticket = sale.id || 'N/A';
    const total = sale.total || 0;
    const customer = sale.customer?.name || 'Cliente General';
    const date = getLocalDateTime();
    const productList = buildProductList(sale.items);
    const text =
      `🧾 *Nueva venta realizada*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *Ticket:* ${ticket}\n` +
      `💵 *Total:* $${total}\n` +
      `👤 *Cliente:* ${customer}\n` +
      `🛒 *Productos:*\n${productList}\n` +
      `📅 *Fecha:* ${date}`;
    console.log('Enviando notificación a Telegram...');
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    });
    console.log('Notificación enviada a Telegram');
  } catch (error) {
    console.error('Error al enviar notificación a Telegram:', error.message);
  }
};

exports.sendWhatsApp = async (sale, userConfig = {}) => {
  try {
    // Prioridad: config del usuario > config global (.env)
    const instanceId = userConfig.instanceId || process.env.WHATSAPP_INSTANCE_ID;
    const token = userConfig.token || process.env.WHATSAPP_TOKEN;
    const phone = sale.customer?.phone || userConfig.phone || process.env.WHATSAPP_PHONE;

    if (!instanceId || !token || !phone) {
      console.error('Faltan datos para enviar WhatsApp,:', { instanceId, token, phone });
      return;
    }

    const ticket = sale.id || 'N/A';
    const total = sale.total || 0;
    const customer = sale.customer?.name || 'Cliente General';
    const date = getLocalDateTime();
    const productList = buildProductList(sale.items);
    const text =
      `🧾 *Nueva venta realizada*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *Ticket:* ${ticket}\n` +
      `💵 *Total:* $${total}\n` +
      `👤 *Cliente:* ${customer}\n` +
      `🛒 *Productos:*\n${productList}\n` +
      `📅 *Fecha:* ${date}`;
    const payload = {
      token,
      to: phone,
      body: text,
    };
    console.log('Enviando notificación a WhatsApp con payload:', payload);
    const response = await axios.post(`https://api.ultramsg.com/${instanceId}/messages/chat`, payload);
    console.log('Respuesta de UltraMsg (venta):', response.data);
    console.log('Notificación enviada a WhatsApp');
  } catch (error) {
    if (error.response) {
      console.error('Error al enviar notificación a WhatsApp (respuesta):', error.response.data);
    } else {
      console.error('Error al enviar notificación a WhatsApp:', error.message);
    }
  }
};

// Para la prueba de WhatsApp (si tienes un endpoint de prueba similar):
exports.sendWhatsAppTest = async (payload) => {
  try {
    console.log('Enviando prueba de WhatsApp con payload:', payload);
    const response = await axios.post(`https://api.ultramsg.com/${payload.instanceId}/messages/chat`, payload);
    console.log('Respuesta de UltraMsg (prueba):', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Error en prueba de WhatsApp (respuesta):', error.response.data);
    } else {
      console.error('Error en prueba de WhatsApp:', error.message);
    }
    throw error;
  }
};

// Notificación de stock bajo por WhatsApp
exports.sendWhatsAppStockLow = async (stockData, userConfig = {}) => {
  try {
    const instanceId = userConfig.instanceId || process.env.WHATSAPP_INSTANCE_ID;
    const token = userConfig.token || process.env.WHATSAPP_TOKEN;
    const phone = userConfig.phone || process.env.WHATSAPP_PHONE;

    if (!instanceId || !token || !phone) {
      console.error('Faltan datos para enviar WhatsApp (stock bajo):', { instanceId, token, phone });
      return;
    }

    const text =
      `⚠️ *Stock bajo*\n` +
      `Producto: ${stockData.productName}\n` +
      `Stock actual: ${stockData.currentStock}\n` +
      `Stock mínimo: ${stockData.minStock}`;

    const payload = {
      token,
      to: phone,
      body: text,
    };
    console.log('Enviando notificación de stock bajo a WhatsApp con payload:', payload);
    const response = await axios.post(`https://api.ultramsg.com/${instanceId}/messages/chat`, payload);
    console.log('Respuesta de UltraMsg (stock bajo):', response.data);
    console.log('Notificación de stock bajo enviada a WhatsApp');
  } catch (error) {
    if (error.response) {
      console.error('Error al enviar notificación de stock bajo a WhatsApp (respuesta):', error.response.data);
    } else {
      console.error('Error al enviar notificación de stock bajo a WhatsApp:', error.message);
    }
  }
};

// PLANTILLAS para otros tipos de notificaciones útiles para el POS:
// Notificación de nuevo producto
exports.sendWhatsAppNewProduct = async (productData, userConfig = {}) => {
  // Implementar lógica similar si lo necesitas
};

// Notificación de resumen diario por WhatsApp
exports.sendWhatsAppDailySummary = async (summaryData, userConfig = {}) => {
  try {
    const instanceId = userConfig.instanceId || process.env.WHATSAPP_INSTANCE_ID;
    const token = userConfig.token || process.env.WHATSAPP_TOKEN;
    const phone = userConfig.phone || process.env.WHATSAPP_PHONE;

    if (!instanceId || !token || !phone) {
      console.error('Faltan datos para enviar WhatsApp (resumen diario):', { instanceId, token, phone });
      return;
    }

    const text =
      `📊 *Resumen Diario de Ventas*\n` +
      `Fecha: ${summaryData.date}\n` +
      `Total Ventas: $${summaryData.totalSales}\n` +
      `Productos Vendidos: ${summaryData.totalItems}\n` +
      `Clientes Atendidos: ${summaryData.totalCustomers || 'N/A'}`;

    const payload = {
      token,
      to: phone,
      body: text,
    };
    console.log('Enviando resumen diario a WhatsApp con payload:', payload);
    const response = await axios.post(`https://api.ultramsg.com/${instanceId}/messages/chat`, payload);
    console.log('Respuesta de UltraMsg (resumen diario):', response.data);
    console.log('Resumen diario enviado a WhatsApp');
  } catch (error) {
    if (error.response) {
      console.error('Error al enviar resumen diario a WhatsApp (respuesta):', error.response.data);
    } else {
      console.error('Error al enviar resumen diario a WhatsApp:', error.message);
    }
  }
};

// Estructura para programar el envío automático por usuario (ejemplo, usando node-cron o similar)
// Puedes guardar la hora preferida de cada usuario en la base de datos y programar el envío con un job por usuario.
// Ejemplo:
// cron.schedule('0 21 * * *', () => { // 21:00 todos los días
//   sendWhatsAppDailySummary(summaryData, userConfig);
// });

// Notificación de recordatorio de pago
exports.sendWhatsAppPaymentReminder = async (reminderData, userConfig = {}) => {
  // Implementar lógica similar si lo necesitas
}; 