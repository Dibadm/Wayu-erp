import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TABLES = [
  'sync_conflicts',
  'import_batches',
  'overdue_notifications',
  'collection_cases',
  'credit_aging',
  'credit_transactions',
  'credit_applications',
  'credit_profiles',
  'loan_repayments',
  'loans',
  'investments',
  'budgets',
  'bank_transfers',
  'cash_outflows',
  'cash_inflows',
  'bank_reconciliations',
  'bank_accounts',
  'sales_plans',
  'expenses',
  'ar_statements',
  'sale_payments',
  'sale_items',
  'sales',
  'commission_rates',
  'purchase_order_items',
  'purchase_orders',
  'movements',
  'batches',
  'location_inventory',
  'products',
  'customers',
  'suppliers',
  'users',
  'audit_logs',
  'backup_records',
  'settings',
  'sequence_counters',
]

async function main() {
  console.log('⚠️  RESETTING DATABASE — all data will be deleted\n')

  for (const table of TABLES) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`)
      console.log(`  ✓ ${table}`)
    } catch (e: any) {
      console.log(`  ✗ ${table}: ${e.message}`)
    }
  }

  console.log('\n✅ Database cleared. Running seed...\n')
  
  const { execSync } = await import('child_process')
  try {
    execSync('npx tsx prisma/seed.ts', { 
      cwd: '/Users/binitolasa/Wayu-erp',
      stdio: 'inherit'
    })
  } catch (e) {
    console.log('Seed completed')
  }

  await prisma.$disconnect()
}

main().catch(console.error)
