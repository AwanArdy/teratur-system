# Technical Design Document — TERATUR Backend

| Field | Value |
|---|---|
| **Judul** | TERATUR Backend — Technical Design (v1) |
| **Produk** | TERATUR (`teratur.id`) |
| **Dokumen** | DESIGN Backend (bukan implementasi frontend) |
| **Penulis** | Backend Engineering |
| **Tanggal** | 2026-09-04 |
| **Status** | Draft |
| **Stack wajib** | Express + TypeScript + PostgreSQL + Drizzle ORM + Zod |
| **PRD** | [`backend/PRD.md`](./PRD.md) |

Dokumen ini adalah spesifikasi implementasi. Engineer harus dapat menyalin schema, folder, dan katalog API ke kode tanpa menebak.

---

## 1. Overview

Backend greenfield menyediakan REST JSON di bawah `/api/v1` untuk dashboard mock di `frontend/`. Setiap request tenant-scoped (`organizationId` di JWT + filter Drizzle wajib). Stok memakai **ledger append-only** (`stock_movements`) plus snapshot `inventory_balances`; penjualan `made_to_order` meledakkan BOM dalam **satu transaksi PostgreSQL** dengan row-lock balance.

Client yang sudah ada (`frontend/src/api/client.ts`) memakai:

- `baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'`
- `Authorization: Bearer` dari `localStorage.auth_token`
- 401 → hapus token

**Keputusan base path:** server Express listen `:3000`, mount router di `/api/v1`. Frontend **harus** set `VITE_API_URL=http://localhost:3000/api/v1` saat wiring. Tidak ada alias `/api` tanpa versi (hindari pecah kontrak nanti). Health check tetap di `/healthz` (di luar prefix).

Load asumsi v1: ~100 org, 1–20 outlet, <50 kasir konkuren, POS p95 < 300 ms, dashboard p95 < 500 ms.

---

## 2. Background & Motivation

`backend/` kosong. UI sudah lengkap secara mock (auth 3 langkah, master bahan/produk/inventory, persediaan transfer/opname/waste, pengeluaran, karyawan+shift, laporan, chat AI, profil). Tanpa kontrak backend yang ketat, FE akan mengarang field yang bertentangan dengan mock (contoh paket Starter/Growth/Pro/Business vs Teratur Free/Pro vs Starter/Pro/Enterprise).

PRD sudah merukunkan:

- Plan canonical, timezone `Asia/Makassar`, money integer rupiah + unit cost `numeric(14,4)`.
- Stok tidak boleh negatif; COGS dari snapshot ledger, bukan hitung ulang harga kini.

DESIGN menjabarkan **bagaimana** itu dibangun di Express+Drizzle.

---

## 3. Goals & Non-Goals

### 3.1 Goals teknis v1

1. Runtime Node 22 LTS, TypeScript strict, npm (selaras `frontend/package-lock.json`).
2. Layering: route → middleware (requestId, auth, rbac, plan, zod, outlet) → service → repo Drizzle.
3. Schema lengkap + migrasi drizzle-kit + seed demo `owner@teratur.id`.
4. Isolasi tenant teruji (test negatif: org A tidak baca org B).
5. POS + stok konsisten di bawah beban kasir konkuren (row lock).
6. Observability: pino + `requestId` + metrik latency/error.
7. Kontrak error `{ error: { code, message, details? }, requestId }`.

### 3.2 Non-goals

NestJS, Prisma, session cookie sebagai auth primer, LLM production, payment gateway, job queue berat (v1: `setImmediate`/pg table `export_jobs` + worker in-process cukup), frontend.

---

## 4. Proposed Design

### 4.1 Runtime & tooling

| Item | Nilai |
|---|---|
| Node | `22.x` LTS (`engines.node: >=22 <23`) |
| Package manager | npm 10+ |
| Language | TypeScript 5.7+, `"strict": true`, `"module": "NodeNext"` |
| HTTP | `express@5` |
| DB | PostgreSQL 16 |
| ORM | `drizzle-orm` + `drizzle-kit` + `postgres` (postgres.js) |
| Validasi | `zod@3` |
| Auth hash | `argon2` (argon2id) |
| JWT | `jose` (atau `jsonwebtoken` — pilih `jose`) |
| Log | `pino` + `pino-http` |
| Test | `vitest` + `supertest` |
| Lint | `eslint` + `typescript-eslint` |
| Dev | `tsx watch`, `docker compose` postgres |

Scripts `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Env (Zod parse di `src/config/env.ts`):

```
NODE_ENV=development|test|production
PORT=3000
DATABASE_URL=postgres://teratur:teratur@localhost:5432/teratur
JWT_ACCESS_SECRET=  (min 32 chars)
JWT_REFRESH_SECRET=
OTP_PEPPER=
APP_TZ=Asia/Makassar
CORS_ORIGINS=http://localhost:5173
SMTP_URL=  (kosong = log OTP ke stdout)
SEED_DEMO=true
LOG_LEVEL=info
```

### 4.2 Folder structure

```
backend/
  package.json
  tsconfig.json
  drizzle.config.ts
  docker-compose.yml
  Dockerfile
  .env.example
  drizzle/
    migrations/
      0000_init.sql
      meta/
  src/
    server.ts                 # listen, graceful shutdown
    app.ts                    # express() + middleware + routers
    config/
      env.ts
      constants.ts            # TTL, pagination, plan limits
    db/
      client.ts               # drizzle + postgres.js
      schema/
        index.ts              # re-export
        enums.ts
        identity.ts           # users, orgs, outlets, ...
        catalog.ts            # ingredients, products, recipes, suppliers
        inventory.ts
        sales.ts
        expenses.ts
        staff.ts
        ai.ts
        ops.ts                # idempotency, audit, exports, daily_metrics
      migrate.ts
      seed.ts
    middleware/
      requestId.ts
      errorHandler.ts
      authenticate.ts
      requireOutlet.ts
      authorize.ts            # RBAC
      requirePlan.ts
      validate.ts             # zod
      idempotency.ts
      rateLimit.ts
    lib/
      logger.ts
      money.ts
      time.ts                 # WITA helpers (luxon atau date-fns-tz)
      jwt.ts
      password.ts
      otp.ts
      sku.ts
      documentNo.ts           # INV/, TRF/
      httpError.ts
      pagination.ts
    modules/
      auth/
        auth.routes.ts
        auth.service.ts
        auth.repo.ts
        auth.schemas.ts
      me/
      organizations/
      outlets/
      warehouses/
      suppliers/
      ingredients/
      products/
      inventory/
      transfers/
      opnames/
      wastes/
      sales/
      expenses/
      staff/
      shifts/
      dashboard/
      reports/
      billing/
      ai/
    jobs/
      exportWorker.ts
      dailyMetrics.ts
  tests/
    setup.ts
    helpers.ts
    tenant-isolation.test.ts
    sales-stock.test.ts
    auth.test.ts
```

Satu modul = `*.routes.ts` (hanya wiring), `*.schemas.ts` (Zod), `*.service.ts` (aturan bisnis), `*.repo.ts` (SQL Drizzle). Tidak ada query di routes.

### 4.3 Layering & request lifecycle

Urutan middleware di `app.ts`:

1. `helmet`
2. `cors` (origin allowlist)
3. `express.json({ limit: '1mb' })`
4. `requestId` (header `X-Request-Id` atau ulid `req_…`)
5. `pino-http`
6. `rateLimit` global (lihat Security)
7. Router `/api/v1`
8. 404 handler
9. `errorHandler`

Per route terproteksi:

`authenticate` → `requirePlan?` → `authorize(permission)` → `requireOutlet?` → `idempotency?` → `validate(schema)` → controller → service → repo.

`authenticate` memverifikasi access JWT, load user+membership+subscription ke `req.ctx`:

```ts
type RequestContext = {
  requestId: string;
  userId: string;
  organizationId: string;
  orgRole: 'owner' | 'admin' | 'staff';
  staffRole: StaffRole | null;
  staffId: string | null;
  outletIds: string[];          // yang diizinkan
  activeOutletId: string | null; // dari X-Outlet-Id
  planCode: PlanCode;
  planStatus: 'trialing' | 'active' | 'expired';
};
```

Repo **wajib** menerima `organizationId` sebagai argumen pertama; dilarang baca `req` di repo.

### 4.4 Multi-tenant isolation

- Setiap tabel tenant-owned punya `organization_id uuid not null references organizations(id)`.
- Unique bisnis: `(organization_id, sku)`, `(organization_id, outlet_id, no_nota)`, dll.
- Index leading column: `organization_id`.
- `authenticate` gagal jika user `disabled` atau membership tidak ada.
- Write outlet-scoped: `activeOutletId` harus ∈ `outletIds` (owner: semua outlet org).
- Tes wajib: seed 2 org, request token A ke resource B → 404 (bukan 403) agar tidak enumeration.

Tidak memakai PostgreSQL RLS di v1 (kompleks + drizzle). Bisa ditambah Phase 3 sebagai defense in depth.

---

## 5. Architecture diagrams

### 5.1 System context

```mermaid
flowchart LR
  FE["Frontend React\nVITE_API_URL /api/v1\nBearer auth_token"]
  API["Express API\nNode 22"]
  PG[(PostgreSQL 16)]
  SMTP["Email provider\nOTP / reset"]
  OBJ["Local disk / S3 later\nexport xlsx pdf"]

  FE -->|HTTPS JSON| API
  API --> PG
  API --> SMTP
  API --> OBJ
```

### 5.2 Request lifecycle

```mermaid
sequenceDiagram
  participant C as Client
  participant M as Middleware
  participant S as Service
  participant R as Drizzle Repo
  participant DB as PostgreSQL

  C->>M: POST /api/v1/sales + Bearer + Idempotency-Key + X-Outlet-Id
  M->>M: requestId, auth JWT, RBAC, plan, Zod
  M->>M: lookup idempotency_keys
  alt key hit same hash
    M-->>C: replay stored response
  else key hit different hash
    M-->>C: 409 IDEMPOTENCY_CONFLICT
  else miss
    M->>S: createSale(ctx, body)
    S->>DB: BEGIN
    S->>R: lock balances FOR UPDATE
    R->>DB: insert sales, items, movements, update qty
    S->>DB: COMMIT
    M->>DB: persist idempotency row
    M-->>C: 201 { data }
  end
```

### 5.3 Sale → recipe explosion → stock movement

```mermaid
sequenceDiagram
  participant POS as sales.service
  participant P as products + recipe_lines
  participant B as inventory_balances
  participant L as stock_movements

  POS->>P: load products + BOM for item.productIds
  loop tiap sale line
    alt kind = made_to_order OR pre_order
      loop tiap recipe line
        POS->>B: lock (warehouseId, ingredient)
        POS->>B: available = qtyOnHand - qtyReserved
        alt available < recipeQty * soldQty
          POS-->>POS: rollback INSUFFICIENT_STOCK
        else
          POS->>B: qtyOnHand -= need
          POS->>L: SALE_OUT qty=need unitCost=avgUnitCost
        end
      end
    else kind = finished_good
      POS->>B: lock finished good SKU
      POS->>B: qtyOnHand -= soldQty
      POS->>L: SALE_OUT on product
    end
    POS->>POS: snapshot unitCogsIdr on sale_item
  end
  POS->>POS: sale.cogsIdr = Σ line cogs
```

### 5.4 ER diagram (inti)

```mermaid
erDiagram
  organizations ||--o{ outlets : has
  organizations ||--o{ organization_members : has
  organizations ||--o{ subscriptions : has
  users ||--o{ organization_members : joins
  outlets ||--o{ warehouses : has
  outlets ||--o{ sales : has
  outlets ||--o{ staff : has
  organizations ||--o{ ingredients : has
  organizations ||--o{ products : has
  products ||--o{ recipe_lines : has
  warehouses ||--o{ inventory_balances : has
  inventory_balances ||--o{ stock_movements : ledgers
  sales ||--o{ sale_items : has
  organizations ||--o{ suppliers : has
  outlets ||--o{ expenses : has
  outlets ||--o{ cash_shifts : has
  warehouses ||--o{ stock_transfers_from : from
  warehouses ||--o{ stock_transfers_to : to

  organizations {
    uuid id PK
    text name
  }
  users {
    uuid id PK
    text email
  }
  outlets {
    uuid id PK
    uuid organization_id FK
  }
  ingredients {
    uuid id PK
    uuid organization_id FK
    text sku
  }
  products {
    uuid id PK
    uuid organization_id FK
    text sku
  }
  inventory_balances {
    uuid id PK
    uuid warehouse_id FK
    text item_type
    uuid item_id
    numeric qty_on_hand
    numeric avg_unit_cost
  }
  sales {
    uuid id PK
    text no_nota
    bigint total_idr
  }
```

---

## 6. Data model (Drizzle-style)

Konvensi: tabel `snake_case` jamak; kolom `snake_case`; PK `uuid` default `gen_random_uuid()`; timestamps `timestamptz` `created_at`/`updated_at`; soft delete `deleted_at` hanya pada master (ingredients, products, staff, suppliers, outlets). Ledger **tanpa** delete.

Money totals: `bigint` (rupiah utuh). Qty & unit cost: `numeric(14, 4)`.

File `src/db/schema/enums.ts` — PostgreSQL enums:

```ts
import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', ['pending', 'active', 'disabled']);
export const planCodeEnum = pgEnum('plan_code', ['free_trial', 'starter', 'growth', 'pro', 'business']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trialing', 'active', 'expired']);
export const registerBusinessTypeEnum = pgEnum('register_business_type', ['restaurant', 'retail', 'service']);
export const outletBusinessTypeEnum = pgEnum('outlet_business_type', [
  'coffee_bakery', 'restaurant', 'warung', 'retail', 'catering', 'food_manufacture',
]);
export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'staff']);
export const staffRoleEnum = pgEnum('staff_role', [
  'store_manager', 'head_barista', 'barista', 'cashier', 'cook', 'helper',
]);
export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contract']);
export const ingredientCategoryEnum = pgEnum('ingredient_category', [
  'dairy', 'coffee_bean', 'syrup', 'packaging', 'flavor_powder', 'other',
]);
export const productKindEnum = pgEnum('product_kind', ['made_to_order', 'finished_good', 'pre_order']);
export const stockItemTypeEnum = pgEnum('stock_item_type', ['ingredient', 'finished_good']);
export const movementTypeEnum = pgEnum('movement_type', [
  'purchase_in', 'adjustment_in', 'adjustment_out', 'sale_out', 'sale_void_in',
  'transfer_out', 'transfer_in', 'opname', 'waste_out',
]);
export const transferStatusEnum = pgEnum('transfer_status', ['in_transit', 'completed', 'cancelled']);
export const opnameStatusEnum = pgEnum('opname_status', ['pending_review', 'approved', 'rejected']);
export const wasteReasonEnum = pgEnum('waste_reason', ['expired', 'damaged', 'trial_fail', 'lost']);
export const orderTypeEnum = pgEnum('order_type', ['dine_in', 'takeaway', 'delivery']);
export const paymentMethodEnum = pgEnum('payment_method', ['qris', 'cash', 'debit', 'bank_transfer']);
export const saleStatusEnum = pgEnum('sale_status', ['paid', 'pending', 'cancelled']);
export const expenseCategoryEnum = pgEnum('expense_category', [
  'raw_material', 'packaging', 'operational', 'salary', 'utilities', 'equipment', 'transport', 'other',
]);
export const payStatusEnum = pgEnum('pay_status', ['paid', 'unpaid', 'credit']);
export const shiftNameEnum = pgEnum('shift_name', ['morning', 'evening']);
export const shiftStatusEnum = pgEnum('shift_status', ['open', 'balanced', 'variance']);
export const uomEnum = pgEnum('uom', [
  'ml', 'gram', 'kg', 'pcs', 'liter', 'botol', 'karton', 'pouch', 'pack', 'orang', 'bulan',
]);
export const recipeComponentTypeEnum = pgEnum('recipe_component_type', ['ingredient', 'product']);
export const otpPurposeEnum = pgEnum('otp_purpose', ['register', 'email_change']);
```

`uom` sebagai enum memudahkan validasi; jika FE kirim satuan baru, tambah migrasi (jangan `text` liar di v1).

### 6.1 Identity

```ts
import { pgTable, uuid, text, timestamp, boolean, bigint, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  jobTitle: text('job_title'),
  status: userStatusEnum('status').notNull().default('pending'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('users_email_uidx').on(t.email),
]);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  country: text('country').notNull().default('Indonesia'),
  province: text('province').notNull(),
  city: text('city').notNull(),
  registerBusinessType: registerBusinessTypeEnum('register_business_type').notNull(),
  acceptedTermsAt: timestamp('accepted_terms_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  orgRole: orgRoleEnum('org_role').notNull(),
  defaultOutletId: uuid('default_outlet_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('org_members_org_user_uidx').on(t.organizationId, t.userId),
  index('org_members_user_idx').on(t.userId),
]);

export const outlets = pgTable('outlets', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  businessType: outletBusinessTypeEnum('business_type').notNull().default('coffee_bakery'),
  address: text('address'),
  city: text('city'),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('outlets_org_idx').on(t.organizationId),
]);

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  name: text('name').notNull(),
  code: text('code').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('warehouses_org_outlet_code_uidx').on(t.organizationId, t.outletId, t.code),
  index('warehouses_outlet_idx').on(t.outletId),
]);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  planCode: planCodeEnum('plan_code').notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  outletLimit: integer('outlet_limit').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('subscriptions_org_uidx').on(t.organizationId),
]);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  lowStock: boolean('low_stock').notNull().default(true),
  dailyReport: boolean('daily_report').notNull().default(true),
  newTransaction: boolean('new_transaction').notNull().default(false),
  unpaidReminder: boolean('unpaid_reminder').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  userAgent: text('user_agent'),
  ip: text('ip'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('refresh_tokens_hash_uidx').on(t.tokenHash),
  index('refresh_tokens_user_idx').on(t.userId),
]);

export const emailOtps = pgTable('email_otps', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  userId: uuid('user_id').references(() => users.id),
  purpose: otpPurposeEnum('purpose').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  lastSentAt: timestamp('last_sent_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('email_otps_email_purpose_idx').on(t.email, t.purpose),
]);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('password_reset_hash_uidx').on(t.tokenHash),
]);

export const registrations = pgTable('registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  onboardingTokenHash: text('onboarding_token_hash'),
  onboardingExpiresAt: timestamp('onboarding_expires_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 6.2 Catalog

```ts
import { numeric } from 'drizzle-orm/pg-core';

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('suppliers_org_idx').on(t.organizationId),
]);

export const ingredients = pgTable('ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  category: ingredientCategoryEnum('category').notNull(),
  uom: uomEnum('uom').notNull(),
  purchasePriceIdr: bigint('purchase_price_idr', { mode: 'number' }).notNull(),
  minStock: numeric('min_stock', { precision: 14, scale: 4 }).notNull().default('0'),
  leadTimeDays: integer('lead_time_days').notNull().default(3),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  supplierName: text('supplier_name'),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('ingredients_org_sku_uidx').on(t.organizationId, t.sku),
  index('ingredients_org_name_idx').on(t.organizationId, t.name),
]);

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  sellingPriceIdr: bigint('selling_price_idr', { mode: 'number' }).notNull(),
  kind: productKindEnum('kind').notNull().default('made_to_order'),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('products_org_sku_uidx').on(t.organizationId, t.sku),
]);

export const recipeLines = pgTable('recipe_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  componentType: recipeComponentTypeEnum('component_type').notNull(),
  componentId: uuid('component_id').notNull(),
  qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('recipe_lines_product_idx').on(t.productId),
  uniqueIndex('recipe_lines_product_component_uidx').on(t.productId, t.componentType, t.componentId),
]);
```

`purchase_price_idr` = harga beli per **1 unit `uom`**. Jika UI mock menampilkan susu Rp 18.500 / liter tetapi `uom=ml`, seed harus `purchasePriceIdr = 19` (pembulatan) **atau** `uom=liter` dan resep memakai pecahan liter. **Keputusan:** simpan UOM dasar yang dipakai resep (ml/gram/pcs). Harga per ml susu = `numeric` avg cost, bukan bigint. Field `purchasePriceIdr` adalah **harga referensi pembelian terakhir dalam rupiah per UOM dasar, dibulatkan**; avg cost yang dipakai HPP ada di `inventory_balances.avg_unit_cost` (numeric). Saat create bahan tanpa stok, `avg_unit_cost` awal = `purchasePriceIdr` (cast numeric).

Untuk kasus 18500/L dengan uom ml: seed `purchasePriceIdr=19` **salah**. Lebih tepat: izinkan `purchasePriceIdr` bigint hanya untuk harga beli **kemasan** dan simpan `purchaseQty`? PRD Q6: unit cost numeric. Maka **tambah** `last_purchase_unit_cost numeric(14,4)` di ingredients; `purchasePriceIdr` di API response untuk UI master = `Math.round(lastPurchaseUnitCost)` jika UI integer, **atau** expose `purchaseUnitCost` numeric di API dan FE format. **Canonical API:** `purchaseUnitCost: number` (float JSON dari numeric) + `purchasePriceIdr` integer = `Math.round(purchaseUnitCost)` untuk kartu yang butuh Rp utuh. Form bahan UI integer → kasir UMKM; HPP resep tetap numeric.

### 6.3 Inventory

```ts
export const inventoryBalances = pgTable('inventory_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  itemType: stockItemTypeEnum('item_type').notNull(),
  itemId: uuid('item_id').notNull(),
  qtyOnHand: numeric('qty_on_hand', { precision: 14, scale: 4 }).notNull().default('0'),
  qtyReserved: numeric('qty_reserved', { precision: 14, scale: 4 }).notNull().default('0'),
  avgUnitCost: numeric('avg_unit_cost', { precision: 14, scale: 4 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('inv_bal_wh_item_uidx').on(t.warehouseId, t.itemType, t.itemId),
  index('inv_bal_org_outlet_idx').on(t.organizationId, t.outletId),
]);

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  itemType: stockItemTypeEnum('item_type').notNull(),
  itemId: uuid('item_id').notNull(),
  type: movementTypeEnum('type').notNull(),
  qty: numeric('qty', { precision: 14, scale: 4 }).notNull(), // signed: IN +, OUT -
  unitCost: numeric('unit_cost', { precision: 14, scale: 4 }).notNull(),
  amountIdr: bigint('amount_idr', { mode: 'number' }).notNull(), // round(abs(qty)*unitCost)
  refType: text('ref_type').notNull(), // sale | transfer | opname | waste | adjustment
  refId: uuid('ref_id').notNull(),
  notes: text('notes'),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('stock_movements_org_time_idx').on(t.organizationId, t.occurredAt),
  index('stock_movements_item_time_idx').on(t.organizationId, t.itemType, t.itemId, t.occurredAt),
  index('stock_movements_ref_idx').on(t.refType, t.refId),
  index('stock_movements_wh_idx').on(t.warehouseId, t.occurredAt),
]);

export const stockTransfers = pgTable('stock_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  noTransfer: text('no_transfer').notNull(),
  fromWarehouseId: uuid('from_warehouse_id').notNull().references(() => warehouses.id),
  toWarehouseId: uuid('to_warehouse_id').notNull().references(() => warehouses.id),
  status: transferStatusEnum('status').notNull().default('in_transit'),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('stock_transfers_org_no_uidx').on(t.organizationId, t.noTransfer),
  index('stock_transfers_org_idx').on(t.organizationId, t.createdAt),
]);

export const stockTransferLines = pgTable('stock_transfer_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  transferId: uuid('transfer_id').notNull().references(() => stockTransfers.id),
  itemType: stockItemTypeEnum('item_type').notNull(),
  itemId: uuid('item_id').notNull(),
  qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
  uom: uomEnum('uom').notNull(),
  unitCost: numeric('unit_cost', { precision: 14, scale: 4 }).notNull(),
});

export const stockOpnames = pgTable('stock_opnames', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  itemType: stockItemTypeEnum('item_type').notNull(),
  itemId: uuid('item_id').notNull(),
  systemQty: numeric('system_qty', { precision: 14, scale: 4 }).notNull(),
  physicalQty: numeric('physical_qty', { precision: 14, scale: 4 }).notNull(),
  varianceQty: numeric('variance_qty', { precision: 14, scale: 4 }).notNull(),
  uom: uomEnum('uom').notNull(),
  notes: text('notes'),
  status: opnameStatusEnum('status').notNull().default('pending_review'),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  approvedByUserId: uuid('approved_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
}, (t) => [
  index('stock_opnames_org_idx').on(t.organizationId, t.createdAt),
]);

export const wasteLogs = pgTable('waste_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  itemType: stockItemTypeEnum('item_type').notNull(),
  itemId: uuid('item_id').notNull(),
  qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
  uom: uomEnum('uom').notNull(),
  reason: wasteReasonEnum('reason').notNull(),
  lossIdr: bigint('loss_idr', { mode: 'number' }).notNull(),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('waste_logs_org_time_idx').on(t.organizationId, t.createdAt),
]);
```

Constraint aplikasi: `qty_on_hand >= 0`, `qty_reserved >= 0`, `qty_on_hand >= qty_reserved`. Enforce di service + `CHECK` SQL.

### 6.4 Sales, expenses, staff, AI, ops

```ts
export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  noNota: text('no_nota').notNull(),
  soldAt: timestamp('sold_at', { withTimezone: true }).notNull().defaultNow(),
  cashierUserId: uuid('cashier_user_id').notNull().references(() => users.id),
  cashierStaffId: uuid('cashier_staff_id').references(() => staff.id),
  cashShiftId: uuid('cash_shift_id').references(() => cashShifts.id),
  orderType: orderTypeEnum('order_type').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  customerName: text('customer_name'),
  subtotalIdr: bigint('subtotal_idr', { mode: 'number' }).notNull(),
  discountIdr: bigint('discount_idr', { mode: 'number' }).notNull().default(0),
  taxIdr: bigint('tax_idr', { mode: 'number' }).notNull().default(0),
  totalIdr: bigint('total_idr', { mode: 'number' }).notNull(),
  cogsIdr: bigint('cogs_idr', { mode: 'number' }).notNull().default(0),
  status: saleStatusEnum('status').notNull().default('paid'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledByUserId: uuid('cancelled_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('sales_org_outlet_nota_uidx').on(t.organizationId, t.outletId, t.noNota),
  index('sales_outlet_sold_at_idx').on(t.outletId, t.soldAt),
  index('sales_org_sold_at_idx').on(t.organizationId, t.soldAt),
]);

export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  saleId: uuid('sale_id').notNull().references(() => sales.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  nameSnapshot: text('name_snapshot').notNull(),
  qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
  unitPriceIdr: bigint('unit_price_idr', { mode: 'number' }).notNull(),
  lineTotalIdr: bigint('line_total_idr', { mode: 'number' }).notNull(),
  unitCogsIdr: bigint('unit_cogs_idr', { mode: 'number' }).notNull().default(0),
  lineCogsIdr: bigint('line_cogs_idr', { mode: 'number' }).notNull().default(0),
});

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  date: text('date').notNull(), // YYYY-MM-DD di kalender WITA
  name: text('name').notNull(),
  category: expenseCategoryEnum('category').notNull(),
  qty: numeric('qty', { precision: 14, scale: 4 }).notNull(),
  uom: uomEnum('uom').notNull(),
  unitPriceIdr: bigint('unit_price_idr', { mode: 'number' }).notNull(),
  totalIdr: bigint('total_idr', { mode: 'number' }).notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  supplierName: text('supplier_name'),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  payStatus: payStatusEnum('pay_status').notNull(),
  notes: text('notes'),
  countedInCogs: boolean('counted_in_cogs').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('expenses_outlet_date_idx').on(t.outletId, t.date),
  index('expenses_org_date_idx').on(t.organizationId, t.date),
]);

export const staff = pgTable('staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  userId: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  staffRole: staffRoleEnum('staff_role').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  employmentType: employmentTypeEnum('employment_type').notNull(),
  joinedOn: text('joined_on').notNull(), // YYYY-MM-DD WITA
  baseSalaryIdr: bigint('base_salary_idr', { mode: 'number' }).notNull().default(0),
  allowanceIdr: bigint('allowance_idr', { mode: 'number' }).notNull().default(0),
  currentShiftLabel: text('current_shift_label'),
  ratingScore: numeric('rating_score', { precision: 3, scale: 1 }).notNull().default('5.0'),
  isActive: boolean('is_active').notNull().default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('staff_org_outlet_idx').on(t.organizationId, t.outletId),
]);

export const cashShifts = pgTable('cash_shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  staffId: uuid('staff_id').notNull().references(() => staff.id),
  openedByUserId: uuid('opened_by_user_id').notNull().references(() => users.id),
  shiftName: shiftNameEnum('shift_name').notNull(),
  startingCashIdr: bigint('starting_cash_idr', { mode: 'number' }).notNull(),
  cashSalesIdr: bigint('cash_sales_idr', { mode: 'number' }).notNull().default(0),
  qrisSalesIdr: bigint('qris_sales_idr', { mode: 'number' }).notNull().default(0),
  actualPhysicalCashIdr: bigint('actual_physical_cash_idr', { mode: 'number' }),
  differenceIdr: bigint('difference_idr', { mode: 'number' }),
  notes: text('notes'),
  status: shiftStatusEnum('status').notNull().default('open'),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (t) => [
  index('cash_shifts_outlet_open_idx').on(t.outletId, t.status),
]);

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  conversationId: uuid('conversation_id').notNull().references(() => aiConversations.id),
  role: text('role').notNull(), // user | assistant
  text: text('text').notNull(),
  suggestions: text('suggestions'), // JSON array string, atau jsonb
  clientMessageId: text('client_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
  method: text('method').notNull(),
  path: text('path').notNull(),
  key: text('key').notNull(),
  requestHash: text('request_hash').notNull(),
  responseStatus: integer('response_status').notNull(),
  responseBody: text('response_body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => [
  uniqueIndex('idempotency_scope_uidx').on(t.organizationId, t.userId, t.method, t.path, t.key),
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  actorUserId: uuid('actor_user_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id'),
  metadata: text('metadata'),
  ip: text('ip'),
  requestId: text('request_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_logs_org_time_idx').on(t.organizationId, t.createdAt),
]);

export const exportJobs = pgTable('export_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull(), // sales_xlsx | sales_pdf | stock_xlsx | stock_pdf
  status: text('status').notNull(), // pending | running | done | failed
  params: text('params').notNull(),
  filePath: text('file_path'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const dailyMetrics = pgTable('daily_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  outletId: uuid('outlet_id').notNull(),
  date: text('date').notNull(), // WITA YYYY-MM-DD
  omsetNetIdr: bigint('omset_net_idr', { mode: 'number' }).notNull().default(0),
  omsetGrossIdr: bigint('omset_gross_idr', { mode: 'number' }).notNull().default(0),
  cogsIdr: bigint('cogs_idr', { mode: 'number' }).notNull().default(0),
  opexIdr: bigint('opex_idr', { mode: 'number' }).notNull().default(0),
  wasteIdr: bigint('waste_idr', { mode: 'number' }).notNull().default(0),
  trxCount: integer('trx_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('daily_metrics_outlet_date_uidx').on(t.outletId, t.date),
  index('daily_metrics_org_date_idx').on(t.organizationId, t.date),
]);

export const documentCounters = pgTable('document_counters', {
  organizationId: uuid('organization_id').notNull(),
  outletId: uuid('outlet_id'), // nullable for org-level TRF
  kind: text('kind').notNull(), // INV | TRF
  yyyymmdd: text('yyyymmdd').notNull(),
  lastValue: integer('last_value').notNull(),
}, (t) => [
  uniqueIndex('doc_counters_uidx').on(t.organizationId, t.outletId, t.kind, t.yyyymmdd),
]);
```

Catatan circular FK: `sales.cashierStaffId` → `staff`; definisikan `staff` sebelum `sales` di file yang sama atau pakai `AnyPgColumn`. `cashShifts` sebelum `sales` jika FK shift.

`ai_messages.suggestions`: kolom `jsonb` lebih baik:

```ts
suggestions: jsonb('suggestions').$type<string[]>(),
```

Sama untuk `auditLogs.metadata` dan `exportJobs.params`.

---

## 7. Money, stok, HPP

### 7.1 Money

| Jenis | Tipe | Contoh |
|---|---|---|
| Harga jual, total, gaji, loss, omset | `bigint` rupiah | `28000` |
| Qty resep/stok | `numeric(14,4)` | `180.0000` ml |
| Unit cost / avg cost | `numeric(14,4)` | `18.5000` Rp/ml |

JSON: integer tetap number JSON; numeric di-parse `Number` (4 desimal cukup aman < 2^53 untuk qty F&B).

`amountIdr` pada movement = `Math.round(abs(qty) * Number(unitCost))`.

Alasan tidak millirupiah: UI dan seed memakai Rp 18.5/ml; numeric 4 desimal cukup sampai 0.0001 rupiah/unit. Alasan tidak numeric untuk total: `formatCurrency` FE 0 desimal; menghindari drift 115500.0000001.

### 7.2 Weighted average

IN (`purchase_in`, `adjustment_in`, `transfer_in`, `sale_void_in` jika mengembalikan cost snapshot):

```
newQty = oldQty + inboundQty
newAvg = (oldQty * oldAvg + inboundQty * inboundCost) / newQty
```

Jika `oldQty = 0`, `newAvg = inboundCost`.

OUT (`sale_out`, `adjustment_out`, `transfer_out`, `waste_out`): `qtyOnHand -= qty`; **avg tidak berubah**. `unitCost` movement = avg sebelum update.

Opname: `variance > 0` diperlakukan IN dengan cost = avg (atau purchasePrice jika avg 0); `variance < 0` OUT.

Transfer create: OUT gudang asal (avg cost tercatat di line); receive: IN gudang tujuan dengan cost = line.unitCost (bukan avg tujuan sebelum).

### 7.3 HPP produk (preview)

Untuk tiap recipe line:

- `ingredient`: `unitCost = balance.avgUnitCost` gudang default outlet aktif, fallback `ingredient.lastPurchaseUnitCost` / `purchasePriceIdr`.
- `product` (BOM nested, contoh croissant jadi): pakai avg finished good, **satu tingkat** (tidak rekursif v1).

```
hppNumeric = Σ qty * unitCost
hppIdr = round(hppNumeric)
marginPct = (sellingPriceIdr - hppIdr) / sellingPriceIdr * 100
```

Grade sesuai PRD §6.6.

### 7.4 Konkurensi stok

Di dalam `db.transaction`:

```sql
SELECT * FROM inventory_balances
WHERE warehouse_id = $1 AND item_type = $2 AND item_id = $3
FOR UPDATE;
```

Jika row belum ada, `INSERT` lalu lock. Isolation default READ COMMITTED + FOR UPDATE cukup untuk <50 kasir. Jangan hitung available di JS tanpa lock.

---

## 8. Auth design

### 8.1 Password

- Min 8 karakter (Zod).
- Hash `argon2id`, `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1` (OWASP).
- Verify `argon2.verify`.

### 8.2 JWT

Access (15 menit):

```json
{
  "sub": "<userId>",
  "org": "<organizationId>",
  "role": "owner",
  "sid": "<refreshTokenId>",
  "typ": "access"
}
```

User pending (baru register, belum langkah 3) **tidak** mendapat access; hanya `registrationId`. Setelah OTP: `onboardingToken` JWT `typ=onboarding` 15 menit, `sub=userId`, tanpa `org`.

Refresh: opaque random 32 bytes, simpan `sha256` di `refresh_tokens`. JWT refresh **tidak** dipakai sebagai string raw di DB.

Remember me: `expiresAt = now + 30d` vs `12h`.

Login response:

```json
{
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<opaque>",
    "expiresIn": 900,
    "user": { "id": "...", "fullName": "...", "email": "...", "phone": "...", "jobTitle": "Owner / Pemilik Usaha" },
    "organization": { "id": "...", "name": "Kopi Susu Teratur" },
    "outlet": { "id": "...", "name": "Kopi Teratur Flagship" },
    "subscription": { "planCode": "pro", "status": "active" }
  }
}
```

FE menyimpan `accessToken` ke `localStorage.auth_token`. Dokumentasikan `auth_refresh` untuk FE (PRD open Q4).

### 8.3 OTP

- 6 digit crypto random `randomInt(0, 1_000_000)`.
- Simpan hash `sha256(pepper + code + email)`.
- TTL 10 menit; resend min 60 detik dari `lastSentAt`; 5 salah → `lockedUntil = now+15m`.
- Dev tanpa SMTP: log `OTP [register] email=... code=123456`.

### 8.4 Forgot password

Token 32 bytes, hash di DB, TTL 1 jam. Link `https://app.teratur.id/reset-password?token=` (FE belum ada; API tetap). Sukses reset → `revokedAt=now` semua refresh user.

---

## 9. Error envelope, pagination, idempotency

Sukses item:

```json
{ "data": { }, "requestId": "req_01J..." }
```

Sukses list:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0 },
  "requestId": "req_01J..."
}
```

Error: sesuai PRD §12. `errorHandler` memetakan `ZodError` → 400 `VALIDATION_ERROR` details path/message; `HttpError` custom; unknown → 500 `INTERNAL_ERROR` (jangan bocorkan stack).

Query pagination Zod:

```ts
z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

`offset = (page-1)*limit`.

Idempotency middleware: wajib untuk `POST /sales` dan `POST /transfers`. Header `Idempotency-Key` UUID. Hash body canonical JSON. TTL 24 jam. Unique violation race: catch dan replay.

---

## 10. Zod schemas (inti)

`src/lib/zod-helpers.ts`: `idr = z.number().int().min(0)`, `qty = z.number().positive()`, `uuid = z.string().uuid()`.

### Auth

```ts
export const registerStartBody = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20),
  password: z.string().min(8).max(128),
});

export const otpVerifyBody = z.object({
  registrationId: z.string().uuid(),
  otp: z.string().regex(/^\d{6}$/),
});

export const registerCompleteBody = z.object({
  onboardingToken: z.string().min(1),
  businessName: z.string().min(1).max(160),
  businessType: z.enum(['restaurant', 'retail', 'service']),
  country: z.string().min(1),
  province: z.string().min(1),
  city: z.string().min(1),
  plan: z.enum(['Teratur Free', 'Teratur Pro', 'free_trial', 'starter', 'growth', 'pro', 'business']),
  acceptedTerms: z.literal(true),
});

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false),
});
```

### Ingredients / products / sales (ringkas)

```ts
export const ingredientBody = z.object({
  sku: z.string().min(1).max(32),
  name: z.string().min(1).max(160),
  category: z.enum(['dairy', 'coffee_bean', 'syrup', 'packaging', 'flavor_powder', 'other']),
  uom: z.enum(['ml', 'gram', 'kg', 'pcs', 'liter', 'botol', 'karton', 'pouch', 'pack']),
  purchasePriceIdr: z.number().int().min(0),
  purchaseUnitCost: z.number().nonnegative().optional(),
  minStock: z.number().min(0),
  leadTimeDays: z.number().int().min(0).max(365).optional(),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().max(160).optional(),
});

export const productBody = z.object({
  name: z.string().min(1).max(160),
  category: z.string().min(1).max(80),
  sku: z.string().max(32).optional(),
  sellingPriceIdr: z.number().int().min(0),
  kind: z.enum(['made_to_order', 'finished_good', 'pre_order']),
  recipe: z.array(z.object({
    componentType: z.enum(['ingredient', 'product']),
    componentId: z.string().uuid(),
    qty: z.number().positive(),
  })).default([]),
});

export const saleBody = z.object({
  orderType: z.enum(['dine_in', 'takeaway', 'delivery']),
  paymentMethod: z.enum(['qris', 'cash', 'debit', 'bank_transfer']),
  discountIdr: z.number().int().min(0).default(0),
  taxIdr: z.number().int().min(0).default(0),
  customerName: z.string().max(120).optional(),
  cashierStaffId: z.string().uuid().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    qty: z.number().positive(),
    unitPriceIdr: z.number().int().min(0).optional(),
  })).min(1),
});
```

Response produk menyertakan `hppIdr`, `marginPct`, `marginGrade`, `recipe[]`.

---

## 11. REST API catalog

Base: `http://localhost:3000/api/v1`. Auth: Bearer kecuali ditandai publik. Outlet write: header `X-Outlet-Id`.

Label UI di response opsional via query `?locale=id` — v1 kembalikan enum API; FE yang mapping. Beberapa list boleh sertakan `label` untuk percepat wiring.

### 11.1 Public / health

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/healthz` | no | `{ status: "ok", ts }` di root app, bukan `/api/v1` |
| GET | `/api/v1/meta` | no | `{ timezone: "Asia/Makassar", currency: "IDR", apiVersion: "v1" }` |

### 11.2 Auth

**POST `/api/v1/auth/register`** publik, rate 5/jam/IP.

Request: `registerStartBody`.

Response 201:

```json
{
  "data": {
    "registrationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "owner@bisnis.com",
    "otpExpiresAt": "2026-09-04T10:10:00.000Z"
  },
  "requestId": "req_01J..."
}
```

**POST `/api/v1/auth/otp/verify`** → 200 `{ data: { onboardingToken, expiresIn: 900 } }`. Salah: 401 `OTP_INVALID`. Kadaluarsa: 401 `OTP_EXPIRED`.

**POST `/api/v1/auth/otp/resend`** `{ registrationId }` → 202. Cooldown: 429 `RATE_LIMITED`.

**POST `/api/v1/auth/register/complete`** → 201 login payload. 401 onboarding invalid.

**POST `/api/v1/auth/login`** → 200 login payload. 401 `INVALID_CREDENTIALS`. User pending tanpa org: 403 `ONBOARDING_REQUIRED`.

**POST `/api/v1/auth/refresh`** `{ refreshToken }` → 200 `{ accessToken, refreshToken, expiresIn }` (rotasi: revoke lama, issue baru).

**POST `/api/v1/auth/logout`** `{ refreshToken }` → 204. Auth optional.

**POST `/api/v1/auth/forgot-password`** `{ email }` → 202 selalu.

**POST `/api/v1/auth/reset-password`** `{ token, newPassword }` → 204.

**POST `/api/v1/auth/change-password`** Bearer `{ oldPassword, newPassword }` → 204. Salah old: 401.

### 11.3 Me / org / outlets / warehouses

**GET `/api/v1/me`** → user + notif + sessionsCount.

**PATCH `/api/v1/me`** `{ fullName?, jobTitle?, phone?, avatarUrl? }` email immutable v1.

**PATCH `/api/v1/me/notification-preferences`** `{ lowStock, dailyReport, newTransaction, unpaidReminder }`.

**GET `/api/v1/me/sessions`** daftar refresh belum revoke.

**DELETE `/api/v1/me/sessions/:id`**.

**POST `/api/v1/me/disable`** Owner only, body `{ confirmEmail }` → user `disabled`, revoke tokens.

**GET `/api/v1/organizations/current`**

**PATCH `/api/v1/organizations/current`** `{ name?, province?, city? }` Owner.

**GET `/api/v1/billing/subscription`**

```json
{
  "data": {
    "planCode": "pro",
    "status": "active",
    "outletLimit": 1,
    "features": {
      "transfers": true,
      "opname": true,
      "waste": true,
      "rop": true,
      "aiDailyLimit": 1000,
      "staffLimit": null,
      "nettProfitIncludesOpex": true
    }
  }
}
```

**GET `/api/v1/outlets`**  
**POST `/api/v1/outlets`** Owner; 403 jika count ≥ outletLimit.  
**GET/PATCH `/api/v1/outlets/:id`**  
Field PATCH selaras profil: `name`, `businessType`, `address`, `city`, `phone`.

**GET `/api/v1/outlets/:outletId/warehouses`**  
**POST** `{ name, code, isDefault? }`  
**PATCH `/api/v1/warehouses/:id`**

### 11.4 Suppliers

CRUD `/api/v1/suppliers`. Growth+ untuk POST penuh; Starter GET opsional kosong.

### 11.5 Ingredients

**GET `/api/v1/ingredients?search&category&page&limit`**  
Response item:

```json
{
  "id": "...",
  "sku": "BB-001",
  "name": "Fresh Milk Pasteurisasi 1L",
  "category": "dairy",
  "uom": "ml",
  "purchasePriceIdr": 19,
  "purchaseUnitCost": 18.5,
  "minStock": 10000,
  "leadTimeDays": 2,
  "supplierName": "PT Greenfield Indonesia",
  "status": "active",
  "qtyOnHand": 42000
}
```

**POST `/api/v1/ingredients`** 201  
**PATCH `/api/v1/ingredients/:id`**  
**DELETE** soft. 409 jika recipe atau movement ada dan `force` bukan Owner — tetap soft-delete + `isActive=false`, SKU tidak reused.

### 11.6 Products

**GET `/api/v1/products?search&page&limit`**  
**POST `/api/v1/products`** generate SKU jika kosong (`P-` + initials + 2 digit, retry unique).  
**GET `/api/v1/products/:id`** include recipe + hpp.  
**PATCH** replace recipe array.  
**POST `/api/v1/products/preview-hpp`** body recipe tanpa persist.  
**DELETE** soft.

`made_to_order` tanpa recipe → 400 `VALIDATION_ERROR`.

### 11.7 Inventory

**GET `/api/v1/inventory?search&itemType&warehouseId&page&limit`** butuh outlet.  
Item: sku, name, itemType, warehouseId, warehouseName, qtyOnHand, qtyAvailable, minStock, uom, status (`ok|low|critical`).

**POST `/api/v1/inventory/adjustments`** `{ itemType, itemId, direction: "in"|"out", qty, unitCost?, notes }`  
IN tanpa unitCost dan avg=0 → 400.  
OUT > available → 409 `INSUFFICIENT_STOCK`.

**GET `/api/v1/inventory/:itemType/:itemId/movements?page&limit`**

### 11.8 Transfers (Growth+)

**GET `/api/v1/transfers?status&page&limit`**  
**POST `/api/v1/transfers`** Idempotency-Key wajib.

```json
{
  "fromWarehouseId": "...",
  "toWarehouseId": "...",
  "lines": [{ "itemType": "ingredient", "itemId": "...", "qty": 15 }]
}
```

201 `{ noTransfer: "TRF/20260904/01", status: "in_transit" }`  
Create: `qtyReserved += qty` **atau** langsung `transfer_out` mengurangi on-hand (PRD: keluar di create). Implementasi: on-hand -= qty di asal, **tidak** masuk tujuan dulu. qtyReserved tidak dipakai jika sudah fisik keluar.

**POST `/api/v1/transfers/:id/receive`** → `transfer_in` tujuan, status completed.  
**POST `/api/v1/transfers/:id/cancel`** → `transfer_in` balik ke asal (bukan sale_void type; pakai `adjustment_in`? **Pakai `transfer_in` ke gudang asal** dengan ref transfer). Hanya `in_transit`.

### 11.9 Opname (Growth+)

**GET `/api/v1/opnames`**  
**POST `/api/v1/opnames`** `{ warehouseId, itemType, itemId, physicalQty, notes }`  
Server isi `systemQty` dari balance terkunci.  
**POST `/api/v1/opnames/:id/approve`**  
**POST `/api/v1/opnames/:id/reject`**

### 11.10 Waste (Growth+)

**GET `/api/v1/wastes`**  
**POST `/api/v1/wastes`** `{ warehouseId?, itemType, itemId, qty, reason, lossIdr? }`  
Default warehouse = default outlet. `lossIdr` default `round(qty * avg)`. Movement `waste_out`.

### 11.11 Sales / POS

**POST `/api/v1/sales`** Idempotency-Key wajib, `X-Outlet-Id` wajib.

201 contoh:

```json
{
  "data": {
    "id": "...",
    "noNota": "INV/20260904/001",
    "soldAt": "2026-09-04T06:25:00.000Z",
    "soldAtDisplay": "04 Sep 2026, 14:25 WITA",
    "cashier": { "staffId": null, "name": "Julian Firmansyah" },
    "orderType": "dine_in",
    "paymentMethod": "qris",
    "subtotalIdr": 115000,
    "discountIdr": 10000,
    "taxIdr": 10500,
    "totalIdr": 115500,
    "cogsIdr": 31200,
    "status": "paid",
    "items": [
      {
        "productId": "...",
        "name": "Es Kopi Susu Teratur",
        "qty": 3,
        "unitPriceIdr": 22000,
        "lineTotalIdr": 66000
      }
    ]
  }
}
```

**GET `/api/v1/sales?search&paymentMethod&orderType&status&from&to&page&limit`**  
`from`/`to` tanggal WITA `YYYY-MM-DD`.  
**GET `/api/v1/sales/:id`**  
**POST `/api/v1/sales/:id/cancel`** void + `sale_void_in`. 409 jika sudah cancelled. Kasir hanya hari WITA yang sama.

Pending: **POST `/api/v1/sales` dengan status tidak ada di body v1** — selalu `paid`. Endpoint `PATCH` pending tidak di v1 kecuali butuh; sediakan field status untuk laporan.

### 11.12 Expenses

CRUD `/api/v1/expenses`. List query `search, category, datePreset=today|yesterday|custom, from, to`.  
**GET `/api/v1/expenses/summary`** `{ todayTotalIdr, yesterdayTotalIdr, unpaidTotalIdr, todayCount }`.

Server set `totalIdr = round(qty * unitPriceIdr)` ignore client total.

### 11.13 Staff & shifts

**GET/POST `/api/v1/staff`**  
POST limit plan. Response Owner include salary; Store Manager **strip** `baseSalaryIdr`, `allowanceIdr`.  
**PATCH/DELETE `/api/v1/staff/:id`**

Aggregat list: `totalSalesHandledIdr`, `totalTrx` dari sales paid cashierStaffId (bukan kolom tersimpan).

**GET `/api/v1/shifts?page`**  
**POST `/api/v1/shifts/open`** `{ staffId, shiftName, startingCashIdr }` 409 `SHIFT_OPEN` jika ada open.  
**POST `/api/v1/shifts/:id/close`** `{ actualPhysicalCashIdr, notes }` hitung cash/qris dari sales `cashShiftId` atau window waktu. Saat create sale, attach `cashShiftId` jika ada shift open.

**GET `/api/v1/staff/roster|performance|payroll`** → 501 `{ error: { code: "NOT_IMPLEMENTED", message: "Roster/payroll Phase 2" } }`.

### 11.14 Dashboard & reports

**GET `/api/v1/dashboard?range=today|yesterday|week|month|custom&from&to&outletId`**

```json
{
  "data": {
    "kpis": {
      "omsetNetIdr": 148500000,
      "omsetGrossIdr": 150000000,
      "trxCount": 1420,
      "cogsIdr": 56430000,
      "cogsRatioPct": 38.0,
      "nettProfitIdr": 72850000,
      "nettMarginPct": 49.0,
      "criticalSkuCount": 4,
      "wasteIdr": 420000,
      "wastePct": 0.28,
      "trends": { "omsetPct": 14.2, "cogsPct": -2.1, "profitPct": 18.5 }
    },
    "chart": [{ "month": "2026-01", "omsetIdr": 95000000, "cogsIdr": 38000000, "profitIdr": 45000000 }],
    "lowStock": [{
      "id": "...", "name": "...", "currentQty": 1.8, "minStock": 5, "uom": "kg",
      "supplierName": "...", "status": "critical", "burnRatePerDay": 1.2
    }],
    "menuPerformance": [{ "name": "...", "soldCount": 384, "sellingPriceIdr": 32000, "cogsIdr": 9800, "marginPct": 69.4, "grossProfitIdr": 8524800 }],
    "recentSales": [{ "id": "...", "noNota": "...", "totalIdr": 92000, "paymentMethod": "qris", "soldAt": "..." }]
  }
}
```

Range `month` dashboard chart: 6 bulan WITA (sesuai mock Jan–Jun). Implementasi: query `daily_metrics` grouped.

**GET `/api/v1/reports/sales`** sama filter sales + meta.  
**POST `/api/v1/reports/sales/export`** `{ format: "xlsx"|"pdf" }` → 202 `{ jobId }`.  
**GET `/api/v1/reports/jobs/:jobId`** `{ status, downloadUrl? }`.

**GET `/api/v1/reports/stock?from&to&search&category&status`**  
Item sesuai PRD §6.16. Starter: field ROP `null` + feature flag. Growth+: isi rop.

### 11.15 AI stub

**POST `/api/v1/ai/chat`** `{ conversationId?, message, clientMessageId? }`  
Rule-based:

- keyword stok/reorder/kritis/bahan → query low stock
- omset/penjualan/menu/laris → dashboard today
- promo/bundle/diskon → template bundling dari top 2 menu
- else → fallback

Quota harian per org sesuai plan; 429 jika habis.

**GET `/api/v1/ai/conversations/:id`**  
**POST `/api/v1/ai/conversations/:id/reset`** soft-delete + new empty.

### 11.16 Status codes ringkas

| HTTP | Kapan |
|---|---|
| 200/201/202/204 | sukses |
| 400 | Zod / argumen |
| 401 | JWT/OTP/password |
| 403 | RBAC / `PLAN_REQUIRED` / `ONBOARDING_REQUIRED` |
| 404 | tidak ada **atau** beda tenant |
| 409 | stok, idempotency conflict, shift open, sku duplikat |
| 429 | rate / OTP resend / AI quota |
| 501 | roster/payroll/pro stubs |
| 500 | bug |

---

## 12. RBAC & plan middleware

Permission string: `sales:create`, `inventory:adjust`, `opname:approve`, … mapping tabel PRD §8.2.

```ts
authorize('sales:create')
requirePlan('growth') // min plan; trial=starter features; mapping order free_trial=0,starter=0,growth=1,pro=2,business=3
```

`free_trial` memakai flag starter. Expired subscription: read-only 403 pada POST dengan `PLAN_REQUIRED` `currentPlan` expired.

---

## 13. Timezone

`src/lib/time.ts` memakai `Asia/Makassar`.

- Simpan UTC.
- `date` expense/staff = kalender WITA.
- Filter `from=2026-09-04` → `[2026-09-03T16:00:00Z, 2026-09-04T16:00:00Z)` (WITA UTC+8).
- `soldAtDisplay` format `dd MMM yyyy, HH:mm WITA` (bukan WIB).

---

## 14. Migrations, seed, Docker

`drizzle.config.ts`: schema `./src/db/schema/index.ts`, out `./drizzle/migrations`, dialect postgresql.

Alur: ubah schema → `npm run db:generate` → review SQL → `db:migrate` di boot `server.ts` (optional env `MIGRATE_ON_BOOT`).

**Seed** `SEED_DEMO=true` only `NODE_ENV!==production`:

| | |
|---|---|
| User | Julian Firmansyah / `owner@teratur.id` / `12345678` |
| Org | Kopi Susu Teratur, Sulawesi Tengah / Palu atau Jakarta Pusat (profil mock Jakarta — **pilih Jakarta Pusat** selaras profil) |
| Outlet | Kopi Teratur Flagship, `coffee_bakery` |
| Plan | `pro` active |
| Gudang | Gudang Utama (Central) default + Chiller Utama A-1 |
| Ingredients | BB-001…BB-005 sesuai mock bahan |
| Products | Es Kopi Susu, Caramel Macchiato, croissant, dll + recipe |
| Balances | angka mock inventory |
| Sales | beberapa INV/20260802/* |
| Staff | Rian, Bayu, Salsa, … |
| Shifts | satu open |

Password seed di-hash argon2id, bukan plaintext.

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: teratur
      POSTGRES_PASSWORD: teratur
      POSTGRES_DB: teratur
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  api:
    build: .
    depends_on: [postgres]
    environment:
      DATABASE_URL: postgres://teratur:teratur@postgres:5432/teratur
      PORT: 3000
    ports: ["3000:3000"]
volumes:
  pgdata:
```

Dockerfile: `node:22-alpine`, `npm ci --omit=dev`, `USER node`, `CMD ["node","dist/server.js"]`.

---

## 15. Testing strategy

Vitest + Supertest terhadap `app` (tanpa listen). DB: Postgres testcontainer **atau** database `teratur_test` + migrate per file + transaction rollback.

Wajib:

1. Auth register→otp→complete→login.
2. Tenant leak: org B 404.
3. Sale MTO mengurangi BOM; stok kurang 409 + tidak ada sale row.
4. Double POST sale same Idempotency-Key → 1 row.
5. Transfer in_transit tidak menambah tujuan; receive menambah; cancel mengembalikan.
6. Opname pending tidak mengubah stok; approve mengubah.
7. Plan starter POST `/transfers` 403.
8. Weighted avg: 10 @ 1000 + 10 @ 2000 → avg 1500.
9. RBAC kasir tidak PATCH ingredients.
10. Dashboard rumus omset=Σ totalIdr paid.

Target coverage service stok/sales ≥ 80%.

---

## 16. Observability

- `pino` JSON. Field: `requestId`, `userId`, `organizationId`, `route`, `status`, `ms`.
- Jangan log password, OTP, token.
- Metrik in-memory/prom-client opsional v1: `http_request_duration_ms` histogram, `sales_created_total`, `stock_insufficient_total`. Expose `GET /metrics` internal only.
- Alert (ops): p95 POS > 300ms 10 menit, 5xx > 1%, error `tenant` test CI fail = blocker.
- `daily_metrics` di-update sinkron setelah sale/expense/waste (upsert) agar dashboard p95 < 500ms tanpa agregat ledger besar.

---

## 17. Security & privacy

- `helmet`, CORS allowlist, `trust proxy` jika di belakang nginx.
- Rate limit: global 100/min/IP; login 10/min/IP; register 5/h; OTP 5/h.
- SQL injection: parameterized Drizzle only; dilarang `sql.raw` dengan input user.
- Path traversal export: file hanya di `exports/{orgId}/{jobId}`.
- PII: email/phone; audit akses. Tidak ada log PII berlebih.
- Secrets di env. JWT secret beda access/refresh.
- Upload avatar v1: URL string saja (belum multipart) — kurangi attack surface.
- Ancaman: IDOR tenant (mitigasi filter org + tes), oversell stok (FOR UPDATE), brute OTP (lock), replay sale (idempotency).

---

## 18. Rollout

1. Compose postgres + migrate + seed staging.
2. FE `.env` `VITE_API_URL=https://api.staging.../api/v1`.
3. Feature: auth dulu, master, POS, laporan.
4. Flag `SEED_DEMO` off di prod.
5. Rollback: migrasi hanya additive v1; jika gagal, revert image API (schema compatible). Jangan destructive drop di v1.

Tidak ada payment; plan di-set seed/register.

---

## 19. Alternatives considered

### Nest vs Express

| | Nest | Express (dipilih) |
|---|---|---|
| Struktur | Opiniated, DI | Manual folder modules |
| Bundle | Lebih berat | Sesuai stack wajib PRD |
| Learning | Decorator | Eksplisit middleware |

Wajib Express; Nest ditolak.

### Prisma vs Drizzle

| | Prisma | Drizzle (dipilih) |
|---|---|---|
| SQL | Abstraksi | Dekat SQL, mudah `FOR UPDATE` |
| Bundle | Heavy client | Ringan |
| Migrasi | Prisma migrate | drizzle-kit |

`FOR UPDATE` stok lebih jelas di Drizzle.

### Session cookie vs JWT

| | Session | JWT access + refresh opaque (dipilih) |
|---|---|---|
| FE kini | Butuh cookie + CSRF | Sudah Bearer localStorage |
| Revoke | Mudah | Refresh di DB, access pendek |

Session murni lebih aman vs XSS, tetapi FE sudah Bearer. Phase 2 bisa httpOnly cookie tanpa pecah resource model.

### Ledger only vs mutable on-hand only

Hanya ledger → SUM berat untuk POS. Hanya on-hand → tidak ada audit HPP. **Hybrid** dipilih.

### WAC vs last purchase HPP

Last purchase lebih mudah, HPP melonjak. WAC dipilih (PRD). FIFO batch = Pro.

---

## 20. Risks

| ID | Severity | Risiko | Mitigasi |
|---|---|---|---|
| R1 | High | Tenant leak | Tes isolasi CI, 404 cross-org, code review repo args |
| R2 | High | Oversell stok kasir paralel | `FOR UPDATE`, tes race |
| R3 | Med | FE masih `/api` tanpa v1 | Dokumentasikan env; 404 jelas |
| R4 | Med | Numeric JSON precision | 4 desimal; tes round-trip |
| R5 | Med | Dashboard lambat | `daily_metrics` upsert |
| R6 | Low | OTP email gagal | Dev stdout; retry SMTP |
| R7 | Med | Plan UI tidak selaras | Canonical PRD; register mapping |
| R8 | Low | 501 roster mengecewakan UI | Response terstruktur; FE tetap mock tab |

---

## 21. Key Decisions

1. **Stack Express+TS+PG+Drizzle+Zod** — mandat produk; Nest/Prisma ditolak.
2. **Prefix `/api/v1`**; FE set `VITE_API_URL=http://localhost:3000/api/v1` — versioning tanpa memecah client lama (belum production).
3. **Access JWT 15m + refresh opaque di DB** — selaras `Authorization: Bearer` di `frontend/src/api/client.ts`; remember 30 hari = TTL refresh.
4. **argon2id** — standar modern vs bcrypt.
5. **Money totals `bigint` rupiah; qty & unit cost `numeric(14,4)`** — menjawab PRD Q6; HPP 18.5/ml tetap akurat, struk tetap integer.
6. **HPP = weighted average cost di `inventory_balances.avg_unit_cost`**, bukan last purchase — stabil vs lonjakan belanja.
7. **Ledger append-only + snapshot on-hand**; tidak ada stok negatif; POS atomic BOM explosion.
8. **`made_to_order` meledakkan bahan; `finished_good` hanya OUT produk** — PRD Q3.
9. **Setiap baris tenant `organization_id`; 404 cross-tenant** — cegah enumerasi.
10. **Timezone simpan UTC, bisnis hari WITA `Asia/Makassar`** — `frontend/src/utils/constants.ts`; label WIB di mock diabaikan.
11. **Plan canonical `free_trial|starter|growth|pro|business`** — landing `Price` menang vs register/profil.
12. **Idempotency-Key wajib POST sales & transfers** — kasir retry aman.
13. **Error envelope seragam + requestId** — FE/observability.
14. **Chat AI v1 rule-based stub, kontrak tetap** — bukan LLM.
15. **`daily_metrics` denormalized** — dashboard p95 < 500ms.
16. **npm + Node 22** — selaras ekosistem frontend lockfile style, LTS.
17. **Tidak RLS v1** — filter aplikasi + tes; RLS later.
18. **Export async job** — jangan blokir event loop POS.
19. **Pajak = `taxIdr` input kasir** — PRD Q1.
20. **Harga jual org-level v1** — PRD Q2.

---

## 22. Open Questions

1. Refresh token: localStorage vs cookie httpOnly (butuh kerja FE).
2. Apakah `purchasePriceIdr` integer di form bahan cukup, atau FE harus kirim `purchaseUnitCost` 18.5? **Rekomendasi API menerima keduanya; jika hanya integer + uom ml, HPP kasar.**
3. Multi-org per user? v1 satu membership; abaikan.
4. Nomor nota restart per hari vs per bulan? **Per hari WITA** `INV/YYYYMMDD/NNN`.
5. Apakah void mengembalikan avg cost dengan snapshot movement original (ya — `sale_void_in.unitCost = original sale_out.unitCost`, WAC formula IN).
6. Avatar upload binary kapan?
7. `GET /metrics` publik internal network only — auth?

---

## 23. References

- PRD: `backend/PRD.md`
- `frontend/src/api/client.ts`
- `frontend/src/utils/constants.ts` (`Asia/Makassar`, API URL)
- `frontend/src/pages/auth/LoginPage.tsx` / `RegisterPage.tsx`
- `frontend/src/components/shared/MasterDataMenu/bahan-baku/index.tsx`
- `frontend/src/components/shared/MasterDataMenu/produk/produk/index.tsx`
- `frontend/src/components/shared/MasterDataMenu/inventory/index.tsx`
- `frontend/src/pages/inventory/ManajemenPersediaanPage.tsx`
- `frontend/src/pages/pengeluaran/PengeluaranContent.tsx`
- `frontend/src/pages/karyawan/KaryawanPage.tsx`
- `frontend/src/pages/reports/LaporanTransaksiPage.tsx`
- `frontend/src/pages/reports/LaporanStokPage.tsx`
- `frontend/src/components/shared/DashboardStatistik/default/index.tsx`
- `frontend/src/pages/chat-ai/index.tsx`
- `frontend/src/pages/profile/index.tsx`
- `frontend/src/components/shared/Price/default/index.tsx`
- `frontend/src/pages/help-center/index.tsx` (ROP)

---

## PR Plan

Setiap PR independen reviewable; migrasi additive; tes ikut PR yang menambah perilaku.

### PR-01 — Scaffold runtime & health

- **Title:** `chore: scaffold Express+TS, config Zod, healthz, docker compose postgres`
- **Files:** `package.json`, `tsconfig.json`, `src/server.ts`, `src/app.ts`, `src/config/env.ts`, `src/lib/logger.ts`, `src/middleware/requestId.ts`, `src/middleware/errorHandler.ts`, `docker-compose.yml`, `Dockerfile`, `.env.example`
- **Deps:** —
- **Desc:** App boot, helmet/cors/pino, envelope error kosong, `GET /healthz`, `GET /api/v1/meta`. Belum ada DB.

### PR-02 — Drizzle schema & migrasi awal

- **Title:** `feat(db): initial PostgreSQL schema via Drizzle`
- **Files:** `src/db/schema/*`, `drizzle.config.ts`, `drizzle/migrations/0000_init.sql`, `src/db/client.ts`
- **Deps:** PR-01
- **Desc:** Semua tabel §6, enums, index, FK. Belum seed bisnis (boleh smoke migrate).

### PR-03 — Auth, OTP, JWT, seed demo owner

- **Title:** `feat(auth): register OTP, login refresh, demo seed`
- **Files:** `src/modules/auth/*`, `src/lib/jwt.ts`, `src/lib/password.ts`, `src/lib/otp.ts`, `src/middleware/authenticate.ts`, `src/db/seed.ts`, `tests/auth.test.ts`
- **Deps:** PR-02
- **Desc:** Endpoint auth §11.2, argon2id, remember 30d, seed `owner@teratur.id`.

### PR-04 — Org, outlet, warehouse, me, billing flags

- **Title:** `feat(tenancy): organizations, outlets, profile, entitlements`
- **Files:** `src/modules/me`, `organizations`, `outlets`, `warehouses`, `billing`, `src/middleware/authorize.ts`, `requirePlan.ts`, `requireOutlet.ts`, `tests/tenant-isolation.test.ts`
- **Deps:** PR-03
- **Desc:** CRUD outlet sesuai limit plan, profil/notif, GET subscription features.

### PR-05 — Catalog: suppliers, ingredients, products+BOM, HPP preview

- **Title:** `feat(catalog): ingredients, products, recipes, HPP`
- **Files:** `src/modules/suppliers`, `ingredients`, `products`, `src/lib/sku.ts`
- **Deps:** PR-04
- **Desc:** Master data UI bahan/produk; hitung margin grade; unique SKU per org.

### PR-06 — Inventory balances, ledger, adjustments

- **Title:** `feat(inventory): balances, movements, adjustments`
- **Files:** `src/modules/inventory/*`, `src/lib/money.ts`, tes WAC
- **Deps:** PR-05
- **Desc:** List stok, MASUK/KELUAR, riwayat, CHECK non-negatif, FOR UPDATE.

### PR-07 — POS sales + recipe explosion + idempotency

- **Title:** `feat(pos): create/list/cancel sales with stock explosion`
- **Files:** `src/modules/sales/*`, `src/middleware/idempotency.ts`, `src/lib/documentNo.ts`, `tests/sales-stock.test.ts`
- **Deps:** PR-06
- **Desc:** POS p95 path; attach shift jika ada; upsert `daily_metrics`; cancel void stok.

### PR-08 — Expenses + dashboard KPI

- **Title:** `feat(analytics): expenses and dashboard KPIs`
- **Files:** `src/modules/expenses/*`, `src/modules/dashboard/*`, `src/jobs/dailyMetrics.ts`
- **Deps:** PR-07
- **Desc:** CRUD pengeluaran, summary, dashboard sesuai rumus PRD §10.

### PR-09 — Growth ops: transfers, opname, waste

- **Title:** `feat(stock-ops): transfers, opname, waste`
- **Files:** `src/modules/transfers`, `opnames`, `wastes`
- **Deps:** PR-06 (bisa paralel PR-07 setelah PR-06; merge setelah PR-06)
- **Desc:** Gating `requirePlan('growth')`; idempotency transfer; approve opname.

### PR-10 — Staff & cash shifts

- **Title:** `feat(staff): directory and cash drawer shifts`
- **Files:** `src/modules/staff`, `shifts`
- **Deps:** PR-07 (sales attach shift)
- **Desc:** CRUD staf, hide gaji manager, open/close shift, 501 roster/payroll.

### PR-11 — Reports export + stock ROP

- **Title:** `feat(reports): sales/stock reports and async export`
- **Files:** `src/modules/reports/*`, `src/jobs/exportWorker.ts`
- **Deps:** PR-08, PR-09 (ROP butuh movements)
- **Desc:** Filter laporan, xlsx/pdf job, ROP Growth+.

### PR-12 — AI stub + hardening tests

- **Title:** `feat(ai): rule-based chat stub; security rate limits`
- **Files:** `src/modules/ai/*`, `src/middleware/rateLimit.ts`, tes quota
- **Deps:** PR-08
- **Desc:** Kontrak chat, keyword ke data nyata, limit plan.

Urutan merge disarankan: 01→02→03→04→05→06→07→08, dengan 09 setelah 06, 10 setelah 07, 11 setelah 08+09, 12 setelah 08.

---

*Dokumen ini merujuk PRD `backend/PRD.md` sebagai sumber kebenaran produk. Perubahan rumus KPI atau enum harus update kedua dokumen.*
