const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const cols = await p.$queryRaw`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('users','products','customers','sales','sale_items','commission_rates','import_batches','sync_conflicts','settings')
      ORDER BY table_name, ordinal_position`;
    console.log(JSON.stringify(cols, null, 1));
  } catch (e) {
    console.log('ERR', String(e.message).split('\n')[0]);
  } finally { await p.$disconnect(); }
})();
