# WAYU Pharmaceutical Inventory System

A production-ready inventory management system built for pharmaceutical environments. Dark-mode dashboard with real-time stock tracking, low-stock alerts, and full movement history.

---

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + Framer Motion
- **PostgreSQL** + Prisma ORM
- **NextAuth.js** (JWT sessions)

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally or a hosted instance (Railway, Supabase, Neon, etc.)

---

## Setup — Step by Step

### 1. Clone / extract the project

```bash
cd wayu-inventory
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/wayu_inventory"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Create the database

```bash
# If using psql locally:
createdb wayu_inventory

# Push the schema
npm run db:push
```

### 5. Seed the database

```bash
npm run db:seed
```

Creates a default admin account and a main warehouse location.
| Account | Email | Password | Role |
|---|---|---|---|
| Admin | admin@wayu.ph | `ChangeMeNow!` *(or set via `WAYU_ADMIN_PASSWORD` env var)* | ADMIN |

Add your real products, customers, suppliers, and stock via the application UI after logging in.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema to DB (no migration files) |
| `npm run db:migrate` | Create and run migration files |
| `npm run db:seed` | Seed with sample data |
| `npm run db:studio` | Open Prisma Studio (visual DB editor) |
| `npm run db:reset` | Reset DB and re-seed |

---

## Project Structure

```
wayu-inventory/
├── prisma/
│   ├── schema.prisma       # DB schema
│   └── seed.ts             # Minimal bootstrap seed (admin + warehouse)
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   ├── products/            # GET all, POST create
│   │   ├── products/[id]/       # GET one, PATCH, DELETE
│   │   └── movements/           # GET all, POST create
│   ├── dashboard/          # Main dashboard (stats + recent movements)
│   ├── inventory/          # Product list
│   ├── inventory/[id]/     # Product detail + movement history
│   ├── movements/          # Full movement log
│   ├── settings/           # Account info + user management
│   ├── login/              # Auth page
│   ├── globals.css         # Tailwind base + component classes
│   └── layout.tsx          # Root layout with SessionProvider
├── components/
│   ├── Sidebar.tsx         # Left navigation
│   ├── TopBar.tsx          # Top search bar + user avatar
│   ├── StatCard.tsx        # Dashboard stat tiles
│   ├── MovementsTable.tsx  # Reusable movements table
│   ├── LowStockAlert.tsx   # Alert banner for low stock
│   ├── AddProductModal.tsx # Modal: create new product
│   ├── StockMovementModal.tsx  # Modal: record IN/OUT/ADJUSTMENT
│   └── AuthProvider.tsx    # NextAuth SessionProvider wrapper
├── lib/
│   ├── db.ts               # Prisma singleton
│   ├── auth.ts             # NextAuth config + callbacks
│   ├── utils.ts            # Helpers (cn, formatDate, getStockStatus)
│   └── validations.ts      # Zod schemas
└── .env.example            # Environment variable template
```

---

## API Reference

### Products

```
GET    /api/products          List all products (?search=&lowStock=true)
POST   /api/products          Create product
GET    /api/products/:id      Get product + movement history
PATCH  /api/products/:id      Update product fields
DELETE /api/products/:id      Delete product (ADMIN only)
```

### Movements

```
GET    /api/movements         List movements (?productId=&take=50)
POST   /api/movements         Record movement (atomically updates stock)
```

Request body for `POST /api/movements`:
```json
{
  "productId": "cuid...",
  "type": "IN" | "OUT" | "ADJUSTMENT",
  "quantity": 50,
  "notes": "Optional note"
}
```

---

## Roles

| Role | Permissions |
|---|---|
| ADMIN | Full access — create, edit, delete products; view all users |
| STAFF | Record movements, view inventory |
| VIEWER | Read-only access |

---

## Deployment

### PostgreSQL on Railway / Neon / Supabase

1. Create a free PostgreSQL database
2. Copy the connection string into `.env.local` as `DATABASE_URL`
3. Run `npm run db:push && npm run db:seed`

### Deploy on Vercel

```bash
npm install -g vercel
vercel --prod
```

Add environment variables in the Vercel dashboard:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (set to your production URL)

---

## Customization

- **Brand colors** — edit `tailwind.config.ts` → `theme.extend.colors.wayu`
- **Categories** — edit the `CATEGORIES` array in `AddProductModal.tsx`
- **Low stock logic** — edit `getStockStatus()` in `lib/utils.ts`
- **Roles & permissions** — edit `lib/auth.ts` and API route guards

---

*WAYU Pharmaceutical Inventory System — v2.2.0*
