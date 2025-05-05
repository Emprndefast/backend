const nodemailer = require('nodemailer');
const { logger, errorLogger } = require('../logs/logger');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const whatsappService = require('../services/whatsappService');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Verificar conexión SMTP
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Servidor SMTP conectado correctamente');
    } catch (error) {
      logger.error(`Error conectando al servidor SMTP: ${error.message}`);
    }
  }

  async sendEmail(to, subject, template, data) {
    try {
      // Renderizar plantilla EJS
      const templatePath = path.join(__dirname, 'templates', `${template}.ejs`);
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const html = ejs.render(templateContent, data);

      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email enviado a ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`Error enviando email a ${to}: ${error.message}`);
      throw error;
    }
  }

  // Notificar nueva venta
  async notifyNewSale(sale, user) {
    const subject = 'Nueva venta registrada';
    const data = {
      sale,
      user,
      appName: process.env.APP_NAME
    };
    return this.sendEmail(user.email, subject, 'new_sale', data);
  }

  // Notificar stock bajo
  async notifyLowStock(product, user) {
    const subject = 'Alerta: Stock bajo';
    const data = {
      product,
      user,
      appName: process.env.APP_NAME
    };
    // Enviar email
    await this.sendEmail(user.email, subject, 'low_stock', data);
    // Enviar WhatsApp si está configurado
    if (user && user.whatsapp && user.whatsapp.instanceId && user.whatsapp.token && user.whatsapp.number) {
      const message =
        `⚠️ Alerta de stock bajo\n` +
        `------------------------\n` +
        `📦 Producto: ${product.name}\n` +
        `📉 Stock actual: ${product.stock}\n` +
        `🔻 Stock mínimo: ${product.minStock}`;
      try {
        await whatsappService.sendMessage(
          user.whatsapp.instanceId,
          user.whatsapp.token,
          user.whatsapp.number,
          message
        );
      } catch (err) {
        console.error('Error enviando WhatsApp (stock bajo):', err.message);
      }
    }
  }

  // Notificar resumen diario
  async notifyDailySummary(summary, user) {
    const subject = 'Resumen diario de ventas';
    const data = {
      summary,
      user,
      appName: process.env.APP_NAME
    };
    return this.sendEmail(user.email, subject, 'daily_summary', data);
  }

  // Notificar actualización de plan
  async notifyPlanUpdate(user, plan) {
    const subject = 'Actualización de plan';
    const data = {
      user,
      plan,
      appName: process.env.APP_NAME
    };
    return this.sendEmail(user.email, subject, 'plan_update', data);
  }

  // Notificar recordatorio de pago
  async notifyPaymentReminder(user, plan) {
    const subject = 'Recordatorio de pago';
    const data = {
      user,
      plan,
      appName: process.env.APP_NAME
    };
    return this.sendEmail(user.email, subject, 'payment_reminder', data);
  }

  // Notificar restablecimiento de contraseña
  async notifyPasswordReset(user, resetLink) {
    const subject = 'Restablecimiento de contraseña';
    const data = {
      user,
      resetLink,
      appName: process.env.APP_NAME
    };
    return this.sendEmail(user.email, subject, 'password_reset', data);
  }
}

module.exports = new EmailService(); 