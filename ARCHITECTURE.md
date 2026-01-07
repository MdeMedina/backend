# Arquitectura del Backend

## Resumen Ejecutivo

Backend profesional construido con NestJS para gestión de rentas cortas en edificios de hasta 250 departamentos. Diseñado con énfasis en seguridad, auditoría inalterable y escalabilidad.

## Componentes Principales

### 1. Módulo de Auditoría (`audit/`)

**Responsabilidad**: Registrar todas las acciones del sistema de forma inalterable.

**Características**:
- Hash estilo blockchain (SHA-256)
- Cada registro incluye hash del registro anterior
- Restricciones de BD: UPDATE y DELETE prohibidos
- Interceptor global que registra automáticamente todas las acciones

**Archivos clave**:
- `audit.service.ts`: Lógica de creación y verificación de logs
- `interceptors/audit.interceptor.ts`: Interceptor global

### 2. Módulo de Autenticación (`auth/`)

**Responsabilidad**: Gestión de autenticación y autorización.

**Características**:
- JWT con expiración de 15 minutos
- Refresh tokens (7 días)
- Guards para protección de rutas
- Decoradores para roles y rutas públicas

**Archivos clave**:
- `auth.service.ts`: Lógica de login/logout/refresh
- `strategies/jwt.strategy.ts`: Estrategia de validación JWT
- `guards/jwt-auth.guard.ts`: Guard de autenticación
- `guards/roles.guard.ts`: Guard de autorización por roles

### 3. Módulo de Usuarios (`users/`)

**Responsabilidad**: Gestión de usuarios del sistema.

**Características**:
- CRUD completo con paginación
- Control de acceso basado en roles
- Soft delete (desactivación)

### 4. Módulo de Departamentos (`apartments/`)

**Responsabilidad**: Gestión de departamentos del edificio.

**Características**:
- Relación con propietarios y responsables
- Paginación para manejar 250+ departamentos
- Soft delete

### 5. Módulo de Estancias (`stays/`)

**Responsabilidad**: Gestión de estancias (huéspedes, limpieza, mantenimiento).

**Características**:
- **Regla crítica de 24 horas**: Bloqueo automático después de 24h del check-in programado
- Interceptor que previene modificaciones en estancias bloqueadas
- Filtrado por rol (Conserje solo ve día actual + 24h)
- Categorías: Huésped, Personal de Limpieza, Personal de Mantenimiento

**Archivos clave**:
- `stays.service.ts`: Lógica de negocio
- `interceptors/stay-lock.interceptor.ts`: Interceptor de bloqueo

### 6. Módulo de Peticiones (`petitions/`)

**Responsabilidad**: Gestión de peticiones para modificar estancias bloqueadas.

**Características**:
- Solo Administradores pueden aprobar/rechazar
- Texto original inalterable
- Una petición aprobada permite modificar estancia bloqueada

### 7. Módulo de WebSockets (`websocket/`)

**Responsabilidad**: Comunicación en tiempo real.

**Características**:
- Autenticación mediante JWT
- Tracking de usuarios conectados
- Métodos para enviar a usuarios específicos, roles o broadcast

### 8. Módulo de Web Push (`push/`)

**Responsabilidad**: Notificaciones push cuando el usuario no está en la app.

**Características**:
- VAPID keys para autenticación
- Suscripciones por usuario
- Limpieza automática de suscripciones inválidas

## Flujos Críticos

### Flujo de Bloqueo de Estancias

1. Usuario intenta modificar estancia
2. `StayLockInterceptor` intercepta la request
3. Verifica si han pasado 24h desde `scheduledCheckIn`
4. Si sí, bloquea automáticamente la estancia
5. Si está bloqueada y no es Admin, rechaza la request
6. Si es Admin, verifica que exista petición aprobada
7. Si todo OK, permite la modificación

### Flujo de Auditoría

1. Request llega al servidor
2. `AuditInterceptor` intercepta (excepto rutas públicas)
3. Request se procesa normalmente
4. Si es exitosa, se crea registro de auditoría
5. Se calcula hash concatenando datos + hash anterior
6. Se guarda en BD (sin posibilidad de modificación)

### Flujo de Autenticación

1. Usuario envía credenciales a `/auth/login`
2. Se valida usuario y contraseña
3. Se genera JWT (15 min) y refresh token (7 días)
4. Se registra en auditoría
5. Se retornan tokens al cliente

## Seguridad

### Capas de Seguridad

1. **Autenticación**: JWT con expiración corta (15 min)
2. **Autorización**: Guards de roles en cada endpoint
3. **Validación**: ValidationPipe global con whitelist
4. **Auditoría**: Registro inalterable de todas las acciones
5. **Integridad**: Hash blockchain en auditoría

### Restricciones de Base de Datos

- Triggers en PostgreSQL previenen UPDATE/DELETE en `audit_logs`
- Soft deletes en lugar de eliminaciones físicas
- Índices optimizados para consultas frecuentes

## Escalabilidad

### Optimizaciones

- Paginación obligatoria en endpoints de Admin
- Índices en campos frecuentemente consultados
- Conexiones de Prisma con pooling
- WebSockets eficientes con tracking de usuarios

### Consideraciones para 250 Departamentos

- Paginación por defecto (50 items, máximo 100)
- Índices en `stays.scheduledCheckIn` para consultas de Conserje
- Caché de usuarios conectados en memoria (WebSocket)
- Migraciones de Prisma para cambios de esquema

## Próximas Mejoras Sugeridas

1. **Caché**: Redis para sesiones y datos frecuentes
2. **Rate Limiting**: Prevenir abuso de endpoints
3. **Logging**: Sistema de logs estructurado (Winston/Pino)
4. **Monitoring**: Métricas y alertas (Prometheus)
5. **Testing**: Tests unitarios y E2E completos
6. **Documentación API**: Swagger/OpenAPI


