const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const u = await p.user.findMany({ take: 1 });
    const c = await p.$queryRaw`SELECT current_database() db`;
    console.log('DB OK. db=', c[0].db);
    console.log('user count=', u.length);
  } catch (e) {
    console.log('DB ERROR:', String(e.message).split('\n')[0]);
  } finally {
    await p.$disconnect();
  }
})();
