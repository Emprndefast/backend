const { sendTelegram, sendWhatsAppStockLow } = require('../services/notificationService');

// Notificar stock bajo
const notifyLowStock = async (req, res) => {
  try {
    const { producto_id, cantidad_actual, stock_minimo, nombre_producto, telefono_usuario } = req.body;
    // Notificación por Telegram (si ya existe)
    await sendTelegram({
      items: [],
      customer: { name: 'Stock Bajo' },
      id: producto_id,
      total: 0,
      ticketNumber: producto_id,
      stock: cantidad_actual,
      minStock: stock_minimo,
      productName: nombre_producto
    });
    // Notificación por WhatsApp
    await sendWhatsAppStockLow({
      productName: nombre_producto,
      currentStock: cantidad_actual,
      minStock: stock_minimo
    }, { phone: telefono_usuario });
    res.json({ success: true, message: 'Notificación de stock bajo enviada' });
  } catch (error) {
    console.error('Error al notificar stock bajo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}; 