# POS-NT Backend

Backend para el sistema de punto de venta POS-NT.

## Requisitos

- Node.js 16.x o superior
- MongoDB 4.4 o superior
- Redis (opcional, para caché)
- SMTP Server (para notificaciones por email)

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/pos-nt.git
cd pos-nt/bakend/server
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp env.production.example .env
# Editar .env con tus valores
```

## Configuración de Producción

### Variables de Entorno Requeridas

- `NODE_ENV`: Entorno de ejecución (production/development)
- `PORT`: Puerto del servidor
- `MONGODB_URI`: URL de conexión a MongoDB
- `JWT_SECRET`: Secreto para firmar tokens JWT
- `REFRESH_TOKEN_SECRET`: Secreto para tokens de refresco
- `SMTP_*`: Configuración del servidor SMTP
- `FRONTEND_URL`: URL del frontend autorizado

### Seguridad

1. Configurar HTTPS:
   - Usar un certificado SSL válido
   - Configurar redirección HTTP a HTTPS
   - Habilitar HSTS

2. Configurar CORS:
   - Permitir solo el dominio del frontend
   - Configurar métodos y headers permitidos

3. Configurar Rate Limiting:
   - Ajustar límites según necesidades
   - Implementar bloqueo de IPs maliciosas

### Base de Datos

1. Configurar MongoDB:
   - Usar autenticación
   - Configurar replicas para alta disponibilidad
   - Habilitar backup automático

2. Índices:
   - Los índices se crean automáticamente al iniciar
   - Verificar rendimiento con `explain()`

### Monitoreo

1. Configurar logs:
   - Los logs se guardan en `logs/`
   - Rotación automática configurada
   - Niveles de log ajustables

2. Integrar con servicios de monitoreo:
   - Sentry para errores
   - New Relic para rendimiento
   - Logs centralizados (ELK Stack)

## Despliegue

### Opción 1: Servidor Dedicado

1. Configurar servidor:
```bash
# Instalar Node.js y npm
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar MongoDB
sudo apt-get install mongodb
```

2. Iniciar la aplicación:
```bash
# Usando PM2
pm2 start npm --name "pos-nt" -- start

# Configurar inicio automático
pm2 startup
pm2 save
```

### Opción 2: Docker

1. Construir imagen:
```bash
docker build -t pos-nt-backend .
```

2. Ejecutar contenedor:
```bash
docker run -d \
  --name pos-nt-backend \
  -p 3001:3001 \
  --env-file .env \
  pos-nt-backend
```

### Opción 3: Plataforma como Servicio (PaaS)

1. Heroku:
```bash
heroku create pos-nt-backend
git push heroku main
```

2. Vercel:
```bash
vercel
```

## Mantenimiento

### Actualizaciones

1. Actualizar dependencias:
```bash
npm update
npm audit fix
```

2. Actualizar base de datos:
```bash
npm run migrate
```

### Backup

1. Base de datos:
```bash
mongodump --uri $MONGODB_URI
```

2. Logs:
```bash
# Los logs se rotan automáticamente
# Mantener backups de logs importantes
```

## Troubleshooting

### Problemas Comunes

1. Conexión a MongoDB:
   - Verificar URI de conexión
   - Comprobar firewall
   - Verificar credenciales

2. Problemas de memoria:
   - Ajustar límites de PM2
   - Monitorear uso de memoria
   - Optimizar consultas

3. Errores de autenticación:
   - Verificar tokens JWT
   - Comprobar expiración
   - Validar secretos

## Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información. 