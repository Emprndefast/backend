const axios = require('axios');

exports.sendTelegram = async (sale) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const text = `Nueva venta: $${sale.total} - Cliente: ${sale.customer}`;
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

exports.sendWhatsApp = async (sale) => {
  try {
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;
    const phone = process.env.WHATSAPP_PHONE;
    const text = `Nueva venta: $${sale.total} - Cliente: ${sale.customer}`;
    console.log('Enviando notificación a WhatsApp...');
    await axios.post(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
      token,
      to: phone,
      body: text,
    });
    console.log('Notificación enviada a WhatsApp');
  } catch (error) {
    console.error('Error al enviar notificación a WhatsApp:', error.message);
  }
}; 