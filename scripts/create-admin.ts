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

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME || 'User';

  // Verificar si ya existe
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`User with email ${email} already exists.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('Admin user created successfully:');
  console.log(`Email: ${admin.email}`);
  console.log(`ID: ${admin.id}`);
  console.log(`Role: ${admin.role}`);
}

createAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
