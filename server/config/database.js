const mongoose = require('mongoose');
const { logger, errorLogger } = require('../logs/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Temporalmente comentado para pruebas
/*
const configureIndexes = async () => {
  try {
    // Índices para productos
    await mongoose.model('Product').createIndexes([
      { name: 1 },
      { category: 1 },
      { price: 1 },
      { stock: 1 },
      { userId: 1, name: 1 },
      { userId: 1, category: 1 },
      { sku: 1, unique: true, sparse: true, background: true },
      { barcode: 1, unique: true, sparse: true, background: true }
    ]);

    // Índices para ventas
    await mongoose.model('Sale').createIndexes([
      { userId: 1, createdAt: -1 },
      { 'items.productId': 1 },
      { paymentMethod: 1 },
      { total: 1 },
      { createdAt: -1 },
      { invoiceNumber: 1, unique: true, background: true }
    ]);

    // Índices para usuarios
    await mongoose.model('User').createIndexes([
      { email: 1 },
      { role: 1 },
      { 'plan.type': 1 },
      { 'plan.expiresAt': 1 }
    ]);

    // Índices para clientes
    await mongoose.model('Customer').createIndexes([
      { userId: 1, email: 1 },
      { userId: 1, name: 1 },
      { phone: 1 }
    ]);

    // Índices para inventario
    await mongoose.model('Inventory').createIndexes([
      { userId: 1, productId: 1 },
      { status: 1 },
      { createdAt: -1 }
    ]);

    logger.info('Índices de MongoDB configurados correctamente');
  } catch (error) {
    errorLogger(`Error configurando índices: ${error.message}`);
  }
};
*/

// Manejar eventos de conexión
mongoose.connection.on('connected', () => {
  logger.info('Mongoose conectado a MongoDB');
});

mongoose.connection.on('error', (err) => {
  errorLogger(`Error en la conexión de Mongoose: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose desconectado de MongoDB');
});

// Manejar cierre de la aplicación
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('Conexión a MongoDB cerrada por terminación de la aplicación');
    process.exit(0);
  } catch (error) {
    errorLogger(`Error cerrando conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
});

module.exports = connectDB; 