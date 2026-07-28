import { PrismaClient, Role, CreditRisk, CreditAppStatus, CreditTxnType, CollectionPriority, CollectionStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding WAYU Inventory database...')

  // ─── Users ──────────────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@wayu.ph' },
    update: {},
    create: { email: 'admin@wayu.ph', password: adminHash, name: 'Admin User', role: Role.ADMIN },
  })

  const staffHash = await bcrypt.hash('staff123', 12)
  const staff = await prisma.user.upsert({
    where: { email: 'staff@wayu.ph' },
    update: {},
    create: { email: 'staff@wayu.ph', password: staffHash, name: 'Staff User', role: Role.STAFF },
  })

  const gedyHash = await bcrypt.hash('gedy123', 12)
  const gedy = await prisma.user.upsert({
    where: { email: 'gedy@wayu.ph' },
    update: {},
    create: { email: 'gedy@wayu.ph', password: gedyHash, name: 'Gedy', role: Role.ADMIN },
  })

  // New role-based users
  const financeHash = await bcrypt.hash('finance123', 12)
  const finance = await prisma.user.upsert({
    where: { email: 'finance@wayu.ph' },
    update: {},
    create: { email: 'finance@wayu.ph', password: financeHash, name: 'Finance Officer', role: Role.FINANCE },
  })

  const inventoryHash = await bcrypt.hash('inventory123', 12)
  const inventory = await prisma.user.upsert({
    where: { email: 'inventory@wayu.ph' },
    update: {},
    create: { email: 'inventory@wayu.ph', password: inventoryHash, name: 'Inventory Manager', role: Role.INVENTORY },
  })

  const salesHash = await bcrypt.hash('sales123', 12)
  const sales = await prisma.user.upsert({
    where: { email: 'sales@wayu.ph' },
    update: {},
    create: { email: 'sales@wayu.ph', password: salesHash, name: 'Sales Officer', role: Role.SALES },
  })

  const creditHash = await bcrypt.hash('credit123', 12)
  const credit = await prisma.user.upsert({
    where: { email: 'credit@wayu.ph' },
    update: {},
    create: { email: 'credit@wayu.ph', password: creditHash, name: 'Credit Officer', role: Role.CREDIT_OFFICER },
  })

  const viewerHash = await bcrypt.hash('viewer123', 12)
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@wayu.ph' },
    update: {},
    create: { email: 'viewer@wayu.ph', password: viewerHash, name: 'Viewer User', role: Role.VIEWER },
  })

  console.log(`   ✓ 8 users seeded`)

  // ─── Products ───────────────────────────────────────────────────────────────

  const products = [
    { sku: 'WY-AMX-500', name: 'Amoxicillin 500mg', category: 'Antibiotics', quantity: 240, minStockLevel: 50, unit: 'capsules', description: 'Broad-spectrum antibiotic' },
    { sku: 'WY-PCM-650', name: 'Paracetamol 650mg', category: 'Analgesics', quantity: 8, minStockLevel: 100, unit: 'tablets', description: 'Pain relief and fever reducer' },
    { sku: 'WY-IBP-400', name: 'Ibuprofen 400mg', category: 'NSAIDs', quantity: 180, minStockLevel: 60, unit: 'tablets', description: 'Anti-inflammatory analgesic' },
    { sku: 'WY-OMP-20', name: 'Omeprazole 20mg', category: 'Antacids', quantity: 5, minStockLevel: 40, unit: 'capsules', description: 'Proton pump inhibitor' },
    { sku: 'WY-MET-500', name: 'Metformin 500mg', category: 'Antidiabetics', quantity: 320, minStockLevel: 80, unit: 'tablets', description: 'Type 2 diabetes management' },
    { sku: 'WY-AML-5', name: 'Amlodipine 5mg', category: 'Antihypertensives', quantity: 12, minStockLevel: 30, unit: 'tablets', description: 'Calcium channel blocker' },
    { sku: 'WY-CET-10', name: 'Cetirizine 10mg', category: 'Antihistamines', quantity: 150, minStockLevel: 50, unit: 'tablets', description: 'Allergy relief' },
    { sku: 'WY-AZT-500', name: 'Azithromycin 500mg', category: 'Antibiotics', quantity: 60, minStockLevel: 25, unit: 'tablets', description: 'Macrolide antibiotic' },
    { sku: 'WY-VIT-C1K', name: 'Vitamin C 1000mg', category: 'Vitamins', quantity: 400, minStockLevel: 100, unit: 'tablets', description: 'Immune support supplement' },
    { sku: 'WY-DXM-15', name: 'Dextromethorphan 15mg', category: 'Cough & Cold', quantity: 90, minStockLevel: 30, unit: 'tablets', description: 'Cough suppressant' },
  ]

  const createdProducts: any[] = []
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: { quantity: p.quantity },
      create: p,
    })
    createdProducts.push(product)
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  const customers = [
    { name: 'Addis General Hospital', phone: '+251-11-123-4567', email: 'procurement@addisgeneral.et', tinNo: 'TIN-001-001', taxable: true },
    { name: 'St. Gabriel Medical Center', phone: '+251-11-234-5678', email: 'supply@stgabriel.et', tinNo: 'TIN-002-002', taxable: true },
    { name: 'Rift Valley Pharmacy', phone: '+251-11-345-6789', email: 'orders@riftvalley.et', tinNo: 'TIN-003-003', taxable: false },
    { name: 'Hilwa Medical Supplies', phone: '+251-11-456-7890', email: 'info@hilwamedical.et', tinNo: 'TIN-004-004', taxable: true },
  ]

  const createdCustomers: any[] = []
  for (const c of customers) {
    const customer = await prisma.customer.upsert({
      where: { email: c.email },
      update: c,
      create: c,
    })
    createdCustomers.push(customer)
  }

  // ─── Credit Management Seed ─────────────────────────────────────────────────

  // 2-3 Credit Profiles
  const profile1 = await prisma.creditProfile.upsert({
    where: { customerId: createdCustomers[0].id },
    update: {},
    create: {
      customerId: createdCustomers[0].id,
      creditLimit: 500000,
      availableCredit: 320000,
      utilizedCredit: 180000,
      creditScore: 720,
      riskLevel: CreditRisk.MEDIUM,
      paymentTerms: 45,
      isActive: true,
      isBlocked: false,
      approvedBy: admin.id,
      approvedAt: new Date(),
      notes: 'Hospital bulk supply agreement — approved with enhanced terms',
    },
  })

  const profile2 = await prisma.creditProfile.upsert({
    where: { customerId: createdCustomers[1].id },
    update: {},
    create: {
      customerId: createdCustomers[1].id,
      creditLimit: 300000,
      availableCredit: 295000,
      utilizedCredit: 5000,
      creditScore: 810,
      riskLevel: CreditRisk.LOW,
      paymentTerms: 30,
      isActive: true,
      isBlocked: false,
      approvedBy: admin.id,
      approvedAt: new Date(),
      notes: 'Low-risk clinic with excellent payment history',
    },
  })

  const profile3 = await prisma.creditProfile.upsert({
    where: { customerId: createdCustomers[2].id },
    update: {},
    create: {
      customerId: createdCustomers[2].id,
      creditLimit: 150000,
      availableCredit: 0,
      utilizedCredit: 150000,
      creditScore: 520,
      riskLevel: CreditRisk.HIGH,
      paymentTerms: 30,
      isActive: true,
      isBlocked: true,
      blockReason: 'Overdue payments exceeding 60 days',
      approvedBy: admin.id,
      approvedAt: new Date(),
      notes: 'High-risk account — currently blocked',
    },
  })

  console.log(`   ✓ 3 credit profiles seeded`)

  // 2-3 Credit Applications
  const app1 = await prisma.creditApplication.upsert({
    where: { applicationNo: 'CA-2024-0004' },
    update: {},
    create: {
      applicationNo: 'CA-2024-0004',
      customerId: createdCustomers[0].id,
      requestedLimit: 500000,
      requestedTerms: 45,
      purpose: 'Hospital bulk supply agreement',
      status: CreditAppStatus.APPROVED,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      profileId: profile1.id,
    },
  })

  const app2 = await prisma.creditApplication.upsert({
    where: { applicationNo: 'CA-2024-0005' },
    update: {},
    create: {
      applicationNo: 'CA-2024-0005',
      customerId: createdCustomers[3].id,
      requestedLimit: 250000,
      requestedTerms: 30,
      purpose: 'New distributor credit line',
      status: CreditAppStatus.PENDING,
    },
  })

  const app3 = await prisma.creditApplication.upsert({
    where: { applicationNo: 'CA-2024-0006' },
    update: {},
    create: {
      applicationNo: 'CA-2024-0006',
      customerId: createdCustomers[2].id,
      requestedLimit: 100000,
      requestedTerms: 30,
      purpose: 'Credit limit increase request',
      status: CreditAppStatus.REJECTED,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      rejectionReason: 'Poor payment history — overdue invoices exceed 60 days',
    },
  })

  console.log(`   ✓ 3 credit applications seeded`)

  // Credit Transactions
  await prisma.creditTransaction.create({
    data: {
      type: CreditTxnType.LIMIT_CHANGE,
      amount: 500000,
      oldValue: '0',
      newValue: '500000',
      reason: 'Initial credit limit approval for Addis General Hospital',
      createdById: admin.id,
      profileId: profile1.id,
    },
  })

  await prisma.creditTransaction.create({
    data: {
      type: CreditTxnType.LIMIT_CHANGE,
      amount: 150000,
      oldValue: '0',
      newValue: '150000',
      reason: 'Initial credit limit for Rift Valley Pharmacy',
      createdById: admin.id,
      profileId: profile3.id,
    },
  })

  await prisma.creditTransaction.create({
    data: {
      type: CreditTxnType.NOTE,
      oldValue: '',
      newValue: 'Payment delayed — 45 days outstanding',
      reason: 'Customer communication regarding overdue invoice INV-2024-089',
      createdById: credit.id,
      profileId: profile3.id,
    },
  })

  console.log(`   ✓ 3 credit transactions seeded`)

  // Credit Aging snapshots for current month
  const now = new Date()
  const aging1 = await prisma.creditAging.upsert({
    where: { customerId_asOf: { customerId: createdCustomers[0].id, asOf: new Date(now.getFullYear(), now.getMonth(), 15) } },
    update: {},
    create: {
      customerId: createdCustomers[0].id,
      bucket0to30: 45000,
      bucket31to60: 32000,
      bucket61to90: 15000,
      bucket90plus: 0,
      total: 92000,
      asOf: new Date(now.getFullYear(), now.getMonth(), 15),
    },
  })

  const aging2 = await prisma.creditAging.upsert({
    where: { customerId_asOf: { customerId: createdCustomers[1].id, asOf: new Date(now.getFullYear(), now.getMonth(), 15) } },
    update: {},
    create: {
      customerId: createdCustomers[1].id,
      bucket0to30: 5000,
      bucket31to60: 0,
      bucket61to90: 0,
      bucket90plus: 0,
      total: 5000,
      asOf: new Date(now.getFullYear(), now.getMonth(), 15),
    },
  })

  const aging3 = await prisma.creditAging.upsert({
    where: { customerId_asOf: { customerId: createdCustomers[2].id, asOf: new Date(now.getFullYear(), now.getMonth(), 15) } },
    update: {},
    create: {
      customerId: createdCustomers[2].id,
      bucket0to30: 20000,
      bucket31to60: 35000,
      bucket61to90: 40000,
      bucket90plus: 55000,
      total: 150000,
      asOf: new Date(now.getFullYear(), now.getMonth(), 15),
    },
  })

  const aging4 = await prisma.creditAging.upsert({
    where: { customerId_asOf: { customerId: createdCustomers[3].id, asOf: new Date(now.getFullYear(), now.getMonth(), 15) } },
    update: {},
    create: {
      customerId: createdCustomers[3].id,
      bucket0to30: 12000,
      bucket31to60: 8000,
      bucket61to90: 0,
      bucket90plus: 0,
      total: 20000,
      asOf: new Date(now.getFullYear(), now.getMonth(), 15),
    },
  })

  console.log(`   ✓ 4 credit aging records seeded`)

  // 1-2 Collection Cases
  const case1 = await prisma.collectionCase.upsert({
    where: { caseNo: 'CC-2024-0003' },
    update: {},
    create: {
      caseNo: 'CC-2024-0003',
      customerId: createdCustomers[2].id,
      arStatementId: null,
      amount: 150000,
      assignedTo: credit.id,
      priority: CollectionPriority.HIGH,
      status: CollectionStatus.OPEN,
      dueDate: new Date(Date.now() + 7 * 86400000),
      notes: 'Follow up on overdue invoice INV-2024-089 — customer unresponsive',
    },
  })

  const case2 = await prisma.collectionCase.upsert({
    where: { caseNo: 'CC-2024-0004' },
    update: {},
    create: {
      caseNo: 'CC-2024-0004',
      customerId: createdCustomers[3].id,
      arStatementId: null,
      amount: 20000,
      assignedTo: credit.id,
      priority: CollectionPriority.MEDIUM,
      status: CollectionStatus.IN_PROGRESS,
      dueDate: new Date(Date.now() + 14 * 86400000),
      notes: 'Payment plan negotiation in progress',
    },
  })

  console.log(`   ✓ 2 collection cases seeded`)

  // Overdue Notifications
  await prisma.overdueNotification.create({
    data: {
      customerId: createdCustomers[2].id,
      daysOutstanding: 45,
      amount: 150000,
      channel: 'SYSTEM',
      notes: 'Auto-generated overdue alert — 45 days past due',
    },
  })

  await prisma.overdueNotification.create({
    data: {
      customerId: createdCustomers[3].id,
      daysOutstanding: 15,
      amount: 20000,
      channel: 'SYSTEM',
      notes: 'Reminder notification — 15 days outstanding',
    },
  })

  console.log(`   ✓ 2 overdue notifications seeded`)

  // ─── Movements ──────────────────────────────────────────────────────────────

  const nowDate = new Date()
  const movements = [
    { productIdx: 0, type: 'IN', quantity: 120, notes: 'Received from supplier — batch #AMX-2024-089', daysAgo: 0, userId: admin.id },
    { productIdx: 1, type: 'OUT', quantity: 50, notes: 'Dispensed to ward B-3', daysAgo: 0, userId: staff.id },
    { productIdx: 3, type: 'OUT', quantity: 35, notes: 'Pharmacy dispensing — low stock alert triggered', daysAgo: 1, userId: staff.id },
    { productIdx: 4, type: 'IN', quantity: 200, notes: 'Monthly restock — PO #2024-0442', daysAgo: 1, userId: admin.id },
    { productIdx: 2, type: 'OUT', quantity: 40, notes: 'Dispensed to outpatient clinic', daysAgo: 2, userId: staff.id },
    { productIdx: 5, type: 'OUT', quantity: 18, notes: 'Ward dispensing — A wing', daysAgo: 2, userId: staff.id },
    { productIdx: 7, type: 'IN', quantity: 60, notes: 'Emergency restock from central pharmacy', daysAgo: 3, userId: admin.id },
    { productIdx: 6, type: 'OUT', quantity: 30, notes: 'Allergy season restock dispensed', daysAgo: 3, userId: staff.id },
    { productIdx: 8, type: 'IN', quantity: 200, notes: 'Bulk order received — batch #VTC-2024-055', daysAgo: 4, userId: admin.id },
    { productIdx: 9, type: 'ADJUSTMENT', quantity: -5, notes: 'Expired batch removed — EXP 2024-01', daysAgo: 5, userId: admin.id },
  ]

  for (const m of movements) {
    const timestamp = new Date(nowDate)
    timestamp.setDate(timestamp.getDate() - m.daysAgo)
    timestamp.setHours(Math.floor(Math.random() * 8) + 8, Math.floor(Math.random() * 60))

    await prisma.movement.create({
      data: {
        type: m.type as any,
        quantity: Math.abs(m.quantity),
        notes: m.notes,
        timestamp,
        productId: createdProducts[m.productIdx].id,
        userId: m.userId,
      },
    })
  }

  console.log(`   ✓ ${movements.length} movements seeded`)

  // ─── Cash Flow Module ────────────────────────────────────────────────────────

  const currentMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)

  // Bank accounts
  const bankAccount1 = await prisma.bankAccount.upsert({
    where: { accountNumber: 'ETB-1001-0001' },
    update: {},
    create: {
      accountName: 'Main Business Account',
      accountNumber: 'ETB-1001-0001',
      bankName: 'Commercial Bank of Ethiopia',
      accountType: 'SAVINGS',
      currency: 'ETB',
      openingBalance: 250000,
      currentBalance: 250000,
      createdById: admin.id,
    },
  })

  const bankAccount2 = await prisma.bankAccount.upsert({
    where: { accountNumber: 'ETB-1001-0002' },
    update: {},
    create: {
      accountName: 'Petty Cash',
      accountNumber: 'ETB-1001-0002',
      bankName: 'Cash',
      accountType: 'PETTY_CASH',
      currency: 'ETB',
      openingBalance: 15000,
      currentBalance: 15000,
      createdById: admin.id,
    },
  })

  const bankAccount3 = await prisma.bankAccount.upsert({
    where: { accountNumber: 'ETB-MOB-0911-0001' },
    update: {},
    create: {
      accountName: 'Mobile Money (M-Pesa)',
      accountNumber: 'ETB-MOB-0911-0001',
      bankName: 'M-Pesa',
      accountType: 'MOBILE_MONEY',
      currency: 'ETB',
      openingBalance: 45000,
      currentBalance: 45000,
      createdById: admin.id,
    },
  })

  console.log(`   ✓ 3 bank accounts seeded`)

  // Inflows
  const inflows = [
    { amount: 125000, category: 'SALES', reference: 'REC-001', description: 'Daily POS sales aggregate', daysAgo: 0, account: bankAccount1 },
    { amount: 45000, category: 'SALES', reference: 'REC-002', description: 'Wholesale batch order', daysAgo: 2, account: bankAccount1 },
    { amount: 8500, category: 'OTHER_INCOME', reference: 'REC-003', description: 'Consultation fee', daysAgo: 5, account: bankAccount2 },
    { amount: 32000, category: 'SALES', reference: 'REC-004', description: 'Government tender payment', daysAgo: 8, account: bankAccount1 },
    { amount: 12500, category: 'RTGS', reference: 'REC-005', description: 'Insurance reimbursement', daysAgo: 12, account: bankAccount3 },
  ]

  for (const inflow of inflows) {
    const receivedAt = new Date(nowDate)
    receivedAt.setDate(receivedAt.getDate() - inflow.daysAgo)
    await prisma.cashInflow.create({
      data: {
        amount: inflow.amount,
        category: inflow.category as any,
        reference: inflow.reference,
        description: inflow.description,
        receivedAt,
        bankAccountId: inflow.account.id,
        createdById: admin.id,
      },
    })
  }

  // Outflows
  const outflows = [
    { amount: 15000, category: 'RENT', reference: 'PAY-001', description: 'Warehouse rent', daysAgo: 1, account: bankAccount1 },
    { amount: 42000, category: 'SALARY', reference: 'PAY-002', description: 'Payroll - staff salaries', daysAgo: 3, account: bankAccount1 },
    { amount: 8500, category: 'UTILITIES', reference: 'PAY-003', description: 'Electricity & water', daysAgo: 4, account: bankAccount1 },
    { amount: 22000, category: 'PURCHASE', reference: 'PAY-004', description: 'Stock purchase from PharmaPrime', daysAgo: 7, account: bankAccount1 },
    { amount: 3500, category: 'TRANSPORT', reference: 'PAY-005', description: 'Fuel & vehicle maintenance', daysAgo: 10, account: bankAccount2 },
    { amount: 5000, category: 'SALARY', reference: 'PAY-006', description: 'Part-time staff', daysAgo: 14, account: bankAccount2 },
  ]

  for (const outflow of outflows) {
    const paidAt = new Date(nowDate)
    paidAt.setDate(paidAt.getDate() - outflow.daysAgo)
    await prisma.cashOutflow.create({
      data: {
        amount: outflow.amount,
        category: outflow.category as any,
        reference: outflow.reference,
        description: outflow.description,
        paidAt,
        bankAccountId: outflow.account.id,
        createdById: admin.id,
      },
    })
  }

  const totalInflow = inflows.reduce((s, i) => s + i.amount, 0)
  const totalOutflow = outflows.reduce((s, o) => s + o.amount, 0)

  await prisma.bankAccount.update({
    where: { id: bankAccount1.id },
    data: { currentBalance: 250000 + totalInflow - totalOutflow },
  })

  console.log(`   ✓ ${inflows.length} inflows & ${outflows.length} outflows seeded`)

  // Budgets
  await prisma.budget.upsert({
    where: { category_periodStart: { category: 'SALARY', periodStart: currentMonthStart } },
    update: {},
    create: {
      category: 'SALARY',
      periodLabel: nowDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      periodStart: currentMonthStart,
      periodEnd: new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0),
      plannedAmount: 50000,
    },
  })

  await prisma.budget.upsert({
    where: { category_periodStart: { category: 'RENT', periodStart: currentMonthStart } },
    update: {},
    create: {
      category: 'RENT',
      periodLabel: nowDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      periodStart: currentMonthStart,
      periodEnd: new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0),
      plannedAmount: 15000,
    },
  })

  await prisma.budget.upsert({
    where: { category_periodStart: { category: 'PURCHASE', periodStart: currentMonthStart } },
    update: {},
    create: {
      category: 'PURCHASE',
      periodLabel: nowDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      periodStart: currentMonthStart,
      periodEnd: new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0),
      plannedAmount: 30000,
    },
  })

  console.log(`   ✓ 3 budgets seeded`)

  // Loan
  await prisma.loan.create({
    data: {
      lender: 'Ethiopian Commercial Bank',
      principal: 500000,
      interestRate: 12.5,
      startDate: new Date(nowDate.getFullYear() - 1, 0, 15),
      endDate: new Date(nowDate.getFullYear() + 2, 0, 15),
      status: 'ACTIVE',
      createdById: admin.id,
      repayments: {
        create: [
          { amount: 25000, principal: 20000, interest: 5000, paidAt: new Date(nowDate.getFullYear(), 0, 15), createdById: admin.id },
          { amount: 25000, principal: 20000, interest: 5000, paidAt: new Date(nowDate.getFullYear(), 1, 15), createdById: admin.id },
          { amount: 25000, principal: 20000, interest: 5000, paidAt: new Date(nowDate.getFullYear(), 2, 15), createdById: admin.id },
        ],
      },
    },
  })

  console.log(`   ✓ 1 loan with 3 repayments seeded`)

  // Investment
  await prisma.investment.create({
    data: {
      name: 'Fixed Deposit - 12 Month',
      type: 'FIXED_DEPOSIT',
      amount: 200000,
      expectedReturn: 220000,
      startDate: new Date(nowDate.getFullYear(), 0, 1),
      maturityDate: new Date(nowDate.getFullYear() + 1, 0, 1),
      status: 'ACTIVE',
      notes: 'High-yield fixed deposit with Commercial Bank',
      createdById: admin.id,
    },
  })

  console.log(`   ✓ 1 investment seeded`)

  console.log('✅ Seed complete!')
  console.log('   Admin: admin@wayu.ph / admin123')
  console.log('   Client Admin (gedy): gedy@wayu.ph / gedy123')
  console.log('   Staff: staff@wayu.ph / staff123')
  console.log('   Finance: finance@wayu.ph / finance123')
  console.log('   Inventory: inventory@wayu.ph / inventory123')
  console.log('   Sales: sales@wayu.ph / sales123')
  console.log('   Credit Officer: credit@wayu.ph / credit123')
  console.log('   Viewer: viewer@wayu.ph / viewer123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
