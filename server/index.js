const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const huggingFaceRoutes = require('./routes/huggingFaceRoutes');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Cargar variables de entorno
dotenv.config();

// Definir puerto
const PORT = process.env.PORT || 3001;

// Inicializar la aplicación Express
const app = express();

// Middleware de seguridad
app.use(helmet());

// Middleware básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

// Configuración de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

app.use(cors(corsOptions));

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
      text
    });
    console.log('✅ [API] Notificación enviada a Telegram:', response.data);
    res.json({ success: true, telegram: response.data });
  } catch (error) {
    console.error('❌ [API] Error al enviar a Telegram:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al enviar a Telegram', details: error.response?.data || error.message });
  }
});

// Ruta para enviar mensajes de prueba a WhatsApp usando CallMeBot
app.post('/api/notifications/test-whatsapp', async (req, res) => {
  const { phone, message, apiKey } = req.body;
  if (!phone || !message || !apiKey) {
    return res.status(400).json({ success: false, error: 'Faltan datos requeridos' });
  }
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
    const response = await axios.get(url);
    const data = typeof response.data === 'string' ? response.data.toLowerCase() : '';
    if (data.includes('message sent') || data.includes('message queued')) {
      return res.json({ success: true, message: 'Mensaje enviado o en cola correctamente' });
    } else {
      return res.status(400).json({ success: false, error: response.data });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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

// Iniciar el servidor
const startServer = async () => {
  try {
    await connectDB();
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