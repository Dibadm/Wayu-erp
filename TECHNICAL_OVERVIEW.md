# WAYU Pharmaceutical Inventory System — Technical Overview

**Document version:** 1.0  
**Generated:** July 2026  
**Purpose:** Complete technical reference for engineering review, onboarding, and planning

---

## 1. Project Overview

### Project Name
**WAYU Pharmaceutical Inventory Management System**

### Purpose
A full-stack, production-oriented web application for managing pharmaceutical inventory across multiple warehouse and branch locations. The system tracks products, stock movements, batch expiry dates, and generates regulatory-grade audit logs. It includes an integrated AI assistant capable of answering natural-language inventory queries, generating management reports, performing OCR invoice scanning, and providing expiry compliance recommendations.

### Main Technologies

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.0.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^3.3.0 |
| Animation | Framer Motion | ^10.16.16 |
| Icons | Lucide React | ^0.303.0 |
| Database ORM | Prisma | ^5.7.0 |
| Database | PostgreSQL | 14+ |
| Authentication | NextAuth.js | ^4.24.5 |
| Password hashing | bcryptjs | ^2.4.3 |
| Validation | Zod | ^3.22.4 |
| Excel generation | ExcelJS | ^4.4.0 |
| Utility | clsx + tailwind-merge | ^2.0.0 / ^2.2.0 |

### AI Providers Supported

| Provider | Model | Default | Key Required |
|---|---|---|---|
| Google Gemini | gemini-1.5-flash | ✅ Yes | `GEMINI_API_KEY` |
| Anthropic Claude | claude-sonnet-4-6 | No | `ANTHROPIC_API_KEY` |
| OpenAI | gpt-4o-mini | No | `OPENAI_API_KEY` |

Provider is selected at runtime via `AI_PROVIDER` environment variable. No code changes required to switch.

### OCR
Implemented via AI Vision (the configured AI provider's multimodal capability). No separate OCR library is installed. Supports JPEG, PNG, WebP, and PDF files up to 10MB. This means OCR quality depends on the selected AI provider's vision model.

### Authentication Method
**NextAuth.js with JWT sessions** and a Credentials provider. Passwords are hashed with bcryptjs (12 salt rounds). Sessions are stateless JWTs — no database session table. Roles (ADMIN, STAFF, VIEWER) are embedded in the JWT and propagated into the session object.

### Deployment Readiness

| Aspect | Status |
|---|---|
| Vercel deployment | ✅ Ready (`vercel.json` included with cron config) |
| Environment variable template | ✅ `.env.example` complete |
| Database migrations | ✅ Prisma schema + seed script |
| Automated backup | ✅ pg_dump via cron or manual trigger |
| S3 upload (backup) | ⚠️ Stub present, AWS SDK not installed |
| HTTPS | Handled by host (Vercel/Nginx) |
| Email notifications | ❌ Not implemented |

---

## 2. Folder Structure

```
wayu-inventory/
│
├── prisma/
│   ├── schema.prisma          # Full DB schema (7 models, 6 enums)
│   └── seed.ts                # Seeds 2 users + 10 pharma products + movements
│
├── app/                       # Next.js App Router root
│   ├── layout.tsx             # Root HTML shell + SessionProvider
│   ├── page.tsx               # Root redirect → /dashboard or /login
│   ├── globals.css            # Tailwind directives + global component classes
│   │
│   ├── login/
│   │   └── page.tsx           # Login form (public)
│   │
│   ├── (app)/                 # Route group — all pages requiring auth
│   │   ├── layout.tsx         # Auth guard + Sidebar + TopBar + AI Chat + Expiry Banner
│   │   ├── dashboard/page.tsx # Main dashboard
│   │   ├── inventory/
│   │   │   ├── page.tsx       # Product list table
│   │   │   └── [id]/page.tsx  # Product detail + movement history
│   │   ├── movements/page.tsx # Full movement log
│   │   ├── batches/page.tsx   # Batch + expiry tracker
│   │   ├── locations/page.tsx # Warehouse/branch management
│   │   ├── reports/page.tsx   # Excel + PDF export UI
│   │   ├── ai-report/page.tsx # AI-generated management report
│   │   ├── audit/page.tsx     # Regulatory audit log (admin only)
│   │   ├── backup/page.tsx    # Backup history + manual trigger
│   │   └── settings/page.tsx  # Account info + user list (admin only)
│   │
│   └── api/                   # Next.js API Routes (REST)
│       ├── auth/[...nextauth]/route.ts   # NextAuth handler
│       ├── products/route.ts             # GET all, POST create
│       ├── products/[id]/route.ts        # GET one, PATCH, DELETE
│       ├── movements/route.ts            # GET all, POST (atomic stock update)
│       ├── locations/route.ts            # GET all, POST create
│       ├── batches/route.ts              # GET all (with filters), POST create
│       ├── audit/route.ts                # GET audit log (admin only)
│       ├── backup/route.ts               # GET history, POST trigger
│       ├── reports/route.ts              # GET Excel or PDF report
│       ├── expiry/route.ts               # GET expiry counts + detail
│       ├── cron/route.ts                 # GET (cron scheduler) — backup + expiry marking
│       └── ai/
│           ├── chat/route.ts             # POST — inventory chat
│           ├── report/route.ts           # GET — AI management report
│           ├── ocr/route.ts              # POST — invoice OCR
│           ├── reorder/route.ts          # GET — reorder recommendations
│           └── expiry-advice/route.ts    # GET — AI expiry compliance advice
│
├── components/                # All shared React components
│   ├── AuthProvider.tsx       # SessionProvider wrapper (client)
│   ├── Sidebar.tsx            # Left navigation with role-based admin section
│   ├── TopBar.tsx             # Search bar + user avatar header
│   ├── StatCard.tsx           # KPI tile with icon + accent color
│   ├── MovementsTable.tsx     # Reusable movement log table
│   ├── LowStockAlert.tsx      # Red alert banner for low-stock items
│   ├── AddProductModal.tsx    # Create product modal (admin)
│   ├── StockMovementModal.tsx # Record IN/OUT/ADJUSTMENT modal
│   ├── AIChat.tsx             # Floating AI chat panel (all pages)
│   ├── OCRScanner.tsx         # Invoice upload → OCR → review → confirm
│   ├── ReorderPanel.tsx       # Reorder recommendations dashboard widget
│   ├── ExpiryWidget.tsx       # 4-tier expiry counts dashboard card
│   ├── ExpiryNotificationBanner.tsx  # Login-time expiry warning (once/session)
│   └── ExpiryAIAdvice.tsx     # AI expiry recommendations dropdown
│
├── lib/                       # Server-side business logic
│   ├── db.ts                  # Prisma singleton (dev hot-reload safe)
│   ├── auth.ts                # NextAuth config + JWT callbacks
│   ├── utils.ts               # cn(), formatDate(), getStockStatus()
│   ├── validations.ts         # Zod schemas for products, movements, login
│   ├── audit.ts               # writeAuditLog() + diff() helper
│   ├── backup.ts              # pg_dump + gzip + S3 stub + auto-prune
│   ├── reports.ts             # ExcelJS 4-sheet workbook + HTML PDF template
│   ├── expiry.ts              # Expiry tiers, counts, batch detail queries
│   ├── ai-inventory.ts        # All DB queries used by AI (snapshot, reorder, search)
│   ├── ai-provider.ts         # Single entry point — reads AI_PROVIDER, returns provider
│   └── providers/
│       ├── types.ts           # AIProvider interface (complete, chat, vision)
│       ├── gemini.ts          # Google Gemini implementation (default)
│       ├── claude.ts          # Anthropic Claude implementation
│       └── openai.ts          # OpenAI stub (ready, not tested)
│
├── .env.example               # All environment variables documented
├── vercel.json                # Cron schedule (daily 01:00)
├── package.json               # Dependencies + npm scripts
├── tailwind.config.ts         # Custom fonts, colors, animations
├── tsconfig.json              # TypeScript strict mode, path aliases
├── next.config.js             # Next.js config
└── postcss.config.js          # Tailwind + autoprefixer
```

---

## 3. Existing Features

### Authentication
- **Email + password login** with bcryptjs hashing (12 rounds)
- **JWT session strategy** via NextAuth.js — stateless, no DB session table
- **Role-based access**: ADMIN, STAFF, VIEWER roles stored in JWT
- **Protected routes**: All `(app)/` pages server-side redirect to `/login` if unauthenticated
- **Demo credentials** displayed on login page for development

### Dashboard
- **4 KPI stat cards**: Total Products, Total Stock Units, Low Stock Alerts, Today's Movements
- **Low Stock Alert banner**: Lists products at or below minimum level
- **Three-panel layout**: Recent Movements | Expiry Widget | Reorder Panel
- **System online indicator**: Animated green pill in header
- **Date display**: Localized to `en-PH` format

### Inventory (Products)
- **Product list table**: SKU, name, category, stock quantity, min level, status badge
- **Status badges**: IN STOCK / REORDER SOON / LOW STOCK / OUT OF STOCK (color-coded)
- **Product detail page**: Stock stats, movement history for that product, Record Movement button
- **Add Product modal**: SKU, name, category, description, initial quantity, min level, unit
- **Stock Movement modal**: IN / OUT / ADJUSTMENT with quantity + notes
- **SKU uniqueness**: Enforced at DB level and checked before creation

### Movements
- **Full movement log**: Last 100 movements across all products
- **Movement types**: IN (stock received), OUT (dispensed), ADJUSTMENT (corrections), TRANSFER (between locations)
- **Atomic stock updates**: Prisma `$transaction` ensures movement + product quantity + location inventory update together
- **Filtering**: By product ID or location ID via query params
- **Audit trail**: Every movement writes an audit log entry with before/after quantities

### Locations / Warehouses
- **Multi-location support**: WAREHOUSE, BRANCH, CLINIC, PHARMACY types
- **Per-location inventory**: `LocationInventory` join table tracks stock per product per location
- **Location creation**: Admin-only via modal form
- **Location codes**: Unique codes (e.g. `WH-MAIN`, `BR-CEBU`)

### Batch & Expiry Tracking
- **Batch registration**: Batch number, quantity, expiry date, received date, location
- **Expiry tiers**: Expired | ≤7 days (Critical) | ≤14 days (Warning) | ≤30 days (Soon) | OK
- **Color-coded table rows**: Red/orange/amber/yellow row backgrounds by tier
- **Expiry badges**: Inline per-row status badges
- **Days-remaining column**: Shows exact days left (or "Xd ago" for expired)
- **Auto-marking**: Cron job marks ACTIVE batches as EXPIRED nightly
- **Batch validation**: Cannot register a batch with an already-past expiry date

### Expiry Alerts
- **Dashboard widget**: 4 clickable tiles showing counts per tier
- **Login-time banner**: Shows once per session if any expiring/expired batches exist (sessionStorage dismissed state)
- **AI Advice button**: On both dashboard widget and batches page — fetches DB data, sends to AI for compliance recommendations
- **Summary tiles on batches page**: 4 count tiles at page top

### Reorder System
- **Algorithmic recommendations**: Based on current stock, minimum level, and 30-day average daily sales
- **5 statuses**: OUT_OF_STOCK → REORDER_NOW → REORDER_SOON → WATCH → OK
- **Days-of-stock calculation**: `current_qty / avg_daily_sales`
- **Natural language recommendations**: Pre-written per status, no AI call needed
- **Dashboard panel**: Filterable by "Needs attention" or "All products" with left-color-border urgency indicator
- **Refresh button**: Re-fetches live data on demand

### Reports & Exports
- **Excel workbook** (4 sheets): Inventory Summary | Movements | Expiry Tracker | Low Stock Alerts
- **Excel styling**: Dark header rows, color-coded status cells, auto-filters on all sheets
- **PDF / HTML dispensing report**: Date-range filtered, formatted for browser Print → Save as PDF
- **Date range selector**: From/to date picker for dispensing report
- **All exports are audit-logged**: `writeAuditLog` called on every export

### AI Features
_(Detailed in Section 4)_
- AI Chat assistant (floating, all pages)
- AI Management Report
- OCR Invoice Scanner
- Expiry AI Recommendations
- Reorder Engine (algorithmic, no AI call)

### Audit Log
- **Immutable log**: Every CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, BACKUP is logged
- **Fields captured**: userId, action, entity, entityId, entityName, before/after changes (JSON), reason, IP address, user agent
- **Admin-only page**: Displays 200 most recent entries with color-coded action badges
- **Non-blocking**: Audit failures are caught and console-logged, never propagate to caller
- **Indexes**: On `(entity, entityId)`, `userId`, and `timestamp` for query performance

### Backup System
- **Manual trigger**: Admin can trigger backup from UI → `POST /api/backup`
- **Scheduled trigger**: Vercel Cron hits `/api/cron` daily at 01:00
- **Mechanism**: `pg_dump` piped to `gzip`, stored as `.sql.gz`
- **Auto-pruning**: Keeps last 30 local backups, deletes older ones
- **S3 upload**: Stub code present, requires `npm install @aws-sdk/client-s3` and AWS env vars
- **Backup records**: Every backup (manual or scheduled) creates a `BackupRecord` in DB with status, size, path, timestamp
- **History UI**: Shows last 30 backups with status icons, size, and storage path

### Settings
- **Account information**: Current user's name, email, role
- **Database statistics**: Product count, movement count, user count
- **User list** (admin only): All users with roles and creation dates

---

## 4. AI Features

### 4.1 AI Chat Assistant

**How it works:**
1. User sends a message from the floating chat panel
2. API route detects if the message mentions a specific product (regex match)
3. `getInventorySnapshot()` is called — pulls live data from DB (products, sales, expiry, reorder)
4. If a specific product is mentioned, `searchProducts()` is also called
5. All real data is formatted into a structured context string
6. Context + system prompt + full conversation history → AI provider
7. AI returns natural-language answer grounded in real data

**Safety:** AI is explicitly instructed never to invent quantities, never to modify data, and to always flag when data is live/real-time.

**Provider:** Whichever is configured via `AI_PROVIDER` env var (default: Gemini)  
**Route:** `POST /api/ai/chat`  
**Component:** `components/AIChat.tsx`  
**Library:** `lib/ai-inventory.ts` (DB queries), `lib/ai-provider.ts` (provider)

**Suggested questions shown on first open:**
- Which products are running low?
- What expires within 30 days?
- What are today's sales?
- Which products sell the most?
- Give me an inventory summary.

### 4.2 AI Management Report

**How it works:**
1. User clicks "Generate AI Report" on `/ai-report`
2. `getInventorySnapshot()` and `getReorderRecommendations()` run in parallel
3. Only computed statistics (numbers, not raw rows) are assembled into a prompt
4. AI is instructed to write a structured management narrative from those numbers only
5. Report returned with 6 sections: Executive Summary, Stock Health, Sales Analysis, Expiry & Compliance Risks, Reorder Recommendations, Action Items
6. Stats also returned separately for display in KPI tiles above the narrative

**Provider:** Configured provider (uses `complete()` method — single-turn)  
**Route:** `GET /api/ai/report`  
**Component:** `app/(app)/ai-report/page.tsx`  
**Library:** `lib/ai-inventory.ts`, `lib/ai-provider.ts`

### 4.3 OCR Invoice Scanner

**How it works:**
1. User uploads invoice image (JPEG/PNG/WebP) or PDF from sidebar "Scan Invoice" button
2. File validated: type check, 10MB size limit
3. File converted to base64
4. Sent to AI's `vision()` method with structured extraction prompt
5. AI returns JSON array of line items: productName, quantity, unitPrice, batchNumber, expiryDate, supplier, unit
6. Response parsed, markdown fences stripped
7. Items displayed in editable preview — user can modify any field or remove rows
8. On confirmation, each item is matched to existing products via `/api/products?search=` and an IN movement is created
9. Products not found in inventory are reported as errors — not silently ignored

**Safety:** Inventory is never modified until the user explicitly clicks "Confirm & Update Stock". User reviews and edits before any write.

**Provider:** Configured provider (uses `vision()` method — multimodal)  
**Route:** `POST /api/ai/ocr`  
**Component:** `components/OCRScanner.tsx`  
**Library:** `lib/ai-provider.ts`

### 4.4 Expiry AI Recommendations

**How it works:**
1. User clicks "AI Advice" on the dashboard expiry widget, or "AI Recommendations" on the batches page
2. `getExpiryBatchDetails()` fetches all batches expiring within 30 days + already expired
3. Batches are categorized by tier (expired, critical, warning, soon)
4. Context with specific product names, batch numbers, quantities, dates, and locations → AI
5. AI writes a compliance advisory with 5 sections: Immediate Actions, Priority Sales, Supplier Returns, Discounting, Regulatory Notes
6. Response displayed inline (widget) or in a dropdown panel (batches page)

**Safety:** AI only receives real batch data. Prompt explicitly forbids inventing product names or dates.

**Provider:** Configured provider (uses `complete()` method)  
**Routes:** `GET /api/ai/expiry-advice`  
**Components:** `components/ExpiryWidget.tsx`, `components/ExpiryAIAdvice.tsx`  
**Library:** `lib/expiry.ts`, `lib/ai-provider.ts`

### 4.5 Reorder Engine

**Note:** This is **algorithmic, not AI-powered**. The `GET /api/ai/reorder` route name is misleading — it calls `getReorderRecommendations()` which uses pure math, not an AI API call.

**How it works:**
1. Fetches all products
2. Queries 30-day OUT movement totals per product
3. Calculates `avgDailySales = totalSold / 30`
4. Calculates `daysOfStockRemaining = currentQty / avgDailySales`
5. Assigns status: OUT_OF_STOCK | REORDER_NOW | REORDER_SOON | WATCH | OK
6. Generates a pre-written recommendation string per status

**Route:** `GET /api/ai/reorder`  
**Component:** `components/ReorderPanel.tsx`  
**Library:** `lib/ai-inventory.ts`

---

## 5. User Interface

### Design Language
Dark-mode only. "Tech team" aesthetic: zinc/slate backgrounds, monospace fonts for all data (SKUs, quantities, timestamps), glassmorphism cards with subtle white-opacity borders, blue/emerald/amber/red accent system.

### Color Palette
| Element | Color |
|---|---|
| Page background | `zinc-950` (#09090b) with subtle grid SVG pattern |
| Card background | `rgba(255,255,255,0.03)` with `border: rgba(255,255,255,0.06)` |
| Primary accent | Blue-500/600 |
| Success / In stock | Emerald-400/500 |
| Warning | Amber-400 |
| Danger / Expired | Red-400/500 |
| Critical expiry | Orange-400 |
| Admin section | Purple-400/500 |

### Typography
- **UI text**: Inter (sans-serif), loaded from Google Fonts
- **Data (SKUs, quantities, dates, codes)**: JetBrains Mono (monospace)
- All SKUs displayed in `uppercase tracking-widest` monospace

### Navigation — Sidebar (left, 224px fixed)
```
WAYU [logo]
─────────────────
Main
  Dashboard
  Inventory
  Movements
  Expiry
  Locations
  Reports
─────────────────
AI Features  ⚡
  AI Report
  [Scan Invoice button]
─────────────────
Admin (role-gated)
  Audit Log
  Backups
  Settings
─────────────────
Sign Out
```

Active nav items highlighted with colored background + matching dot indicator. Admin section only visible to ADMIN role users (client-side check via `useSession`).

### TopBar (top, 56px)
- Left: search input with monospace font and ⌘K kbd shortcut label (decorative — not yet functional)
- Right: notification bell with red dot (decorative), user avatar (initials), name + email

### Dashboard Layout
```
[Header row: title + date + SYSTEM ONLINE pill]

[Stat Card] [Stat Card] [Stat Card] [Stat Card]

[Low Stock Alert Banner — conditional]

[Recent Movements] | [Expiry Widget] | [Reorder Panel]
   (1/3 width)          (1/3 width)      (1/3 width)
```

### Cards (StatCard)
4 per row on desktop, 2 on tablet, 1 on mobile. Each has icon with accent color background, large monospace number, label, subtitle. Alert state adds pulsing dot.

### Tables
All tables use consistent pattern: dark header with `zinc-600` monospace uppercase column labels, `divide-y` row separators, `hover:bg-white/[0.02]` row highlight, truncated cells for long text.

### Modals
Framer Motion `AnimatePresence` with `scale + opacity + y` entrance animation. Click-outside-to-close on backdrop. All modals are overlay on `backdrop-blur-sm` darkened background.

### AI Chat Panel
Fixed `bottom-6 right-6`, 384px wide, 560px tall. Floating blue "AI" button when closed. Chat bubbles: user messages in blue (right-aligned), AI responses in dark card (left-aligned with bot icon). Suggestion chips shown on first open. "Querying inventory…" spinner shown during API call with informative label.

### Mobile Responsiveness
- Sidebar is fixed-width (224px) — on small screens it overlaps content (no hamburger menu implemented)
- Stat cards collapse from 4-col to 2-col to 1-col
- Tables scroll horizontally with `overflow-x-auto`
- Modals use `max-w-*` with `p-4` padding to contain on mobile

### Animations
- Page loads: `animate-fade-in` (opacity 0→1 + translateY 8px→0)
- Modals: scale 0.96→1 + opacity 0→1, 0.2s ease-out
- Alert banner: slide in from top
- Expiry advice panel: height 0→auto accordion
- Stat card pulse: `animate-pulse-slow` on alert indicator

---

## 6. API Routes

### Authentication
| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler (login, session, signout) | Public |

### Products
| Route | Method | Purpose | Body / Params |
|---|---|---|---|
| `/api/products` | GET | List all products. `?search=` for text search, `?lowStock=true` for filter | — |
| `/api/products` | POST | Create product | `{sku, name, description?, category, quantity, minStockLevel, unit}` |
| `/api/products/[id]` | GET | Get single product + last 20 movements | — |
| `/api/products/[id]` | PATCH | Partial update product fields | Any subset of product fields |
| `/api/products/[id]` | DELETE | Delete product (ADMIN only, cascades movements) | — |

**Response:** Prisma Product object. DELETE requires ADMIN role.

### Movements
| Route | Method | Purpose |
|---|---|---|
| `/api/movements` | GET | List movements. `?productId=` `?locationId=` `?take=` |
| `/api/movements` | POST | Record movement (atomic: updates product qty + location inventory + batch qty) |

POST body: `{productId, type: IN|OUT|ADJUSTMENT, quantity, notes?, locationId?, batchId?, reference?}`  
Validation: OUT movements checked against available stock. Atomic via `prisma.$transaction`.  
Audit log written on every successful POST.

### Locations
| Route | Method | Purpose |
|---|---|---|
| `/api/locations` | GET | List active locations with inventory counts |
| `/api/locations` | POST | Create location (ADMIN only) |

POST body: `{code, name, address?, type: WAREHOUSE|BRANCH|CLINIC|PHARMACY}`  
Audit log written on create.

### Batches
| Route | Method | Purpose |
|---|---|---|
| `/api/batches` | GET | List batches. `?productId=` `?locationId=` `?expiringSoon=30` `?includeExpired=true` |
| `/api/batches` | POST | Register new batch |

POST body: `{productId, locationId, batchNumber, quantity, expiryDate (ISO), notes?}`  
Validation: Rejects batches with past expiry dates.

### Expiry
| Route | Method | Purpose |
|---|---|---|
| `/api/expiry` | GET | Returns `{counts: {expired, within7, within14, within30, total}, batches: []}` |

`?detail=true` includes full batch list with product + location info.

### Reports
| Route | Method | Purpose |
|---|---|---|
| `/api/reports` | GET | `?type=inventory&format=excel` → `.xlsx` download. `?format=pdf` → HTML for printing |

Audit-logged on every call.

### Audit
| Route | Method | Purpose |
|---|---|---|
| `/api/audit` | GET | Paginated audit log. `?entity=` `?entityId=` `?userId=` `?take=` `?skip=` |

ADMIN only.

### Backup
| Route | Method | Purpose |
|---|---|---|
| `/api/backup` | GET | List last 30 backup records |
| `/api/backup` | POST | Trigger manual backup |

ADMIN only.

### Cron
| Route | Method | Purpose |
|---|---|---|
| `/api/cron` | GET | Scheduled endpoint: runs backup + marks expired batches + counts expiring-soon |

Protected by `Authorization: Bearer $CRON_SECRET`. Called by Vercel Cron at 01:00 daily.

### AI Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/ai/chat` | POST | Body: `{messages: ChatMessage[]}`. Returns `{reply, provider}` |
| `/api/ai/report` | GET | Returns `{report, stats, provider, generatedAt}` |
| `/api/ai/ocr` | POST | Multipart form: `file` field. Returns `{items: ExtractedItem[], provider}` |
| `/api/ai/reorder` | GET | Returns array of `ReorderRecommendation` objects (algorithmic, no AI call) |
| `/api/ai/expiry-advice` | GET | Returns `{advice, provider, counts}` |

All AI routes require authentication. All query DB before calling AI.

---

## 7. Database

### Table: `users`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| email | String | Unique |
| password | String | bcrypt hash |
| name | String? | Optional display name |
| role | Role enum | ADMIN / STAFF / VIEWER |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Relations:** `movements[]`, `auditLogs[]`

### Table: `products`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| sku | String | Unique — e.g. `WY-AMX-500` |
| name | String | Product name |
| description | String? | Optional |
| category | String | Default: "General" |
| quantity | Int | Total across all locations |
| minStockLevel | Int | Reorder threshold |
| unit | String | tablets / capsules / etc. |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Relations:** `movements[]`, `batches[]`, `locationInventory[]`

### Table: `locations`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| code | String | Unique — e.g. `WH-MAIN` |
| name | String | Display name |
| address | String? | Optional |
| type | LocationType enum | WAREHOUSE / BRANCH / CLINIC / PHARMACY |
| active | Boolean | Default: true |
| createdAt | DateTime | Auto |

**Relations:** `inventory[]`, `movements[]`, `batches[]`

### Table: `location_inventory`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| quantity | Int | Stock at this location for this product |
| updatedAt | DateTime | Auto |
| locationId | String | FK → locations |
| productId | String | FK → products (cascade delete) |

**Unique constraint:** `[locationId, productId]`  
**Purpose:** Per-location stock tracking (join table between Location and Product)

### Table: `batches`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| batchNumber | String | Supplier lot number |
| quantity | Int | Remaining units in this batch |
| expiryDate | DateTime | Critical for pharma compliance |
| receivedDate | DateTime | Default: now() |
| status | BatchStatus enum | ACTIVE / DEPLETED / EXPIRED / QUARANTINE |
| notes | String? | Optional |
| productId | String | FK → products (cascade delete) |
| locationId | String | FK → locations |

**Relations:** `movements[]`

### Table: `movements`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| type | MovementType enum | IN / OUT / ADJUSTMENT / TRANSFER |
| quantity | Int | Always positive; type determines direction |
| notes | String? | Optional description |
| timestamp | DateTime | Default: now() |
| reference | String? | PO number, prescription ref, etc. |
| productId | String | FK → products (cascade delete) |
| userId | String | FK → users |
| locationId | String? | FK → locations (optional) |
| batchId | String? | FK → batches (optional) |

**Purpose:** Immutable transaction ledger. Every stock change is a movement record.

### Table: `audit_logs`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| action | AuditAction enum | CREATE/UPDATE/DELETE/LOGIN/LOGOUT/EXPORT/BACKUP |
| entity | String | "Product", "Movement", "Batch", etc. |
| entityId | String | ID of the affected record |
| entityName | String? | Human-readable name for quick reading |
| changes | Json? | `{ field: { before, after } }` diff |
| reason | String? | Why the change was made |
| ipAddress | String? | From x-forwarded-for header |
| userAgent | String? | Truncated to 200 chars |
| timestamp | DateTime | Default: now() |
| userId | String | FK → users |

**Indexes:** `(entity, entityId)`, `userId`, `timestamp`

### Table: `backup_records`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| filename | String | e.g. `wayu-backup-2024-...sql.gz` |
| sizeBytes | BigInt? | File size in bytes |
| status | BackupStatus enum | PENDING / RUNNING / SUCCESS / FAILED |
| triggeredBy | String | "scheduled" / "manual" / userId |
| storagePath | String? | Local path or S3 URI |
| errorMsg | String? | Error details on failure |
| startedAt | DateTime | Default: now() |
| completedAt | DateTime? | Null while running |

### Enums
| Enum | Values |
|---|---|
| Role | ADMIN, STAFF, VIEWER |
| MovementType | IN, OUT, ADJUSTMENT, TRANSFER |
| LocationType | WAREHOUSE, BRANCH, CLINIC, PHARMACY |
| BatchStatus | ACTIVE, DEPLETED, EXPIRED, QUARANTINE |
| AuditAction | CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, BACKUP |
| BackupStatus | PENDING, RUNNING, SUCCESS, FAILED |

---

## 8. Components

| Component | Type | Purpose |
|---|---|---|
| `AuthProvider` | Client | Wraps app with NextAuth `SessionProvider` for client-side session access |
| `Sidebar` | Client | Left navigation. Role-based admin section. OCRScanner embedded. Uses `useSession` for role check, `usePathname` for active state |
| `TopBar` | Client | 56px header. Search input (UI only), bell icon (UI only), user initials avatar |
| `StatCard` | Server | KPI tile. Props: title, value, subtitle, icon (Lucide), accent color, alert bool. 4-color accent system |
| `MovementsTable` | Server | Renders movement array as table. Shows type badge, product name + SKU, ±quantity, user, timestamp, notes. Used on dashboard and product detail |
| `LowStockAlert` | Server | Red-bordered banner listing products at/below min level with "RESTOCK →" links |
| `AddProductModal` | Client | Controlled form modal. Calls `POST /api/products`. 10-category dropdown. On success: closes + calls `router.refresh()` |
| `StockMovementModal` | Client | 3-type selector (IN/OUT/ADJUSTMENT) with visual button group. Quantity + notes. Calls `POST /api/movements` |
| `AIChat` | Client | Floating chat bubble. Fixed bottom-right. Full conversation history maintained in state. Fetches from `POST /api/ai/chat`. Shows suggestion chips on first open. Auto-scrolls to latest message |
| `OCRScanner` | Client | File upload (drag+drop or click). Image preview. Calls `POST /api/ai/ocr`. Displays editable extracted items. Calls `GET /api/products?search=` + `POST /api/movements` per item on confirm |
| `ReorderPanel` | Client | Fetches `GET /api/ai/reorder`. Filterable by urgent/all. Left color border by urgency. Refresh button. Shows days-of-stock remaining |
| `ExpiryWidget` | Client | Fetches `GET /api/expiry`. 4 clickable tier tiles. Inline AI advice panel (expandable accordion) triggered by "AI Advice" button |
| `ExpiryNotificationBanner` | Client | Fetches `/api/expiry` on mount. Shows once per session (sessionStorage key). Animated slide-in from top. Severity-keyed color (red/orange/amber) |
| `ExpiryAIAdvice` | Client | Dropdown button on batches page. Lazy-loads advice from `GET /api/ai/expiry-advice`. Caches response in state (won't re-fetch if already loaded) |

---

## 9. Pages

| Path | Auth | What Users Can Do |
|---|---|---|
| `/` | Public | Auto-redirects to `/dashboard` (if session) or `/login` |
| `/login` | Public | Email + password login. Shows demo credentials for development |
| `/dashboard` | Required | View KPI stats, low-stock alert, recent movements, expiry widget, reorder recommendations |
| `/inventory` | Required | Browse all products with stock status. Admin can add products via modal |
| `/inventory/[id]` | Required | View product detail (stock, stats, last updated). Record IN/OUT/ADJUSTMENT. View per-product movement history |
| `/movements` | Required | Full paginated movement history (last 100). Shows IN/OUT/ADJ badge counts in header |
| `/batches` | Required | Expiry tracker with 4 summary tiles. Color-coded table with days-remaining column. AI recommendations dropdown |
| `/locations` | Required | Grid of location cards. Admin can add new locations |
| `/reports` | Required | Export Full Inventory Excel (4 sheets) or Dispensing Summary PDF (date-range filtered, opens in new tab for printing) |
| `/ai-report` | Required | On-demand AI management report. KPI tiles from real DB stats + AI narrative with 6 sections |
| `/audit` | ADMIN only | Full audit log table: who, what, when, IP, before/after changes. Last 200 entries |
| `/backup` | ADMIN only | Backup history list + "Run Backup Now" button |
| `/settings` | Required | Account info. ADMIN also sees DB stats and full user list |

---

## 10. Current AI Architecture

### Provider Layer

```
.env.local
  AI_PROVIDER=gemini          (or claude, openai)
  GEMINI_API_KEY=...

        │
        ▼
lib/ai-provider.ts            ← Single entry point
  getAIProvider()             ← Called by every AI route
        │
        ├─ case 'gemini'  → lib/providers/gemini.ts   (gemini-1.5-flash)
        ├─ case 'claude'  → lib/providers/claude.ts   (claude-sonnet-4-6)
        └─ case 'openai'  → lib/providers/openai.ts   (gpt-4o-mini)

All providers implement: AIProvider interface
  .complete(prompt)     ← single-turn text
  .chat(messages)       ← multi-turn conversation
  .vision(media+prompt) ← image/PDF understanding
```

### Chat Flow

```
User types message in AIChat.tsx
        │
        ▼
POST /api/ai/chat
  1. getServerSession() → auth check
  2. regex match on last message → extract product name if present
  3. getInventorySnapshot() → full live DB snapshot
  4. searchProducts(name) → if specific product mentioned
  5. Build context string (all real data)
  6. system prompt + context + full message history → getAIProvider().chat()
  7. Return {reply, provider}
        │
        ▼
AIChat.tsx appends assistant message to state
```

### Report Flow

```
User clicks "Generate AI Report" on /ai-report
        │
        ▼
GET /api/ai/report
  1. getInventorySnapshot() + getReorderRecommendations() [parallel]
  2. Filter urgent/watching reorder items
  3. Assemble statistics-only prompt (numbers, not raw rows)
  4. getAIProvider().complete(prompt)
  5. Return {report, stats, provider, generatedAt}
        │
        ▼
ai-report/page.tsx renders KPI tiles from stats + narrative from report
```

### OCR Flow

```
User uploads file in OCRScanner.tsx
        │
        ▼
POST /api/ai/ocr (multipart/form-data)
  1. File type + size validation
  2. file → ArrayBuffer → base64
  3. Build MediaContent: {type: image|document, base64, mimeType}
  4. getAIProvider().vision({media, prompt: OCR_PROMPT})
  5. Parse JSON response (strip markdown fences)
  6. Return {items[], provider}
        │
        ▼
OCRScanner.tsx shows editable items list
User reviews + edits each item
User clicks "Confirm & Update Stock"
  → GET /api/products?search={productName} per item
  → POST /api/movements (IN) per matched product
  → router.refresh() on success
```

### Expiry AI Flow

```
User clicks "AI Advice" / "AI Recommendations"
        │
        ▼
GET /api/ai/expiry-advice
  1. getExpiryBatchDetails() → all expiring/expired batches with product + location
  2. Categorize into expired/critical/warning/soon
  3. Build context with specific product names, batch numbers, dates, locations
  4. getAIProvider().complete(advisory prompt)
  5. Return {advice, provider, counts}
        │
        ▼
ExpiryWidget.tsx (accordion) or ExpiryAIAdvice.tsx (dropdown) renders text
```

### Reorder Engine Flow (no AI)

```
GET /api/ai/reorder
  1. prisma.product.findMany()
  2. prisma.movement.groupBy(productId, 30d OUT movements)
  3. avgDailySales = totalSold / 30 per product
  4. daysOfStock = currentQty / avgDailySales
  5. Status assignment via threshold rules
  6. Pre-written recommendation string per status
  7. Return array
```

---

## 11. Security

### Authentication
- NextAuth.js with Credentials provider
- Passwords: bcryptjs with 12 salt rounds (industry standard)
- Sessions: JWT strategy — stateless, signed with `NEXTAUTH_SECRET`
- JWT contains: user id, email, name, role
- Session expiry: NextAuth default (30 days, configurable)

### Authorization
- **Server-side**: Every page in `(app)/layout.tsx` calls `getServerSession()` and redirects to `/login` if null
- **Route-level**: Every API route calls `getServerSession()` and returns 401 if null
- **Role checks**: DELETE products and all admin routes check `(session.user as any).role === 'ADMIN'` before proceeding
- **Sidebar**: Admin nav section rendered conditionally via `useSession().data.user.role`

### Protected Routes
All routes under `app/(app)/` are protected by the layout's server-side auth check. All API routes under `app/api/` (except `/api/auth/*`) check session on every request.

### API Security
- CSRF: Handled by NextAuth for auth endpoints; not explicitly implemented for custom endpoints (relies on same-origin cookie)
- Input validation: Zod schemas on all POST/PATCH bodies for products, movements
- SQL injection: Impossible via Prisma ORM (parameterized queries)
- Cron endpoint: Protected by `Authorization: Bearer $CRON_SECRET` header check

### Input Validation
- Zod schemas: `loginSchema`, `productSchema`, `movementSchema`, `locationSchema`, `batchSchema`
- File upload: Type allowlist + 10MB size limit in OCR route
- Stock integrity: OUT movements validated against available quantity before write
- Batch validation: Past expiry dates rejected

### Known Security Gaps
- No rate limiting on any API route (brute-force login possible)
- No CSRF token on custom API routes (mitigated by SameSite cookies in most deployments)
- Role type cast uses `as any` — not type-safe
- No account lockout after failed login attempts
- No password complexity enforcement (minimum 6 chars only)
- Search input not sanitized beyond Zod (safe via Prisma, but no additional sanitization)

---

## 12. Performance

### Database
- **Prisma singleton**: `globalForPrisma` pattern prevents connection pool exhaustion in Next.js dev hot-reload
- **Parallel queries**: `Promise.all()` used throughout (dashboard loads 6 queries in parallel, report loads 2 in parallel)
- **Selective includes**: Most queries use `select` to fetch only needed fields (e.g. `{ select: { name: true, sku: true } }`)
- **Pagination**: Movements capped at 50–100 per request; audit log supports `take/skip`
- **Indexes**: AuditLog has 3 indexes; `product.sku` and `location.code` are unique (implicitly indexed)
- **Missing indexes**: `movements.timestamp`, `movements.productId`, `batches.expiryDate` — these are not explicitly indexed and will slow down as data grows

### AI Request Optimization
- **DB-first pattern**: All AI calls are preceded by DB queries; AI never makes assumptions
- **Context size management**: Only statistics sent to report AI (not raw rows); snapshot limits expired items to 20
- **Single call per interaction**: No chained AI calls in any route
- **Provider caching**: `_provider` singleton in `ai-provider.ts` — provider instantiated once per server process
- **No response caching**: AI responses are not cached — every request hits the AI API. This is intentional for accuracy but costly at scale

### Frontend
- **Server components**: All pages are server components by default — no client-side data fetching on initial load (except dashboard widgets which lazy-load via `useEffect`)
- **`router.refresh()`**: Used after mutations instead of full page reload
- **Framer Motion**: Animations use GPU-composited properties (opacity, transform) only
- **No image optimization**: No Next.js `<Image>` components used (no product images in schema)

### Missing Performance Features
- No response caching (Redis/memory)
- No database connection pooling configuration (Prisma default)
- No `React.memo` or `useMemo` on heavy components
- The `getInventorySnapshot()` function runs 7+ DB queries — no caching layer between AI calls

---

## 13. Missing Features

Ranked by business priority for a pharmaceutical company:

| Priority | Feature | Why It Matters |
|---|---|---|
| 🔴 Critical | **Supplier management** | No supplier entity in schema. Cannot track who supplies what, contact info, or purchase orders |
| 🔴 Critical | **Purchase orders (POs)** | Stock IN movements have no formal PO workflow — no approval, no expected delivery dates |
| 🔴 Critical | **Rate limiting** | Login brute-force is possible. All API routes unprotected from abuse |
| 🔴 Critical | **Email notifications** | Expiry alerts, low-stock alerts, and backup failures currently only appear in UI |
| 🟠 High | **Barcode/QR scanning** | No SKU scanning — all product lookup is manual text search |
| 🟠 High | **Customer / patient records** | OUT movements have no destination — no patient, ward, or customer tracking |
| 🟠 High | **FIFO/FEFO enforcement** | No automatic "oldest batch first" dispensing logic |
| 🟠 High | **Prescription / dispensing records** | No link between OUT movements and prescriptions |
| 🟠 High | **Product images** | No image field in Product schema |
| 🟠 High | **Chart/graph analytics** | No visual charts — no trend lines, no sales graphs, no stock level history |
| 🟠 High | **TRANSFER movement UI** | MovementType includes TRANSFER but no UI or API logic implements it |
| 🟡 Medium | **Search functionality** | TopBar search is decorative — no actual global search implemented |
| 🟡 Medium | **Password reset flow** | No forgot password / email reset |
| 🟡 Medium | **User registration** | No self-registration — accounts must be seeded or added directly to DB |
| 🟡 Medium | **Unit conversion** | No conversion between units (e.g. boxes to tablets) |
| 🟡 Medium | **Pricing / cost tracking** | No unit cost or total inventory value calculation |
| 🟡 Medium | **Controlled substance logging** | No special handling for narcotics requiring dual-signature |
| 🟡 Medium | **Mobile sidebar** | No hamburger menu — sidebar overlaps on small screens |
| 🟡 Medium | **Notification center** | Bell icon is decorative — no notification inbox |
| 🟡 Medium | **AI response caching** | Same inventory questions generate new API calls every time |
| 🟡 Medium | **Prisma migrations** | Using `db:push` (schema-sync) rather than migration files — risky for production schema changes |
| 🟢 Low | **Dark/light mode toggle** | Dark mode only |
| 🟢 Low | **Two-factor authentication** | No 2FA option |
| 🟢 Low | **Audit log export** | No CSV/Excel download of audit logs |
| 🟢 Low | **Keyboard shortcuts** | ⌘K search is decorative |
| 🟢 Low | **Bulk product import** | No CSV upload for products |
| 🟢 Low | **Session activity log** | No LOGIN/LOGOUT entries written (AuditAction enum has them but no code calls them) |

---

## 14. Overall Assessment

### Strengths

**Architecture quality** is high. The AI provider abstraction (`lib/ai-provider.ts`) is a genuinely well-designed pattern — clean interface, lazy loading, zero coupling between features and providers. Adding OpenAI, Cohere, or a local model requires editing exactly two files. The database-first AI pattern (query real data, pass to AI, never guess) is the correct approach for a pharmaceutical system where data integrity is a regulatory requirement.

The **audit system** is properly structured: before/after diffs stored as JSON, IP address capture, non-blocking failure handling. The **expiry tier system** (`lib/expiry.ts`) is clean and reusable. The **atomic movement transactions** (`prisma.$transaction`) correctly prevent stock inconsistencies.

The **UI consistency** is exceptional for a project at this stage. Monospace data fonts, a coherent color accent system, glassmorphism cards, and Framer Motion animations all maintain the same visual language across 12+ pages.

### Weaknesses

The most significant weakness is **incomplete business logic coverage** relative to a real pharmaceutical operation. There is no supplier model, no purchase order workflow, no patient/prescription tracking, and no FIFO/FEFO enforcement. These aren't optional enhancements — they are operational requirements for a licensed pharmacy.

The **security posture** has exploitable gaps: no rate limiting, no account lockout, role checks using TypeScript `as any` casts rather than proper type-safe middleware. The cron secret is the only protection on a database-modifying scheduled endpoint.

**No database migrations** are configured — the project uses `prisma db push` which overwrites schema differences without a rollback path. Unacceptable for production data.

The `getInventorySnapshot()` function runs **7+ sequential and parallel queries with no caching**. At 10,000+ products this will produce noticeable latency on every AI chat interaction.

### Ratings

| Category | Score | Justification |
|---|---|---|
| **Architecture** | 8/10 | Provider abstraction, separation of concerns, and server/client split are solid. Provider singleton has a subtle bug (module-level cache doesn't reset between test runs). |
| **Security** | 4/10 | No rate limiting, no 2FA, no CSRF tokens on custom routes, role checks use `as any`. Good: bcrypt, JWT, server-side auth guards on every route. |
| **Functionality** | 5/10 | Core inventory CRUD is complete. Critical pharmaceutical features (suppliers, POs, prescriptions, FIFO) are missing. |
| **AI Integration** | 8/10 | DB-first pattern is correct and well-implemented. Provider abstraction is clean. OCR UX (review before save) is the right approach. No caching is the main gap. |
| **UI/UX** | 7/10 | Visually polished and internally consistent. Lacks mobile responsiveness, charts/analytics, and functional search. |
| **Performance** | 5/10 | Parallel DB queries and selective `select` are good. No caching, no DB indexes on query-heavy columns, no connection pooling config. |
| **Scalability** | 5/10 | Provider layer scales well. No horizontal scaling consideration for backup (local file system). No queue system for AI calls. |
| **Maintainability** | 7/10 | Good file organization, clear comments, TypeScript throughout. Zod validation. `as any` role casts and some inline business logic in API routes reduce score. |
| **Commercial Readiness** | 3/10 | Not ready for a licensed pharmacy without: supplier management, prescription tracking, FIFO, rate limiting, email alerts, proper migrations, 2FA, and regulatory audit completion. |

### What Enterprise-Level Quality Would Require

**Immediate (before any real data):**
1. Replace `prisma db push` with `prisma migrate dev` + migration history
2. Add rate limiting middleware (e.g. `@upstash/ratelimit` with Redis)
3. Fix role checks to use type-safe middleware rather than `as any` casts
4. Add `movements.timestamp`, `movements.productId`, `batches.expiryDate`, `batches.status` database indexes
5. Implement LOGIN/LOGOUT audit log entries

**Short-term (operational requirements):**
6. Supplier model + purchase order workflow
7. Email notifications (Resend or SendGrid) for expiry alerts and low stock
8. FIFO/FEFO batch selection on OUT movements
9. Customer/ward/prescription reference on OUT movements
10. User registration and password reset flows

**Medium-term (scale and compliance):**
11. Redis caching layer for AI snapshot queries (TTL: 5 minutes)
12. Chart analytics (Recharts) for stock trends, sales velocity, expiry timeline
13. Barcode scanning (ZXing or device camera API)
14. Two-factor authentication
15. Controlled substance handling (dual-signature, DEA-style logging)
16. Mobile-responsive sidebar (hamburger menu)
17. S3 backup completion (install and configure `@aws-sdk/client-s3`)
18. AI response caching to reduce API costs at scale

**Enterprise (regulated pharmaceutical):**
19. Philippine FDA / BFAD compliance module
20. Lot traceability (full batch genealogy)
21. Temperature and humidity monitoring integration
22. Role expansion: Pharmacist, Pharmacy Aide, QA Officer, Warehouse Manager
23. Multi-tenant isolation (if serving multiple pharmacy branches as separate organizations)
24. SOC 2 / ISO 27001 compliance documentation
25. Formal UAT, load testing, and penetration testing

---

*End of Technical Overview — WAYU Pharmaceutical Inventory System v2.0*
