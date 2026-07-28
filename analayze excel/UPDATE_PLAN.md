# WAYU — Excel-to-App Migration & Feature Update Plan (v2)

**Date:** 2026-07-16
**Status:** ANALYSIS ONLY — no code modified.
**Source files analyzed:**
- `analayze excel/CF19.xlsx` (2018 system: credit sales, expenses, bank rec, Ethiopian-calendar dashboard)
- `analayze excel/ERP System wayu  2019.xlsx` (2019 system: sells, received/purchases, gross profit, commission, stock, In/Out, dashboard)

**Client decisions (confirmed this session):**
1. **Commission** = changes by **salesperson + product + sold tiers**. Admin must be able to configure all of it in the UI — **nothing hardcoded**.
2. **Cost basis** = **batch-based**; after delivery, add a **UI toggle between FIFO and FEFO** so admin chooses the method (future-proofs scaling).
3. **Sync** = **true two-way Excel sync** — app is authoritative; on re-import, **only add new rows**; if a mismatch vs existing app data is found, **alert the admin** (do not silently overwrite).
4. **Calendar** = **Gregorian by default** for day-to-day; on **exported reports the user chooses Gregorian or Ethiopian** per report.
5. **Data entry** = both **Excel import AND in-system entry**; client gradually stops using Excel after trusting the system.
6. **Tax** = the `%` column is **withholding tax (WHT)**; it is **not mandatory** (only for customers who ask). **Commission is calculated on pre-tax amount (no tax on commission).**
7. **Users** = seed user **"gedy"** as admin; admin creates new users + passwords on their side.
8. **Trust milestone** = verify via **both a one-month and a quarter side-by-side** check before the client fully retires Excel.

---

## 1. Decoded Excel model (from his formulas)

### ERP System 2019 — primary live model
Hub sheet **`Sells19`** = one row per sale line. Decoded columns:

| Client column | Meaning | Existing app field |
|---|---|---|
| Items (D) | product code | `Product.sku` |
| Buyer Name (4) / Tin No (7) | customer | `Customer.name` (+ add `tinNo`) |
| QTY (12) | units sold | `SaleItem.quantity` |
| unit price (13) | sell price | `SaleItem.unitPrice` |
| Total (14) | QTY×unit price | `SaleItem.lineTotal` |
| Date (17) / Month (16) | Gregorian date/month | `Sale.createdAt` |
| % (23) | WHT / tax % | `Sale.taxAmount` (derive %) |
| Sells by (salesperson) | who sold | new `salesperson` (User or dedicated) |
| Lot (27) / P.mthd (28) | batch / payment method | `SaleItem.batchesUsed` / `SalePayment.method` |
| Sold (29) / SOH (30) | qty sold / stock on hand | `Product.quantity` |
| CPU (61) / COGS (62) | cost/unit / cost of goods sold | `SaleItem.unitCost` / `Sale.totalCost` |
| Profit (64) / P (gross) | profit = Total − COGS | `SaleItem.profit` / `Sale.profit` |
| EtC (51) | Ethiopian-calendar month label | reporting dimension (new) |

Supporting sheets (all `SUMIFS` against `Sells19` / `Received`):
- **`Received`** — purchases: Items, QTY, unit cost, Total cost, COGS, margin %, lot, received date, supplier. → maps to `PurchaseOrder` + `Batch`.
- **`GP 2,18`** — Gross Profit per product/month: `SUMIFS(Sells19!S/R/G, month)`.
- **`Com 18`** — Commission per salesperson (Gedy, Samry, Bruk, Yosy, Tesfish, Dagy, Beza, Wende…).
- **`SC18`** — Stock: SOH, COGS, Profit, margin %, inventory value, status `IF(SOH=0,"Out of Stock",IF(SOH<reorder,"Low Stock",IF(SOH>max,"Overstock","Normal")))`.
- **`InOut 19` / `Formulas` / `Dashboard`** — per-product monthly In/Out pivot: received qty (`Received!$B`) vs sold qty (`Sells19!$E`) vs sold value (`Sells19!$G`) per Ethiopian month (`Sells19!$AE`). Monthly received-vs-sold by product; stock %, Beg/Rec/End Qty & Value.
- **`Prod Report19` / `Value Report 19`** — product-level monthly matrix: received qty & sold value (`Sells19!$G`) per Ethiopian month (`$AE`/`$AF`). Same data as InOut, product rows.
- **`19 Sells plan`** — sales **plan/budget vs actual** per product per month: planned qty/value vs actual sold, with variance columns (e.g. `AB3-AE3`). → new **Sales Plan** report (budget vs actual).
- **`wky R 19`** — **weekly received/gross-profit rollup**: per Ethiopian week, sum of Gross (`Sells19!$G`), Profit (`Sells19!$S`), Qty (`Sells19!$E`), COGS (`Sells19!$R`), with ratio columns. → new **Weekly GP** report.

> Note: `Sells19!$AE` = Ethiopian month label; `Sells19!$AF`/`Sells!$AF` = Ethiopian month on the 2018 `Sells` sheet; `Sells19!$J` = Gregorian week number; `Received!$R` = Ethiopian month on purchases. All month/week grouping in reports should support both calendars (decision #4).

### CF19.xlsx — 2018 system (historical / optional rebuild)
- **`Cr sells18` / `CreditS`** — AR/credit ledger with **Ethiopian-calendar conversion via `LET`** (Amharic month names).
- **`Trans`** — general ledger feeding **`All Exp`** expense reports by category (`SUMIFS(...,"Debit")`).
- **`Dashbord`** — AR summary; **`Recon1888`/`All Bank`** — bank reconciliation; **`Budget 2018`** — budget vs actual.

> The web app (`wayu-inventory`) already has `Product`, `Batch`, `Sale`, `SaleItem` (with `batchesUsed` FEFO trail), `Customer`, `Supplier`, `PurchaseOrder`, plus an Inventory Valuation report. **It is ~80% of the client's model already.** The gaps are: commission, GP/commission reports, Ethiopian calendar, two-way Excel import/export, and matching his exact sheet layouts.

---

## 2. Recommended approach

Extend the existing app to mirror his sheets, keep it authoritative, and give him Excel as a familiar I/O surface he can retire gradually.

Layers:
1. **Schema** — small additions only (commission rates, salesperson, tin, calendar prefs, sync tracking).
2. **Finance/calendar lib** — reproduce his formulas (profit, GP rollup, tiered commission, margin, stock status, inventory value) + Ethiopian-calendar conversion in TS, unit-tested against his workbook values.
3. **Two-way Excel I/O** — import his `Sells19`/`Received` (and template) → DB; export his familiar sheets (Sells, Received, GP, Commission, Stock, Dashboard) with a **calendar toggle (Gregorian/Ethiopian)**.
4. **UI** — Sales, Purchases, Gross Profit, Commission, enriched Stock, Dashboard KPIs, Import/Export.

---

## 3. Schema changes (incremental on current `schema.prisma`)

Add/extend (no destructive changes):

- **`Product`** extend: `maxStockLevel Int?` (his "Overstock" BS threshold) — keeps his Out/Low/Normal/Overstock logic.
- **`Customer`** extend: `tinNo String?` (his Tin No), `taxable Boolean @default(false)` (decision #6: WHT only for customers who ask — not mandatory).
- **`User`** extend: `isSalesperson Boolean @default(false)`. Seed **`gedy`** as ADMIN (decision #7); admin creates other users + passwords via Settings.
- **`CommissionRate`** model (decision #1 — **all configurable in UI, nothing hardcoded**):
  - `{ id, salespersonId?, productId?, tierFromQty, tierToQty?, rate, scope: GLOBAL|SALESPERSON|PRODUCT|COMBO }`
  - Resolution order at sale time: most specific match (salesperson+product+tier) → product+tier → salesperson+tier → global tier. Admin manages these on a Commission settings page.
- **`Sale`** extend: `salespersonId String?` (FK User), `ethiopianMonth String?` (precomputed label), `source: MANUAL|EXCEL_IMPORT`, `importBatchId?`, `taxable Boolean @default(false)` (mirror customer flag at sale time, decision #6).
- **`SaleItem`** extend: `commissionAmount Decimal @default(0)` (pre-tax, decision #6).
- **`Setting`** (or reuse a settings table) for **cost method**: `costMethod: FIFO|FEFO` (decision #2 — admin UI toggle, default empty until chosen post-delivery).
- **New `ImportBatch`** model (decision #3): `{ id, fileName, importedBy, importedAt, rowCount, status, mismatches Json? }` — records each Excel import; `mismatches` stores rows that conflicted with existing app data so admin gets alerted instead of overwrite.
- **`SyncConflict`** (optional, decision #3): `{ id, importBatchId, entity, entityId, excelValue, appValue, resolved }` — drives the admin mismatch alert.

Keep `Movement` for stock qty; financials derived from `SaleItem`/`PurchaseOrderItem` + `Batch` cost (decision #2: cost by batch). `SaleItem.batchesUsed` already records FEFO trail — reuse; COGS uses the chosen `costMethod` (FIFO/FEFO) to pick batch cost.

---

## 4. Calculation layer — `lib/finance.ts` + `lib/ethiopian-calendar.ts`

Reproduce his exact formulas (validated against his workbook):

| Client formula | App implementation |
|---|---|
| `Total = QTY × unit price` | `quantity * unitPrice` |
| `COGS = QTY × CPU (batch cost)` | sum over `batchesUsed` of `qty×batch.unitCost` |
| `Profit = Total − COGS` | `lineTotal - cogs` |
| `margin% = Profit / Total` | `profit / lineTotal` |
| GP rollup (GP 2,18) | `groupBy(product, month)` sum S/R/G |
| **Commission (Com 18)** | per salesperson × product × sold-tier: resolve `CommissionRate` (salesperson+product+tier → product+tier → salesperson+tier → global), all admin-configured, **on pre-tax lineTotal** (decision #1, #6) |
| Stock status (SC18) | `SOH=0→Out, SOH<min→Low, SOH>max→Overstock, else Normal` |
| Inventory value (SC18) | `SOH × unitCost` and `SOH × unitPrice` |
| Dashboard Beg/Rec/End Qty & Value | running balance over time |
| **Ethiopian month (CF19 LET)** | port `LET` conversion to `lib/ethiopian-calendar.ts` for labels & report calendar switch (decision #4) |

All pure functions, unit-tested by importing his file and asserting the app recomputes the same Totals / Profit / Commission / Stock-status.

---

## 5. Two-way Excel I/O (decisions #3, #4, #5)

- **Import** — new `POST /api/import` (ExcelJS) reads his `Sells19` / `Received` sheets, upserts `Product`/`Customer`/`Sale`+`SaleItem`/`PurchaseOrder`+`Batch`. On re-import (decision #3): **only add new rows** keyed by `receiptNumber`/`poNumber`; if an Excel row conflicts with existing app data, record it in `ImportBatch.mismatches` / `SyncConflict` and **alert the admin** — never silently overwrite. Tagged with `ImportBatch` (fileName, rowCount, timestamp, mismatch count) so every import is auditable. Map his headers → schema via the §1 table. Tolerant of his `#REF!`/`#VALUE!` error cells (skip + flag).
- **Export** — extend `lib/reports.ts` to emit his familiar sheets: **Sells, Received, GP, Commission, Stock, Dashboard**, same column order, computed values (not live formulas, to avoid Excel formula-recalc surprises). A **calendar selector (Gregorian / Ethiopian)** on the export UI controls date labels (decision #4 — Gregorian default in-app, choice only at export).
- **Template download** — blank workbook matching his layout for zero-friction adoption.
- **Two-way sync model:** app is source of truth. Excel export = snapshot; Excel re-import = upsert by `receiptNumber`/`poNumber`. Because imports are batched + audited, the client can keep using Excel, watch the numbers match, and stop over time (decision #3/#5). No auto-overwrite of manually entered app data without an explicit "Import from Excel" action.

---

## 6. UI additions (matching his sheets)

- **Sales** page (new) — sale docs + line items (replaces Sells19); supports in-system entry + shows `source` badge (Manual vs Excel).
- **Purchases / Received** page (new) — replaces `Received`; creates `PurchaseOrder` + `Batch` (cost by batch).
- **Gross Profit** report — by product & month (replaces GP 2,18).
- **Commission** report — per salesperson with tiered/per-product rates (replaces Com 18); admin configures `CommissionRate`.
- **Stock** page — extend inventory with COGS, margin %, value, and his Out/Low/Normal/Overstock badges (replaces SC18).
- **Dashboard** — add his KPI tiles: Beg/Rec/End Qty, Stock %, Beg/Rec/Sold/End Value, monthly received-vs-sold.
- **Import / Export** center — upload Excel, view import history (`ImportBatch`), download templates, choose calendar for exports.
- **Settings** (admin) — **commission-rate manager** (salesperson × product × tier, decision #1), **cost method toggle FIFO/FEFO** (decision #2, default unset until chosen post-delivery), calendar default (Gregorian, decision #4), user management (create users + set passwords, decision #7). Seed `gedy` as ADMIN.

---

## 7. Build order (phased, non-breaking)

1. **Phase 0 — Final decode:** confirm remaining sheets (`Prod Report19`, `Value Report 19`, `19 Sells plan`, `wky R 19`, `Formulas`). Seed `gedy` as ADMIN user.
2. **Phase 1 — Schema + migrations:** add fields/models above (incl. `CommissionRate`, `ImportBatch`/`SyncConflict`, `costMethod` setting, `taxable` flags); switch from `prisma db push` to `prisma migrate dev` (per TECHNICAL_OVERVIEW §14).
3. **Phase 2 — Lib:** `lib/finance.ts` (profit, GP, tiered commission resolver on pre-tax amount, margin, stock status, value, FIFO/FEFO cost picker) + `lib/ethiopian-calendar.ts` + unit tests vs his workbook.
4. **Phase 3 — Import/Export:** `POST /api/import` (add-new-only + mismatch alert), `ImportBatch`/`SyncConflict` tracking, template, multi-sheet export with Gregorian/Ethiopian calendar toggle.
5. **Phase 4 — UI:** Sales, Purchases, GP, Commission (admin rate manager), enriched Stock, Dashboard KPIs, Import/Export center, Settings (cost method FIFO/FEFO toggle, user management).
6. **Phase 5 — AR/Credit + Expenses (CF19) + extra reports + Trust verification:** integrate the 2018 credit/AR ledger (`Cr sells18`/`CreditS`), Trans-based expense reports (`All Exp`), and bank reconciliation (`Recon1888`/`All Bank`) (decision #5: both systems integrated). Add the **Sales Plan (budget vs actual)** report (`19 Sells plan`) and **Weekly GP** report (`wky R 19`). Run **both a one-month and a quarter side-by-side** Excel-vs-app verification (decision #8) before the client retires Excel.

---

## 8. Notes / risks

- His workbooks contain `#REF!`/`#VALUE!` errors (broken references from copied sheets) — import must skip/flag bad rows.
- He uses whole-column `SUMIFS` in Excel; the app computes via SQL `groupBy` (faster, safer).
- Cost is batch-based (decision #2); FEFO trail already exists in `SaleItem.batchesUsed` — reuse it for COGS; the `costMethod` setting (FIFO/FEFO) chooses which batch cost applies (default unset until admin selects post-delivery).
- Validate the app reproduces his numbers before asking him to trust it; the `ImportBatch` audit builds that trust incrementally.
- No app code was modified for this analysis.

---

## 9. Decoding status — ALL SHEETS COMPLETE

Every sheet in both workbooks has now been decoded:

**ERP System 2019 (fully decoded):** Sells19 (sales lines), Received (purchases), GP 2,18 (GP by product/month), Com 18 (commission by salesperson), SC18 (stock+status), InOut 19 / Formulas / Dashboard (monthly received-vs-sold + Beg/Rec/End Qty & Value), Prod Report19 (product monthly matrix), Value Report 19 (value matrix), 19 Sells plan (budget vs actual), wky R 19 (weekly GP).

**CF19 2018 (fully decoded):** Cr sells18 / CreditS (AR + Ethiopian-calendar `LET` conversion), Trans (GL feeding All Exp expense reports), Dashbord (AR summary), Recon1888 / All Bank (bank rec), Budget 2018 (budget vs actual).

The only remaining non-blocking item is the **exact commission tier rates/breakpoints** (decision #1) — admin enters these in the UI, so no hardcoding; confirm input UX in Phase 0.

All 8 client decisions are captured above. The plan is ready to execute starting at Phase 0. No app code was modified for this analysis.
