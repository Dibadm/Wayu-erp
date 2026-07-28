const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const r = await p.$queryRaw`
      SELECT
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='users' AND column_name='isSalesperson') AS users_isSalesperson,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='products' AND column_name='maxStockLevel') AS products_maxStockLevel,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='customers' AND column_name='tinNo') AS customers_tinNo,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='customers' AND column_name='taxable') AS customers_taxable,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='sales' AND column_name='salespersonId') AS sales_salespersonId,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='sales' AND column_name='importBatchId') AS sales_importBatchId,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='sales' AND column_name='source') AS sales_source,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='sales' AND column_name='ethiopianMonth') AS sales_ethiopianMonth,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='sales' AND column_name='taxable') AS sales_taxable,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_name='sale_items' AND column_name='commissionAmount') AS saleitems_commissionAmount,
        (SELECT count(*)::int FROM information_schema.tables WHERE table_name='commission_rates') AS t_commission_rates,
        (SELECT count(*)::int FROM information_schema.tables WHERE table_name='import_batches') AS t_import_batches,
        (SELECT count(*)::int FROM information_schema.tables WHERE table_name='sync_conflicts') AS t_sync_conflicts,
        (SELECT count(*)::int FROM information_schema.tables WHERE table_name='settings') AS t_settings,
        (SELECT count(*)::int FROM information_schema.constraint_column_usage WHERE constraint_name='sales_importBatchId_fkey') AS fk_importBatchId`;
    console.log(JSON.stringify(r[0], null, 1));
  } catch (e) { console.log('ERR', String(e.message).split('\n')[0]); }
  finally { await p.$disconnect(); }
})();
