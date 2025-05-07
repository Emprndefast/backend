const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const huggingFaceRoutes = require('./routes/huggingFaceRoutes');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const whatsappService = require('./services/whatsappService');
const saleRoutes = require('./routes/saleRoutes');
const notificationRoutes = require('./routes/notifications');
const cron = require('node-cron');
const admin = require('firebase-admin');
const serviceAccount = require('/etc/secrets/firebase-key.json');
const { sendWhatsAppDailySummary } = require('./services/notificationService');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const crmRoutes = require('./routes/crm');

// Cargar variables de entorno
dotenv.config();
console.log('DEBUG WHATSAPP_INSTANCE_ID:', process.env.WHATSAPP_INSTANCE_ID);
console.log('DEBUG WHATSAPP_TOKEN:', process.env.WHATSAPP_TOKEN);
console.log('DEBUG PRUEBA_VAR:', process.env.PRUEBA_VAR);
// Definir puerto
const PORT = process.env.PORT || 3001;

// Inicializar la aplicación Express
const app = express();

// Configuración de CORS
console.log('FRONTEND_URL en Render:', process.env.FRONTEND_URL);
const corsOptions = {
  origin: [
    'https://posntrd.online', // Frontend en producción
    'http://localhost:3000', // Desarrollo local
    process.env.FRONTEND_URL // Variable de entorno si aplica
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

app.use(cors(corsOptions));

// Middleware de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Middleware básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'Backend funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Ruta de estado
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Ruta para recibir notificaciones del POS y reenviarlas a Telegram
app.post('/api/bot/notify', async (req, res) => {
  const { botToken, chatId, type, data } = req.body;
  console.log('🔔 [API] Notificación recibida:', { botToken, chatId, type, data });

  if (!botToken || !chatId || !type || !data) {
    return res.status(400).json({ error: 'Faltan datos requeridos', message: 'botToken, chatId, type y data son obligatorios' });
  }

  // Construir el mensaje según el tipo
  let text = '';
  if (type === 'sale' || type === 'sales') {
    const fecha = data.date
      ? new Date(data.date).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })
      : new Date().toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
    text =
      `🧾 *Nueva venta realizada*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 Ticket: ${data.ticketNumber}\n` +
      `💵 Total: $${data.total}\n` +
      `👤 Cliente: ${data.customer || ''}\n` +
      `📅 Fecha: ${fecha}`;
  } else if (type === 'lowStock') {
    text = `⚠️ Stock bajo\nProducto: ${data.name}\nStock actual: ${data.currentStock}\nStock mínimo: ${data.minStock}`;
  } else {
    text = `Notificación: ${JSON.stringify(data)}`;
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await axios.post(telegramUrl, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    });
    console.log('✅ [API] Notificación enviada a Telegram:', response.data);
    res.json({ success: true, telegram: response.data });
  } catch (error) {
    console.error('❌ [API] Error al enviar a Telegram:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al enviar a Telegram', details: error.response?.data || error.message });
  }
});

// Ruta para probar la conexión con el bot de Telegram
app.post('/api/bot/test', async (req, res) => {
  const { botToken, chatId } = req.body;
  console.log('🔍 [API] Prueba de conexión con bot:', { botToken, chatId });

  if (!botToken || !chatId) {
    return res.status(400).json({ error: 'Faltan datos requeridos', message: 'botToken y chatId son obligatorios' });
  }

  try {
    // Primero probamos obtener información del bot
    const getMeUrl = `https://api.telegram.org/bot${botToken}/getMe`;
    const getMeResponse = await axios.get(getMeUrl);
    console.log('✅ [API] Información del bot:', getMeResponse.data);

    // Luego probamos enviar un mensaje
    const sendMessageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const sendMessageResponse = await axios.post(sendMessageUrl, {
      chat_id: chatId,
      text: '✅ Conexión exitosa con Telegram',
      parse_mode: 'Markdown'
    });
    console.log('✅ [API] Mensaje de prueba enviado:', sendMessageResponse.data);

    res.json({
      success: true,
      bot: getMeResponse.data,
      message: sendMessageResponse.data
    });
  } catch (error) {
    console.error('❌ [API] Error al probar conexión con Telegram:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Error al probar conexión con Telegram', 
      details: error.response?.data || error.message 
    });
  }
});

// Ruta para enviar mensajes de prueba a WhatsApp usando UltraMsg
app.post('/api/notifications/test-whatsapp', async (req, res) => {
  console.log('Recibida petición de prueba WhatsApp:', req.body);
  
  // Fallback a variables de entorno si faltan datos
  let { instanceId, token, phone } = req.body;
  if (!instanceId) {
    instanceId = process.env.WHATSAPP_INSTANCE_ID || process.env.REACT_APP_WHATSAPP_INSTANCE_ID;
    console.log('Usando instanceId del backend:', instanceId);
  }
  if (!token) {
    token = process.env.WHATSAPP_TOKEN || process.env.REACT_APP_WHATSAPP_TOKEN;
    console.log('Usando token del backend:', token ? '[OK]' : '[VACÍO]');
  }
  console.log('Valores finales usados:', { instanceId, token, phone });
  
  if (!instanceId || !token || !phone) {
    console.error('Faltan datos requeridos:', { instanceId, token, phone });
    return res.status(400).json({ 
      success: false, 
      error: 'Faltan datos requeridos',
      details: {
        instanceId: !instanceId,
        token: !token,
        phone: !phone
      }
    });
  }

  try {
    console.log('Iniciando prueba de conexión WhatsApp');
    const result = await whatsappService.testConnection(instanceId, token, phone);
    
    if (result.success) {
      console.log('Prueba de WhatsApp exitosa');
      return res.json({ success: true, message: result.message });
    } else {
      console.error('Error en prueba de WhatsApp:', result.error);
      return res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error en servidor:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || 'Error interno del servidor'
    });
  }
});

// Ruta de login de prueba (solo para pruebas, no usar en producción)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  // Aquí puedes poner validaciones reales, por ahora es solo prueba
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email y password requeridos' });
  }
  // Generar un token de prueba
  const payload = {
    user: {
      id: 'usuario_prueba',
      email,
      role: 'admin'
    }
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'tu_jwt_secret', { expiresIn: '24h' });
  res.json({
    success: true,
    message: 'Login de prueba exitoso',
    token,
    user: payload.user
  });
});

// Configurar rutas
app.use('/api/huggingface', huggingFaceRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/crm', crmRoutes);

// Ruta catch-all para cualquier otra ruta
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'No encontrado',
    message: 'Esta ruta no existe en la API'
  });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = getFirestore();

// Tarea programada para enviar resumen diario
cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('[CRON] Ejecutando tarea de resumen diario...');
    const configsSnap = await db.collection('users').get();
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    for (const doc of configsSnap.docs) {
      const user = doc.data();
      const userId = doc.id;
      const dailyConfig = user.dailySummaryConfig;
      if (!dailyConfig || !dailyConfig.enabled) continue;
      // Solo ejecutar si la hora coincide (solo minutos exactos)
      if (dailyConfig.hour && dailyConfig.hour.substring(0,5) === currentHour.substring(0,5)) {
        // Leer ventas del día
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const salesSnap = await db.collection('sales')
          .where('userId', '==', userId)
          .where('date', '>=', start)
          .where('date', '<=', end)
          .get();
        const sales = salesSnap.docs.map(doc => doc.data());
        const totalSales = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
        const totalItems = sales.reduce((sum, sale) => sum + (Array.isArray(sale.items) ? sale.items.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0) : 0), 0);
        const totalCustomers = new Set(sales.map(sale => sale.customerId).filter(Boolean)).size;
        const summaryData = {
          date: now.toLocaleDateString('es-DO'),
          totalSales,
          totalItems,
          totalCustomers
        };
        // WhatsApp
        if (dailyConfig.channel === 'whatsapp' || dailyConfig.channel === 'both') {
          const whatsapp = user.whatsapp || {};
          await sendWhatsAppDailySummary(summaryData, {
            instanceId: whatsapp.instanceId,
            token: whatsapp.token,
            phone: whatsapp.number
          });
        }
        // Telegram (si tienes función)
        // if (dailyConfig.channel === 'telegram' || dailyConfig.channel === 'both') {
        //   const telegram = user.telegram || {};
        //   await sendTelegramDailySummary(summaryData, {
        //     botToken: telegram.botToken,
        //     chatId: telegram.chatId
        //   });
        // }
        console.log(`[CRON] Resumen diario enviado para usuario ${userId}`);
      }
    }
  } catch (err) {
    console.error('[CRON] Error en tarea de resumen diario:', err);
  }
});

// Iniciar el servidor
const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Servidor backend ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();

module.exports = app; 