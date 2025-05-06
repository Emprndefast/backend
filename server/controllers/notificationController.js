const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

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