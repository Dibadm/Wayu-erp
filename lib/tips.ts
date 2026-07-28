export interface Tip {
  id: string
  title: string
  description: string
  icon: string
  section: string
}

export const tips: Tip[] = [
  // Main
  { id: 'dashboard', title: 'Dashboard', description: 'Your command center. View KPIs, sales trends, low stock alerts, and recent movements all in one place.', icon: 'LayoutDashboard', section: 'Main' },
  { id: 'inventory', title: 'Inventory', description: 'Manage products, stock levels, pricing, and category filters. Keep your catalog accurate and up to date.', icon: 'Package', section: 'Main' },
  { id: 'movements', title: 'Movements', description: 'Track every stock IN, OUT, and ADJUSTMENT. Use this to audit inventory changes and reconcile with batches.', icon: 'ArrowLeftRight', section: 'Main' },
  { id: 'expiry', title: 'Expiry', description: 'Monitor products approaching expiration. Act on FEFO (First Expiry First Out) to minimize waste.', icon: 'FlaskRound', section: 'Main' },
  { id: 'locations', title: 'Locations', description: 'Manage warehouses, branches, and clinics. Assign stock across multiple locations for distributed operations.', icon: 'MapPin', section: 'Main' },
  { id: 'reports', title: 'Reports', description: 'Generate and export standard operational reports for review, compliance, and decision-making.', icon: 'FileBarChart', section: 'Main' },

  // Point of Sale
  { id: 'pos', title: 'POS', description: 'Process sales with barcode search, customer and salesperson selection, and real-time cart calculations.', icon: 'ShoppingBag', section: 'Point of Sale' },
  { id: 'sales', title: 'Sales', description: 'Review transaction history, filter by date, and drill into individual receipts for returns or audits.', icon: 'Receipt', section: 'Point of Sale' },
  { id: 'customers', title: 'Customers', description: 'Maintain customer records, contact details, and lifetime purchase history for relationship management.', icon: 'Users', section: 'Point of Sale' },
  { id: 'import-export', title: 'Import / Export', description: 'Bulk import sales or product data from Excel. Sync changes while preserving audit trails and conflict logs.', icon: 'FileSpreadsheet', section: 'Point of Sale' },

  // Finance
  { id: 'gross-profit', title: 'Gross Profit', description: 'Analyze revenue versus COGS across products and periods. Identify high-margin and low-margin items.', icon: 'TrendingUp', section: 'Finance' },
  { id: 'commission', title: 'Commission', description: 'Configure tiered commission rates by salesperson, product, or global scope. Payouts are calculated automatically at checkout.', icon: 'Percent', section: 'Finance' },
  { id: 'weekly-gp', title: 'Weekly GP', description: 'Track gross profit performance on a weekly cadence to spot trends and flag underperforming periods.', icon: 'BarChart3', section: 'Finance' },
  { id: 'sales-plan', title: 'Sales Plan', description: 'Set monthly sales targets by product. Compare actuals against plan to drive accountability.', icon: 'ShoppingBag', section: 'Finance' },
  { id: 'ar', title: 'AR / Credit', description: 'Manage accounts receivable, credit limits, and payment terms. Track outstanding balances and due dates.', icon: 'Receipt', section: 'Finance' },
  { id: 'expenses', title: 'Expenses', description: 'Record and categorize operating expenses. Tag each entry to the general ledger for finance review.', icon: 'Landmark', section: 'Finance' },
  { id: 'bank-reconciliation', title: 'Bank Rec', description: 'Match book balances against bank statements. Resolve differences and close reconciliation periods.', icon: 'FileSpreadsheet', section: 'Finance' },

  // Cash Flow
  { id: 'cash-flow', title: 'Cash Position', description: 'View overall cash health across all bank accounts. Monitor inflows, outflows, and net liquidity.', icon: 'Wallet', section: 'Cash Flow' },
  { id: 'bank-accounts', title: 'Bank Accounts', description: 'Register and manage bank accounts, mobile money, and petty cash ledgers.', icon: 'Building2', section: 'Cash Flow' },
  { id: 'inflows', title: 'Inflows', description: 'Record cash received from sales, loan disbursements, or other income sources.', icon: 'ArrowDownToLine', section: 'Cash Flow' },
  { id: 'outflows', title: 'Outflows', description: 'Log payments for expenses, salaries, loans, and purchases with category-level tracking.', icon: 'ArrowUpFromLine', section: 'Cash Flow' },
  { id: 'transfers', title: 'Transfers', description: 'Move funds between bank accounts. Keep an auditable trail of internal transfers.', icon: 'ArrowLeftRight', section: 'Cash Flow' },
  { id: 'budgets', title: 'Budgets', description: 'Set spending budgets by cash flow category. Compare actuals to plan for better financial control.', icon: 'Target', section: 'Cash Flow' },
  { id: 'loans', title: 'Loans', description: 'Track loan principal, interest, repayment schedules, and outstanding balances.', icon: 'CircleDollarSign', section: 'Cash Flow' },
  { id: 'investments', title: 'Investments', description: 'Log fixed deposits, bonds, or other investments. Monitor maturity dates and expected returns.', icon: 'TrendingUp', section: 'Cash Flow' },
  { id: 'cash-flow-reports', title: 'Cash Flow Reports', description: 'Generate summarized cash flow statements for management review and decision-making.', icon: 'FileBarChart', section: 'Cash Flow' },

  // Credit Management
  { id: 'credit-dashboard', title: 'Credit Dashboard', description: 'Overview of outstanding credit, risk levels, and collection health across all customers.', icon: 'Wallet', section: 'Credit Management' },
  { id: 'credit-profiles', title: 'Credit Profiles', description: 'Set credit limits, scores, and payment terms per customer. Approve or block accounts based on risk.', icon: 'UserCheck', section: 'Credit Management' },
  { id: 'applications', title: 'Applications', description: 'Review and process customer credit applications. Approve limits or reject with documented reasons.', icon: 'FileCheck', section: 'Credit Management' },
  { id: 'aging-report', title: 'Aging Report', description: 'Visualize overdue receivables by aging buckets (0-30, 31-60, 61-90, 90+ days).', icon: 'CalendarDays', section: 'Credit Management' },
  { id: 'collections', title: 'Collections', description: 'Manage open collection cases, assign officers, and track resolution progress.', icon: 'ClipboardList', section: 'Credit Management' },
  { id: 'credit-reports', title: 'Credit Reports', description: 'Export credit exposure, collection efficiency, and risk summary reports for finance review.', icon: 'FileBarChart', section: 'Credit Management' },

  // AI Features
  { id: 'ai-report', title: 'AI Report', description: 'Generate intelligent sales and inventory insights using AI-powered analysis of your data.', icon: 'Bot', section: 'AI Features' },
  { id: 'scan-invoice', title: 'Scan Invoice', description: 'Use OCR to extract data from supplier invoices and auto-populate purchase orders or stock entries.', icon: 'Bot', section: 'AI Features' },

  // Admin
  { id: 'audit-log', title: 'Audit Log', description: 'Review system-wide action logs for security, compliance, and change tracking.', icon: 'Shield', section: 'Admin' },
  { id: 'backups', title: 'Backups', description: 'Trigger database backups, monitor status, and manage retention for disaster recovery.', icon: 'HardDrive', section: 'Admin' },
  { id: 'settings', title: 'Settings', description: 'Configure system preferences, manage users, and control application-wide behavior.', icon: 'Settings', section: 'Admin' },
  { id: 'trust-verify', title: 'Trust Verify', description: 'Verify system integrity and trusted sources for imported or synchronized data.', icon: 'ShieldCheck', section: 'Admin' },
]

export const SECTIONS = [
  'Main',
  'Point of Sale',
  'Finance',
  'Cash Flow',
  'Credit Management',
  'AI Features',
  'Admin',
]
