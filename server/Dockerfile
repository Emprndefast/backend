# Usar Node.js LTS como imagen base
FROM node:16-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias necesarias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear usuario no root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Exponer puerto
EXPOSE 3001

# Comando para iniciar la aplicación
CMD ["node", "index.js"] 