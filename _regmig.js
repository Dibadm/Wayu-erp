const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

(async () => {
  try {
    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT NOT NULL,
        "checksum" TEXT NOT NULL,
        "finished_at" TIMESTAMP WITH TIME ZONE,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMP WITH TIME ZONE,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL,
        PRIMARY KEY ("id")
      );
    `);

    const migrationName = 'phase1_finance_sync';
    const sql = fs.readFileSync('prisma/migrations/phase1_finance_sync/migration.sql', 'utf8');
    const crypto = require('crypto');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    const existing = await p.$queryRawUnsafe(
      `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
      migrationName
    );
    if (existing.length > 0) {
      console.log('Migration already registered:', migrationName);
    } else {
      await p.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, CURRENT_TIMESTAMP, $4)`,
        uid(), checksum, migrationName, 31
      );
      console.log('Registered migration:', migrationName);
    }
  } catch (e) {
    console.log('ERR FULL:', e.message);
  } finally { await p.$disconnect(); }
})();
