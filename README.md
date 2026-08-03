# Rayza Hotel - API de Gestión de Hospedaje (Backend)

Este repositorio contiene el servidor y la API REST (Backend) para el sistema de control de hospedajes del hotel. Desarrollado bajo los principios de Arquitectura Limpia y Programación Modular.

---

## 🚀 Características Principales

* **Seguridad & Roles**: Sistema de autenticación JWT con control de acceso por roles: `admin` (acceso total), `supervisor` (acceso intermedio) y `recepcionista` (operativo).
* **Control Obligatorio de Caja Chica**: 
  * Los recepcionistas no pueden registrar estancias ni cobrar saldos si no tienen un turno de caja activo abierto.
  * Los egresos solicitados se descuentan de forma transaccional de la caja activa.
* **Control de Flujo de Egreso con Evidencias (Boleta/Recibo)**:
  * El recepcionista envía la solicitud cargando una foto o PDF del comprobante de pago (Multer).
  * Los administradores/supervisores revisan y aprueban/rechazan las solicitudes desde su panel.
* **Notificaciones en Tiempo Real (WebSockets)**:
  * Emisión automática de eventos de limpieza cuando finaliza una estancia.
  * Envío y resolución de egresos en tiempo real.
* **Semillero de Datos Completo (Seeder)**:
  * Endpoint de desarrollo `GET /api/v1/seed` protegido transaccionalmente.
  * Realiza limpieza segura (desactivando temporalmente `FOREIGN_KEY_CHECKS`) y siembra datos realistas multianuales (de 2020 a 2025) de cobranzas, habitaciones, huéspedes, turnos y bitácora para probar de forma inmediata todos los reportes históricos.
* **Bitácora de Auditoría Completa**: Registro automático de toda acción sensible en el sistema (inicios de sesión, checkout, cobros, gastos directos, aprobaciones de egresos, etc.).

---

## 🛠️ Stack Tecnológico

* **Framework Core**: NestJS
* **Base de Datos**: MySQL / MariaDB
* **Mapeador ORM**: TypeORM
* **Servidor de WebSockets**: Socket.IO Gateway (bajo namespace `/notificaciones`)
* **Subida de Archivos**: Multer (almacenamiento local seguro en `/uploads/boletas`)
* **Seguridad**: JWT (JSON Web Tokens), Bcrypt para hashes de contraseñas, y CORS configurado.

---

## ⚙️ Configuración del Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto antes de arrancar la aplicación:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=tu_contraseña
DB_DATABASE=hospedaje_db
JWT_SECRET=super_secret_token_key_123!
```

---

## 📦 Instrucciones de Instalación y Uso

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Ejecutar el servidor en desarrollo (con recarga automática)**:
   ```bash
   npm run start:dev
   ```
   *La API correrá por defecto en `http://localhost:3000` y expondrá los endpoints bajo el prefijo `/api/v1`.*

3. **Sembrar base de datos para pruebas**:
   * Asegúrate de que la base de datos `hospedaje_db` esté creada en tu gestor MySQL.
   * Crea dos usuarios manuales (con roles `admin` y `supervisor`) o ejecuta la base de datos limpia.
   * Realiza una petición GET en tu navegador o cliente REST a:
     `http://localhost:3000/api/v1/seed`
   * Si todo está correcto, responderá:
     ```json
     { "success": true, "message": "Sembrado de base de datos completado con éxito." }
     ```

4. **Compilar para producción**:
   ```bash
   npm run build
   ```
