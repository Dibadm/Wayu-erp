const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const t = await p.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations'`;
    console.log('migrations table?', JSON.stringify(t));
    const m = await p.$queryRaw`SELECT * FROM "_prisma_migrations" LIMIT 5`;
    console.log('migration rows:', JSON.stringify(m, null, 1));
  } catch (e) {
    console.log('ERR', String(e.message).split('\n')[0]);
  } finally { await p.$disconnect(); }
})();
