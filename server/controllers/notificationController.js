const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { sendWhatsAppDailySummary } = require('../services/notificationService');

// Inicializar Firebase Admin solo si no está inicializado
if (!global._firebaseAdminInitialized) {
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  global._firebaseAdminInitialized = true;
}

const db = getFirestore();

// Obtener configuración de resumen diario
exports.getDailySummaryConfig = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });
    const doc = await db.collection('dailySummaryConfigs').doc(userId).get();
    if (!doc.exists) {
      return res.json({ enabled: false, hour: '21:00', channel: '', hasWhatsapp: false, hasTelegram: false });
    }
    return res.json(doc.data());
  } catch (error) {
    console.error('Error al obtener configuración de resumen diario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Guardar configuración de resumen diario
exports.saveDailySummaryConfig = async (req, res) => {
  try {
    const { userId, enabled, hour, channel, hasWhatsapp, hasTelegram } = req.body;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });
    await db.collection('dailySummaryConfigs').doc(userId).set({ enabled, hour, channel, hasWhatsapp, hasTelegram }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error al guardar configuración de resumen diario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Enviar resumen diario bajo demanda
exports.sendDailySummaryNow = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Falta userId' });
    // Leer configuración
    const configDoc = await db.collection('dailySummaryConfigs').doc(userId).get();
    if (!configDoc.exists || !configDoc.data().enabled) {
      return res.status(400).json({ error: 'El resumen diario no está activado para este usuario.' });
    }
    const config = configDoc.data();
    // Leer ventas del día
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const salesSnap = await db.collection('sales')
      .where('userId', '==', userId)
      .where('date', '>=', start)
      .where('date', '<=', end)
      .get();
    const sales = salesSnap.docs.map(doc => doc.data());
    // Generar resumen
    const totalSales = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const totalItems = sales.reduce((sum, sale) => sum + (Array.isArray(sale.items) ? sale.items.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0) : 0), 0);
    const totalCustomers = new Set(sales.map(sale => sale.customerId).filter(Boolean)).size;
    const summaryData = {
      date: now.toLocaleDateString('es-DO'),
      totalSales,
      totalItems,
      totalCustomers
    };
    // Enviar por WhatsApp si corresponde
    let result = {};
    if (config.channel === 'whatsapp' || config.channel === 'both') {
      await sendWhatsAppDailySummary(summaryData, { phone: config.whatsappPhone });
      result.whatsapp = true;
    }
    // Aquí puedes agregar lógica para Telegram si tienes la función
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error al enviar resumen diario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}; 