const jwt = require('jsonwebtoken');
const { logger, errorLogger } = require('../logs/logger');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Nueva conexión Socket.io: ${socket.id}`);

      // Manejar autenticación
      socket.on('authenticate', async (token) => {
        try {
          const user = await this.verifyToken(token);
          this.connectedUsers.set(socket.id, user._id);
          socket.join(`user_${user._id}`);
          logger.info(`Usuario autenticado en Socket.io: ${user.email}`);
        } catch (error) {
          logger.error(`Error de autenticación Socket.io: ${error.message}`);
          socket.disconnect();
        }
      });

      // Manejar desconexión
      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id);
        logger.info(`Cliente desconectado: ${socket.id}`);
      });

      // Manejar errores
      socket.on('error', (error) => {
        logger.error(`Error en Socket.io: ${error.message}`);
      });
    });
  }

  async verifyToken(token) {
    // Implementar verificación de token JWT
    // Retornar usuario si es válido
  }

  // Notificar nueva venta
  notifyNewSale(sale) {
    const userId = sale.userId;
    this.io.to(`user_${userId}`).emit('new_sale', {
      saleId: sale._id,
      amount: sale.total,
      timestamp: new Date()
    });
  }

  // Notificar producto agotado
  notifyLowStock(product) {
    const userId = product.userId;
    this.io.to(`user_${userId}`).emit('low_stock', {
      productId: product._id,
      name: product.name,
      currentStock: product.stock
    });
  }

  // Notificar resumen diario
  notifyDailySummary(userId, summary) {
    this.io.to(`user_${userId}`).emit('daily_summary', {
      date: new Date(),
      totalSales: summary.totalSales,
      totalAmount: summary.totalAmount,
      topProducts: summary.topProducts
    });
  }

  // Notificar actualización de plan
  notifyPlanUpdate(userId, plan) {
    this.io.to(`user_${userId}`).emit('plan_update', {
      planType: plan.type,
      expiresAt: plan.expiresAt,
      features: plan.features
    });
  }

  // Notificar error
  notifyError(userId, error) {
    this.io.to(`user_${userId}`).emit('error', {
      message: error.message,
      code: error.code,
      timestamp: new Date()
    });
  }
}

module.exports = SocketService; 