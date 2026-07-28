const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function splitStatements(sql) {
  const cleaned = sql.replace(/^\uFEFF/, ''); // strip BOM
  const stmts = [];
  let cur = '';
  for (const line of cleaned.split('\n')) {
    const l = line.trim();
    if (!l || l.startsWith('--')) continue;
    cur += ' ' + l;
    if (l.endsWith(';')) {
      stmts.push(cur.trim().replace(/;$/, ''));
      cur = '';
    }
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts;
}

(async () => {
  const sql = fs.readFileSync('prisma/migrations/phase1_finance_sync/migration.sql', 'utf8');
  const stmts = splitStatements(sql);
  console.log('Executing', stmts.length, 'statements...');
  let ok = 0, skip = 0, err = 0;
  for (const s of stmts) {
    try {
      await p.$executeRawUnsafe(s);
      ok++;
    } catch (e) {
      const msg = String(e.message).split('\n')[0];
      if (/already exists|duplicate/.test(msg)) { skip++; console.log('SKIP:', msg.slice(0, 80)); }
      else { err++; console.log('ERROR:', msg.slice(0, 120)); console.log('STMT:', s.slice(0, 120)); }
    }
  }
  console.log(`Done. ok=${ok} skip=${skip} err=${err}`);
  await p.$disconnect();
  if (err > 0) process.exitCode = 1;
})();
