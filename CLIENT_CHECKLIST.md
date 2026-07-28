# Wayu Inventory System — Client Review Checklist

## How to Use This System

**What it is:** Wayu Inventory is a complete pharmacy/retail inventory management system. It tracks products, batches, sales, purchases, commissions, and stock movements in one place. It can also import your existing Excel data so you don't have to re-enter everything manually.

**How to start:**
1. Open your browser and go to: **http://localhost:3000**
2. Log in with one of these accounts:
   - **Admin**: `admin@wayu.ph`
   - **Staff**: `staff@wayu.ph`
3. Use the sidebar on the left to navigate between pages (Dashboard, Inventory, POS, Purchase Orders, Import/Export, Reports, Settings).

**What to do first:**
- Check the **Dashboard** for a quick overview of your business.
- Go to **Import / Export** (`/import-export`) to upload your Excel files.
- Review the checklist below and tick each item as you test it.
- Note any features that don't work or changes you want, then choose from the **Update Request Options** at the bottom.

---

## Core Features to Review

### Dashboard
- [ ] Dashboard loads with KPI cards (Total Products, Low Stock, Sales Today, Pending POs)
- [ ] Recent activity list displays correctly
- [ ] Low stock alerts appear when products are below threshold
- [ ] Charts/reports render properly

### Inventory Management
- [ ] Product list displays with search/filter
- [ ] Add/Edit product form works
- [ ] Batch tracking shows expiry dates and status
- [ ] Stock movements log shows IN/OUT/ADJUST entries
- [ ] Low stock warnings appear correctly

### Sales / POS
- [ ] POS interface loads with product selection
- [ ] Cart works with add/remove/quantity updates
- [ ] Customer selection works (including walk-in)
- [ ] Sale completion creates receipt
- [ ] Sale history displays with filters

### Purchase Orders
- [ ] PO list displays with status indicators
- [ ] Create PO form works with supplier selection
- [ ] Receive items against PO updates stock
- [ ] PO statuses update correctly (Draft → Ordered → Received)

### Import / Export
- [ ] Import page loads at `/import-export`
- [ ] Excel upload accepts `.xlsx` files
- [ ] Sells19 sheet imports sales correctly
- [ ] Received sheet imports purchases correctly
- [ ] Mismatch detection reports missing products
- [ ] History tab shows import batches and conflicts
- [ ] Export generates downloadable Excel files

### Reports & Analytics
- [ ] Sales report shows date-filtered data
- [ ] Inventory report shows stock levels
- [ ] Commission report calculates correctly
- [ ] Dashboard report shows Beg/Rec/End quantities

### Settings & Configuration
- [ ] Company profile editable
- [ ] Locations management works
- [ ] Users/Roles display correctly
- [ ] Commission rates configurable
- [ ] Backup functionality works

---

## Excel Import Checklist

### Sells19 Sheet
- [ ] Tests with `analayze excel/ERP System wayu 2019.xlsx`
- [ ] Receipt numbers map correctly
- [ ] Buyer names create/find customers
- [ ] Line items group by sale receipt
- [ ] Totals calculate correctly
- [ ] Tax/commission percentages apply

### Received Sheet
- [ ] PO numbers generate if missing
- [ ] Products matched by SKU
- [ ] Batches created with lot numbers
- [ ] Supplier assigned correctly
- [ ] Stock quantities update on import

---

## Update Request Options

### Immediate Updates Needed
1. **Excel Product Matching**: Current import flags products not in DB. Options:
   - A) Auto-create missing products during import
   - B) Pre-import product mapping screen
   - C) Skip unknown products silently

2. **Authentication**: JWT decryption errors appear in console. Options:
   - A) Fix NextAuth secret configuration
   - B) Clear existing sessions/redis
   - C) Switch to database sessions

3. **Missing Database Tables**: `bank_reconciliations` table error. Options:
   - A) Run `npx prisma db push` to create missing tables
   - B) Remove bank reconciliation features
   - C) Add migration for missing tables

### Feature Enhancements
1. **Barcode Scanning**: Add barcode input to POS and inventory
2. **Multi-Location Transfer**: Transfer stock between warehouses
3. **Email Notifications**: Send PO confirmations and low stock alerts
4. **Advanced Reporting**: Add profit margins, ABC analysis
5. **Mobile App**: React Native or responsive PWA version

### UI/UX Improvements
1. Dark/light theme toggle
2. Dashboard customization (drag-drop widgets)
3. Bulk import mapping preview before upload
4. Printable receipt templates
5. Offline mode for POS

---

## Testing Notes

### Known Issues
- ExcelJS `filterButton` error patched for malformed table XML
- Some Excel sheets with broken table definitions may still fail
- Commission rates seeded but may need adjustment for actual business logic
- AI chat requires GEMINI_API_KEY environment variable

### Test Data
- 10 sample products seeded (Paracetamol, Ibuprofen, etc.)
- 1 admin user (admin@wayu.ph)
- 1 staff user (staff@wayu.ph)
- Imported 8 sales from sample Excel
- Imported 46 purchase orders from sample Excel

---

## Next Steps
1. Review this checklist with client
2. Note any broken features or missing requirements
3. Prioritize updates from "Update Request Options"
4. Schedule follow-up for fixes and enhancements
