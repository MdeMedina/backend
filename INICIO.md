# 🚀 Guía de Inicio del Backend

## 📋 Prerrequisitos

1. **PostgreSQL** instalado y corriendo
2. **Node.js** (v18 o superior)
3. **npm** o **yarn**

## 🔧 Configuración Inicial

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `backend` basándote en `.env.example`:

```bash
# Copiar el ejemplo
cp .env.example .env
```

Edita el archivo `.env` y configura:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_base_datos?schema=public"

# Puerto del servidor
PORT=3000

# URL del frontend
FRONTEND_URL=http://localhost:5173

# JWT Secrets (¡IMPORTANTE! Cambiar en producción)
JWT_SECRET=tu_clave_secreta_super_segura_aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=tu_clave_refresh_secreta_super_segura_aqui
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Configurar la base de datos

#### Opción A: Crear base de datos manualmente

```sql
CREATE DATABASE nombre_base_datos;
```

#### Opción B: Usar psql

```bash
psql -U postgres
CREATE DATABASE nombre_base_datos;
\q
```

### 4. Ejecutar migraciones de Prisma

```bash
# Generar el cliente de Prisma
npx prisma generate

# Ejecutar migraciones (crear tablas)
npx prisma migrate dev

# O si prefieres aplicar sin crear nueva migración
npx prisma db push
```

## 👥 Crear Usuarios de Prueba

### Crear usuarios de prueba (todos los roles)

```bash
npm run create-test-users
```

Esto creará los siguientes usuarios:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@test.com | Admin123! | ADMIN |
| propietario@test.com | Propietario123! | OWNER |
| responsable@test.com | Responsable123! | ASSIGNED_MANAGER |
| conserje@test.com | Conserje123! | CONCIERGE |

### Crear solo usuario administrador

```bash
npm run create-admin
```

O con variables de entorno personalizadas:

```bash
ADMIN_EMAIL=miadmin@test.com ADMIN_PASSWORD=MiPassword123! npm run create-admin
```

## ▶️ Iniciar el Servidor

### Modo desarrollo (con hot-reload)

```bash
npm run start:dev
```

El servidor estará disponible en: `http://localhost:3000`

### Modo producción

```bash
# Primero compilar
npm run build

# Luego ejecutar
npm run start:prod
```

### Modo debug

```bash
npm run start:debug
```

## 🧪 Verificar que funciona

1. El servidor debería mostrar: `Application is running on: http://localhost:3000`
2. Puedes probar el endpoint de salud (si existe) o hacer login con los usuarios de prueba

## 📝 Comandos Útiles

```bash
# Ver datos en la base de datos (Prisma Studio)
npx prisma studio

# Resetear base de datos (¡CUIDADO! Borra todos los datos)
npx prisma migrate reset

# Ver estado de migraciones
npx prisma migrate status

# Generar cliente de Prisma después de cambios en schema
npx prisma generate
```

## 🔍 Solución de Problemas

### Error: "Can't reach database server"

- Verifica que PostgreSQL esté corriendo
- Verifica la `DATABASE_URL` en `.env`
- Verifica credenciales de la base de datos

### Error: "Prisma Client not generated"

```bash
npx prisma generate
```

### Error: "Port already in use"

Cambia el `PORT` en el archivo `.env` o detén el proceso que está usando el puerto 3000.

## 📚 Próximos Pasos

1. ✅ Backend corriendo
2. ✅ Usuarios de prueba creados
3. 🔄 Iniciar el frontend
4. 🔄 Probar el login con los usuarios de prueba

