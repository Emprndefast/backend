const axios = require('axios');

exports.sendTelegram = async (sale) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const ticket = sale.ticketNumber || sale.id || 'N/A';
    const total = sale.total || 0;
    const customer = sale.customer?.name || 'Cliente General';
    const date = new Date().toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
    const text =
      `🧾 Nueva venta realizada\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 Ticket: ${ticket}\n` +
      `💵 Total: $${total}\n` +
      `👤 Cliente: ${customer}\n` +
      `📅 Fecha: ${date}`;
    console.log('Enviando notificación a Telegram...');
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
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
      console.error('Faltan datos para enviar WhatsApp:', { instanceId, token, phone });
      return;
    }

    const ticket = sale.ticketNumber || sale.id || 'N/A';
    const total = sale.total || 0;
    const customer = sale.customer?.name || 'Cliente General';
    const date = new Date().toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
    const text =
      `🧾 *Nueva venta realizada*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 *Ticket:* ${ticket}\n` +
      `💵 *Total:* $${total}\n` +
      `👤 *Cliente:* ${customer}\n` +
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