const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.baseUrl = 'https://api.ultramsg.com';
  }

  async sendMessage(instanceId, token, to, body) {
    try {
      console.log('Enviando mensaje a WhatsApp:', { instanceId, to, body });
      const response = await axios.post(
        `${this.baseUrl}/${instanceId}/messages/chat`,
        {
          token,
          to,
          body
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Respuesta de UltraMsg:', response.data);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error al enviar mensaje por WhatsApp:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async testConnection(instanceId, token, to) {
    try {
      console.log('Probando conexión con WhatsApp:', { instanceId, to });
      const response = await this.sendMessage(
        instanceId,
        token,
        to,
        '🔔 Prueba de notificación POS-NT'
      );

      if (response.success) {
        return {
          success: true,
          message: 'Conexión con WhatsApp establecida correctamente'
        };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error al probar conexión con WhatsApp:', error);
      return {
        success: false,
        error: error.message || 'Error al probar conexión con WhatsApp'
      };
    }
  }
}

module.exports = new WhatsAppService(); 