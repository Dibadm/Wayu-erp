import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()

  // Delete extra locations, keep only WH-MAIN
  const result = await prisma.$executeRaw`
    DELETE FROM locations WHERE code != 'WH-MAIN'
  `
  console.log('Deleted extra locations:', result)

  // Verify
  const locs = await prisma.location.findMany()
  console.log('Remaining locations:', locs.map((l: any) => l.code))

  await prisma.$disconnect()
}

main().catch(console.error)
