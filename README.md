# Backend - Plataforma de Gestión de Rentas Cortas

Backend profesional para gestión de rentas cortas en edificios de hasta 250 departamentos.

## Stack Tecnológico

- **NestJS** - Framework Node.js
- **PostgreSQL** - Base de datos
- **Prisma** - ORM
- **JWT** - Autenticación (expiración 15 minutos)
- **Socket.io** - WebSockets para usuarios activos
- **Web Push** - Notificaciones push (VAPID)

## Características Principales

### 1. Auditoría Inalterable (Back Log)
- Tabla `audit_logs` con hash estilo blockchain (SHA-256)
- Cada registro incluye el hash del registro anterior
- **Restricciones de base de datos**: UPDATE y DELETE están prohibidos
- Verificación de integridad de la cadena

### 2. Gestión de Estancias
- Categorías: Huésped, Personal de Limpieza, Personal de Mantenimiento
- **Regla de bloqueo de 24 horas**: Después de 24h del check-in programado, las estancias se bloquean automáticamente
- Solo Administradores pueden modificar estancias bloqueadas (requiere petición aprobada)

### 3. Sistema de Roles
- **ADMIN**: Acceso completo, puede revisar peticiones
- **OWNER**: Propietario de departamentos
- **ASSIGNED_MANAGER**: Responsable asignado
- **CONCIERGE**: Solo visualiza registros del día actual hasta 24 horas después

### 4. Autenticación
- JWT con expiración estricta de 15 minutos
- Refresh tokens con expiración de 7 días
- Endpoints protegidos con guards y roles

### 5. WebSockets
- Conexión en tiempo real para usuarios activos
- Notificaciones de eventos en vivo
- Autenticación mediante JWT

### 6. Web Push Notifications
- Notificaciones cuando el usuario no tiene la pestaña abierta
- Configuración VAPID requerida

## Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del backend:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Server
PORT=3000
FRONTEND_URL="http://localhost:5173"

# VAPID Keys (para Web Push)
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:admin@example.com"
```

### Generar VAPID Keys

```bash
npx web-push generate-vapid-keys
```

### Instalación

```bash
npm install
```

### Base de Datos

1. Generar Prisma Client:
```bash
npx prisma generate
```

2. Crear migraciones:
```bash
npx prisma migrate dev --name init
```

3. Aplicar restricciones de auditoría:
```bash
# Ejecutar el script SQL manualmente en tu base de datos
psql -d your_database -f prisma/migrations/001_prevent_audit_log_modifications.sql
```

O ejecutar el SQL directamente en tu cliente de PostgreSQL.

## Estructura del Proyecto

```
src/
├── auth/              # Autenticación JWT
├── users/             # Gestión de usuarios
├── apartments/        # Gestión de departamentos
├── stays/             # Gestión de estancias
│   └── interceptors/  # Interceptor de bloqueo 24h
├── petitions/         # Peticiones para estancias bloqueadas
├── audit/             # Servicio de auditoría inalterable
│   └── interceptors/  # Interceptor de auditoría automática
├── websocket/         # Gateway de WebSockets
├── push/              # Servicio de Web Push Notifications
└── prisma/            # Servicio de Prisma
```

## Endpoints Principales

### Autenticación
- `POST /auth/login` - Iniciar sesión
- `POST /auth/refresh` - Refrescar token
- `POST /auth/logout` - Cerrar sesión

### Usuarios
- `GET /users` - Listar usuarios (Admin, con paginación)
- `GET /users/:id` - Obtener usuario
- `POST /users` - Crear usuario (Admin)
- `PATCH /users/:id` - Actualizar usuario
- `DELETE /users/:id` - Desactivar usuario (Admin)

### Departamentos
- `GET /apartments` - Listar departamentos (con paginación)
- `GET /apartments/:id` - Obtener departamento
- `POST /apartments` - Crear departamento
- `PATCH /apartments/:id` - Actualizar departamento
- `DELETE /apartments/:id` - Desactivar departamento

### Estancias
- `GET /stays` - Listar estancias (filtrado por rol)
- `GET /stays/:id` - Obtener estancia
- `POST /stays` - Crear estancia
- `PATCH /stays/:id` - Actualizar estancia (bloqueo automático después de 24h)
- `POST /stays/:id/check-in` - Check-in
- `POST /stays/:id/check-out` - Check-out

### Peticiones
- `POST /petitions` - Crear petición para estancia bloqueada
- `GET /petitions` - Listar peticiones (Admin)
- `GET /petitions/:id` - Obtener petición
- `PATCH /petitions/:id/review` - Revisar petición (Admin)

### Web Push
- `POST /push/subscribe` - Suscribirse a notificaciones
- `DELETE /push/unsubscribe` - Desuscribirse
- `GET /push/public-key` - Obtener clave pública VAPID

## Reglas de Negocio

### Bloqueo de Estancias
- Después de 24 horas del `scheduledCheckIn`, la estancia se bloquea automáticamente
- Solo Administradores pueden modificar estancias bloqueadas
- Requiere una petición aprobada para modificar estancias bloqueadas
- El texto original de la petición no se puede modificar

### Conserjes
- Solo pueden visualizar estancias programadas para el día actual hasta 24 horas después
- No pueden modificar estancias bloqueadas

### Auditoría
- Todos los endpoints están auditados automáticamente
- La tabla `audit_logs` es inmutable (no UPDATE, no DELETE)
- Hash estilo blockchain garantiza la integridad

## Desarrollo

```bash
# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## Próximos Pasos

1. Configurar variables de entorno
2. Generar y aplicar migraciones de Prisma
3. Ejecutar script SQL de restricciones de auditoría
4. Generar VAPID keys para Web Push
5. Crear usuario administrador inicial
