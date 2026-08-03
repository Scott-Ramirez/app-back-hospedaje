# Etapa 1: Construcción
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Ejecución
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
# Asegurar la carpeta de subidas de boletas
RUN mkdir -p uploads/boletas

EXPOSE 3000
CMD ["node", "dist/main"]
