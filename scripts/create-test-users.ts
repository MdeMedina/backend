import 'dotenv/config'; // 1. Cargar variables de entorno
import { PrismaClient, UserRole } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg'; // 2. Importar el adaptador
import pg from 'pg'; // 3. Importar el driver nativo
import * as bcrypt from 'bcrypt';

// 4. Configurar la conexión nativa
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// 5. Instanciar el cliente usando el adaptador (Estilo Prisma 7)
const prisma = new PrismaClient({ adapter });

// ... el resto de tu lógica de creación de usuarios sigue igual
interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
}

const testUsers: TestUser[] = [
  {
    email: 'admin@test.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Usuario',
    role: UserRole.ADMIN,
    phone: '+1234567890',
  },
  {
    email: 'propietario@test.com',
    password: 'Propietario123!',
    firstName: 'Juan',
    lastName: 'Propietario',
    role: UserRole.OWNER,
    phone: '+1234567891',
  },
  {
    email: 'responsable@test.com',
    password: 'Responsable123!',
    firstName: 'María',
    lastName: 'Responsable',
    role: UserRole.ASSIGNED_MANAGER,
    phone: '+1234567892',
  },
  {
    email: 'conserje@test.com',
    password: 'Conserje123!',
    firstName: 'Pedro',
    lastName: 'Conserje',
    role: UserRole.CONCIERGE,
    phone: '+1234567893',
  },
];

async function createTestUsers() {
  console.log('🚀 Creando usuarios de prueba...\n');

  for (const userData of testUsers) {
    try {
      // Verificar si ya existe
      const existing = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existing) {
        console.log(`⚠️  Usuario ${userData.email} ya existe. Saltando...`);
        continue;
      }

      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          phone: userData.phone,
          isActive: true,
        },
      });

      console.log(`✅ Usuario creado exitosamente:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Contraseña: ${userData.password}`);
      console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   ID: ${user.id}\n`);
    } catch (error) {
      console.error(`❌ Error al crear usuario ${userData.email}:`, error);
    }
  }

  console.log('✨ Proceso completado!');
}

createTestUsers()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
