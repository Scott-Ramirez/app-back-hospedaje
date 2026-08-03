# Documentación de Endpoints del API - Hospedaje API

Esta es la documentación técnica de todos los endpoints disponibles en la API de Hospedaje. Todas las rutas requieren un prefijo de API global si está configurado en el bootstrap (generalmente `/api` o directamente sobre la raíz del host).

---

## 🔒 Seguridad y Roles

La mayoría de los endpoints están protegidos por tokens JWT y roles. Los roles disponibles en el sistema son:
* `admin` (Administrador)
* `supervisor` (Supervisor)
* `recepcionista` (Recepcionista)

Los endpoints públicos están marcados explícitamente como **Público**. Los protegidos requieren el envío del token Bearer JWT en las cabeceras HTTP:
```http
Authorization: Bearer <tu_jwt_token>
```

---

## 🔑 Módulo de Autenticación (`/auth`)

Controla el inicio de sesión, registro de personal y reseteo de credenciales de acceso.

### 1. Iniciar Sesión
* **Ruta**: `POST /auth/login`
* **Acceso**: **Público**
* **Cuerpo de la Petición (JSON)**:
  ```json
  {
    "username": "usuario",
    "password": "mi_password"
  }
  ```
* **Respuesta**: Token JWT e información básica del usuario y su rol.

### 2. Recuperar Contraseña
* **Ruta**: `POST /auth/recuperar-password`
* **Acceso**: **Público** (Pantalla de login)
* **Cuerpo de la Petición (JSON)**:
  ```json
  {
    "username": "usuario"
  }
  ```
* **Respuesta**: Confirmación del proceso de solicitud de restablecimiento.

### 3. Registrar Nuevo Usuario / Empleado
* **Ruta**: `POST /auth/usuarios/registro`
* **Acceso**: **Protegido** (Solo `admin`)
* **Cuerpo de la Petición (JSON)**:
  ```json
  {
    "username": "nuevo_usuario",
    "password": "password_seguro",
    "rol": "recepcionista" // u otro rol válido
  }
  ```
* **Respuesta**: Datos del usuario creado y confirmación de creación.

### 4. Restablecer Contraseña de Empleado (Admin)
* **Ruta**: `PATCH /auth/usuarios/:id/reset-password`
* **Acceso**: **Protegido** (Solo `admin`)
* **Parámetros**:
  * `id`: ID numérico del empleado.
* **Cuerpo de la Petición (JSON)**:
  ```json
  {
    "nuevaClaveTemporal": "clave123"
  }
  ```
* **Respuesta**: Confirmación de la actualización y bloqueo de tokens previos.

---

## 🛏️ Módulo de Habitaciones (`/habitaciones`)

Gestión física y operativa del inventario de habitaciones.

### 1. Vista de Dashboard
* **Ruta**: `GET /habitaciones/dashboard`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Descripción**: Obtiene un resumen consolidado de los estados de todas las habitaciones (ej: disponibles, ocupadas, en limpieza).
* **Respuesta**: Listado rápido optimizado para el panel de recepción.

### 2. Listar Inventario de Habitaciones
* **Ruta**: `GET /habitaciones`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Descripción**: Obtiene el listado completo y detallado del inventario.

### 3. Crear Habitación
* **Ruta**: `POST /habitaciones`
* **Acceso**: **Protegido** (Solo `admin`)
* **Cuerpo de la Petición (JSON)**:
  ```json
  {
    "numero": "204",
    "tipo": "doble",
    "precio": 120.00
  }
  ```

### 4. Actualizar Habitación
* **Ruta**: `PATCH /habitaciones/:id`
* **Acceso**: **Protegido** (`admin`, `supervisor`)
* **Parámetros**:
  * `id`: UUID de la habitación.
* **Cuerpo de la Petición (JSON)** (Opcional/Parcial):
  ```json
  {
    "precio": 130.00,
    "tipo": "suite"
  }
  ```

### 5. Liberar Habitación (Pase a Limpia/Disponible)
* **Ruta**: `PATCH /habitaciones/:id/liberar`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Descripción**: Cambia el estado de la habitación (por ejemplo, después de la limpieza) de `'limpieza'` a `'disponible'`.

### 6. Eliminar Habitación
* **Ruta**: `DELETE /habitaciones/:id`
* **Acceso**: **Protegido** (Solo `admin`)
* **Parámetros**:
  * `id`: UUID de la habitación.

---

## 👥 Módulo de Huéspedes (`/huespedes`)

Gestión de los perfiles y fichas de los clientes del hotel.

### 1. Obtener Métricas Generales
* **Ruta**: `GET /huespedes/metricas`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Descripción**: Devuelve números generales del hotel: huéspedes activos en este momento, huéspedes históricos y el total histórico registrado.

### 2. Autocompletar / Buscar Huésped
* **Ruta**: `GET /huespedes/buscar`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Parámetros de Consulta**:
  * `q` (Query): Término de búsqueda (DNI o Nombre).
* **Descripción**: Útil para rellenar fichas rápidamente en el mostrador.

### 3. Listar Todos los Huéspedes
* **Ruta**: `GET /huespedes`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)

### 4. Registrar Huésped
* **Ruta**: `POST /huespedes`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Cuerpo de la Petición (JSON)**:
  ```json
  {
    "nombre": "Juan Pérez",
    "dni": "12345678",
    "celular": "999888777"
  }
  ```

### 5. Actualizar Datos de Huésped
* **Ruta**: `PATCH /huespedes/:id`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Parámetros**:
  * `id`: UUID del huésped.
* **Cuerpo de la Petición (JSON)**:
  ```json
  {
    "celular": "999111222"
  }
  ```

### 6. Eliminar Huésped (Lógico / Papelera)
* **Ruta**: `DELETE /huespedes/:id`
* **Acceso**: **Protegido** (`admin`, `supervisor`)
* **Descripción**: Envía al huésped a la papelera (soft delete) para preservar el historial.

---

## 🔑 Módulo de Estancias (`/estancias`)

Controla el hospedaje del cliente: registros de entrada (Check-in), listados activos e históricos, y salidas (Check-out).

### 1. Consultar Historial de Salidas
* **Ruta**: `GET /estancias/historial-salidas`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Parámetros de Consulta** (Opcionales):
  * `termino`: Filtrar por Nombre o DNI del huésped.
  * `pagina`: Número de página para la paginación.
* **Descripción**: Herramienta de auditoría para analizar salidas cerradas.

### 2. Registrar Check-in (Huésped y Estancia)
* **Ruta**: `POST /estancias/check-in-nuevo`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Cuerpo de la Petición (JSON)**:
  ```json
  {
    "nombre": "María Rojas",
    "dni": "87654321",
    "celular": "987654321",
    "habitacionId": "uuid-de-habitacion",
    "total_pagar": 300.00,
    "fecha_salida_programada": "2026-07-30T13:00:00",
    "pago_inicial": 100.00,       // Opcional
    "metodo_pago": "efectivo"    // Opcional, requerido si hay pago_inicial ('efectivo', 'tarjeta', 'transferencia')
  }
  ```
* **Descripción**: Da de alta al huésped (si no existe), ocupa la habitación asignada, registra la estancia con fecha de entrada actual y genera su cargo inicial en caja.

### 3. Listar Estancias Activas
* **Ruta**: `GET /estancias`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Parámetros de Consulta** (Opcionales):
  * `estado`: Estado de la estancia (`pendiente`, `pagado`, `finalizado`).
  * `page`: Número de página (por defecto 1, resultados paginados de 5 en 5).

### 4. Registrar Check-out (Finalizar Estancia)
* **Ruta**: `PATCH /estancias/:id/check-out`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)
* **Parámetros**:
  * `id`: UUID de la estancia.
* **Descripción**: Cambia el estado de la estancia a `'finalizado'`, inyecta la fecha de salida real, cambia el estado de la habitación asignada a `'limpieza'` y emite un evento de notificación del check-out. Devuelve el resumen financiero acumulado de la estancia para caja.

---

## ⚙️ Módulo de Configuraciones (`/configuraciones`)

Parámetros globales del hotel (como información de red Wifi, etc).

### 1. Listar Todas las Configuraciones
* **Ruta**: `GET /configuraciones`
* **Acceso**: **Protegido** (`admin`, `supervisor`, `recepcionista`)

### 2. Actualizar Configuración por Llave
* **Ruta**: `PATCH /configuraciones/:llave`
* **Acceso**: **Protegido** (`admin`, `supervisor`)
* **Parámetros**:
  * `llave`: Clave identificadora única de la configuración (ej: `wifi_clave`, `wifi_nombre`).
* **Cuerpo de la Petición (JSON)**:
  ```json
  {
    "valor": "NuevaClaveWifi123"
  }
  ```
* **Restricción especial**: El rol `supervisor` solo puede modificar llaves autorizadas relativas a WiFi (`wifi_nombre` y `wifi_clave`). Otros roles (excepto `admin`) verán bloqueada esta acción.
