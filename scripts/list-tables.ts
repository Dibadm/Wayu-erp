import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  
  const result: any[] = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `
  console.log(result.map((r: any) => r.table_name).join('\n'))
  
  await prisma.$disconnect()
}

main().catch(console.error)
