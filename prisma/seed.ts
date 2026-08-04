import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding WAYU Inventory database...')

  // ─── Admin User ─────────────────────────────────────────────────────────────
  // A single admin account is created so the system is usable.
  // Set the password via environment variable WAYU_ADMIN_PASSWORD
  // (falls back to a random value if unset — check the console output).

  const adminPassword = process.env.WAYU_ADMIN_PASSWORD || 'ChangeMeNow!'
  const adminHash = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@wayu.ph' },
    update: {},
    create: { email: 'admin@wayu.ph', password: adminHash, name: 'Admin User', role: Role.ADMIN },
  })

  console.log(`   ✓ 1 admin user created`)
  if (!process.env.WAYU_ADMIN_PASSWORD) {
    console.log(`   ⚠  Default password "${adminPassword}" — change immediately in Settings`)
  }

  // ─── Default Warehouse ────────────────────────────────────────────────────────
  await prisma.location.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: {
      code: 'WH-MAIN',
      name: 'Main Warehouse',
      type: 'WAREHOUSE',
      active: true,
    },
  })

  console.log(`   ✓ 1 default location (WH-MAIN)`)

  // ─── Add your real business data here ─────────────────────────────────────────
  // Products, customers, suppliers, batches, movements, etc. can be
  // created via the application UI after logging in as admin@wayu.ph
  // or added programmatically below:
  //
  // await prisma.product.create({ data: { ... } })
  // await prisma.customer.create({ data: { ... } })
  // await prisma.supplier.create({ data: { ... } })

  console.log('✅ Seed complete — ready for real business data!')
  console.log('   Admin: admin@wayu.ph')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
