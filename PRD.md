# Product Requirements Document — TERATUR Backend

| Field | Value |
|---|---|
| **Judul** | TERATUR Backend — Product Requirements Document (v1) |
| **Produk** | TERATUR (`teratur.id`) |
| **Dokumen** | PRD Backend (bukan implementasi frontend) |
| **Penulis** | Backend Product / Engineering |
| **Tanggal** | 2026-09-04 |
| **Status** | Draft |
| **Audiens** | Engineer backend, tech lead, QA |
| **Sumber kebenaran UI** | `frontend/` (mock-only; belum terhubung API) |

---

## 1. Overview

TERATUR adalah SaaS web operations-management untuk usaha F&B (coffee shop, bakery, restoran, katering, retail makanan) di Indonesia. Visi produk: memberi owner kendali penuh atas penjualan, persediaan, resep/HPP, pengeluaran, staf, dan laporan lintas cabang.

Frontend (`frontend/`) sudah dibangun dengan React 19 + Vite + Ant Design + Zustand + TanStack Query + Axios, tetapi **seluruh data masih mock**. Backend greenfield ini harus menyediakan kontrak API yang cukup agar setiap layar operasional di dashboard dapat diganti dari mock ke data nyata **tanpa menebak field, enum, atau rumus KPI**.

Dokumen ini mendefinisikan **apa yang harus disediakan backend v1**: tenancy, auth, master data, stok, POS, pengeluaran, karyawan (inti), laporan, entitlement paket, dan stub Chat AI. Implementasi teknis ada di `backend/DESIGN.md`.

---

## 2. Vision, Problem, Personas

### 2.1 Vision

Owner F&B Indonesia dapat memantau omset lintas cabang, HPP resep, ROP bahan, waste, kas laci, dan laba bersih dalam satu sistem, dengan timezone operasional `Asia/Makassar` dan uang IDR.

### 2.2 Problem

Usaha F&B kecil–menengah mencatat penjualan, stok, dan resep di spreadsheet/WhatsApp. Akibatnya:

- HPP menu tidak akurat (harga beli bahan berubah, resep tidak meledak ke stok).
- Stok menipis diketahui setelah habis; ROP tidak dihitung.
- Waste dan selisih opname tidak tercatat, laba terlihat sehat padahal bocor.
- Multi-outlet tidak bisa dikonsolidasi.
- Kasir double-submit nota saat jaringan putus-nyambung.

### 2.3 Personas

| Persona | Contoh UI | Kebutuhan backend |
|---|---|---|
| **Owner** | Login “Portal Pemilik Bisnis”, demo `owner@teratur.id` (`frontend/src/pages/auth/LoginPage.tsx`) | Akses penuh org, semua outlet, billing, laporan, AI |
| **Store Manager** | Role staf `Store Manager` (`frontend/src/pages/karyawan/KaryawanPage.tsx`) | Operasi 1+ outlet: stok, opname, shift, laporan outlet |
| **Kasir** | Field `kasir` di transaksi (`frontend/src/pages/reports/LaporanTransaksiPage.tsx`) | POS, tutup shift kas, tidak boleh ubah resep/harga master |
| **Head Barista / Barista / Kitchen / Helper** | Enum `StaffRole` di halaman karyawan | Lihat stok/menu; catat waste terbatas; tidak akses payroll/billing |

---

## 3. Background & Current State

- Folder `backend/` kosong (greenfield).
- API client frontend: `frontend/src/api/client.ts`
  - Base URL: `import.meta.env.VITE_API_URL \|\| 'http://localhost:3000/api'` (`frontend/src/utils/constants.ts`)
  - Header `Authorization: Bearer <token>` dari `localStorage.auth_token`
  - HTTP 401 menghapus token dan redirect ke `/login` (catatan: rute login sebenarnya `/auth/login` di `frontend/src/router/routes.ts` — inkonsistensi frontend, **bukan** tanggung jawab backend)
- Timezone konstan: `Asia/Makassar`
- App name: `Teratur.id`
- Tidak ada halaman kasir POS terpisah di router, tetapi FAQ, dashboard, dan laporan transaksi mengasumsikan POS ada (`frontend/src/pages/help-center/index.tsx` FAQ “Kasir POS”). Backend **wajib** menyediakan API penjualan.
- Chat AI mock di `frontend/src/pages/chat-ai/index.tsx`.

### 3.1 Inkonsistensi UI yang direkonsiliasi (sumber kebenaran backend)

| Topik | Tempat di UI | Keputusan PRD |
|---|---|---|
| **Paket** | Landing `Price`: Starter / Growth / Pro / Business (`frontend/src/components/shared/Price/default/index.tsx`). Register: “Teratur Pro / Teratur Free”. Profil: Starter / Pro / Enterprise. `PricingSection`: Starter 149k, Pro 299k, Enterprise | **Canonical:** `free_trial`, `starter`, `growth`, `pro`, `business`. Register “Teratur Free” = trial 14 hari dengan entitlement Starter. “Teratur Pro” = plan `pro`. Profil “Enterprise” dipetakan ke `business`. Harga landing `Price` menang. |
| **Timezone** | `CONSTANTS.TIMEZONE = Asia/Makassar`; laporan menampilkan “WIB” | **Canonical:** `Asia/Makassar` (WITA, UTC+8). Semua timestamp disimpan UTC, dikonversi ke WITA di response display. Label “WIB” di mock dianggap salah. |
| **Harga resep** | Master bahan `hargaBeli` 18500/L; form produk memakai 18.5/ml | **Canonical:** harga beli disimpan per satuan dasar bahan; HPP = Σ (qty resep × unit cost rata-rata). |
| **Status stok** | Inventory: Aman / Menipis / Kritis Habis. Laporan stok menambah Overstock. Bahan baku: Aktif / Hampir Habis / Habis | Lihat aturan di §8. |

---

## 4. Goals & Non-Goals

### 4.1 Goals backend v1 (MVP → Growth)

1. Auth owner: register 3 langkah, login, remember 30 hari, forgot password, ganti password, OTP email 6 digit.
2. Multi-tenant: `organization` + `outlet` + `warehouse`; isolasi data ketat.
3. Master bahan baku, produk+resep, supplier, inventory on-hand + adjustment.
4. Operasi persediaan Growth: transfer antar gudang, stock opname (pending → approved), waste log.
5. POS: buat penjualan, batal, ledger stok dari ledakan resep, idempotensi.
6. Pengeluaran CRUD + status bayar.
7. Karyawan CRUD + tutup shift kas (cash drawer).
8. Dashboard KPI + laporan transaksi/stok + export xlsx/pdf (async job).
9. Gating paket (Starter vs Growth vs Pro vs Business).
10. Stub Chat AI dengan kontrak tetap (boleh rule-based di v1).
11. Seed demo: `owner@teratur.id` / `12345678` (bukan kredensial produksi).

### 4.2 Non-goals v1 (fase kemudian)

| Item | Fase |
|---|---|
| LLM production-grade / RAG penuh | Phase 2 (Pro) |
| Batch costing, purchasing PO, workflow produksi | Pro |
| Arus kas lengkap, approval multi-level | Pro |
| Multi-outlet konsolidasi 3–20 + API publik | Business |
| Roster mingguan, rating staf, payroll slip (UI tab ada, data mock) | Phase 2 |
| Hardware kasir, printer ESC/POS cloud, QRIS dinamis PSP | Phase 2 |
| Offline-first sync / CRDT | Phase 2 |
| Marketplace / multi-channel GoFood dll. | Out of scope |
| Akuntansi pajak resmi (e-Faktur, PPh) | Out of scope |
| Implementasi frontend | Out of scope |

---

## 5. Tenancy Model (product requirement)

```
Organization (bisnis)
  ├── Subscription (1 aktif)
  ├── Members (user + role org)
  ├── Outlets (cabang)
  │     ├── Warehouses (gudang/lokasi stok)
  │     ├── Staff assignments
  │     └── Sales, expenses, shifts
  └── Master data org-wide: bahan, produk, resep, supplier
```

Aturan:

1. Setiap baris milik tenant punya `organizationId`. Tidak ada query tanpa filter org.
2. Stok, penjualan, shift, pengeluaran **outlet-scoped** (`outletId`) kecuali master bahan/produk yang **org-scoped** (resep sama, harga jual boleh override per outlet di fase Pro; v1 harga jual di produk org).
3. Owner melihat semua outlet org. Store Manager terikat 1+ outlet. Kasir terikat 1 outlet aktif (header `X-Outlet-Id` atau `outletId` di token).
4. Plan `starter`/`growth`/`pro`: default **1 outlet**. Plan `business`: 3–20 outlet.
5. Transfer stok boleh lintas gudang dalam org (antar outlet).

Header operasional:

- `Authorization: Bearer <accessToken>`
- `X-Outlet-Id: <uuid>` wajib untuk endpoint operasional POS/stok/kas. Owner tanpa header → agregat org (dashboard) atau 400 pada write outlet-scoped.

---

## 6. Functional Requirements

Konvensi user story: **Owner** kecuali disebut lain. Acceptance: harus teruji API (supertest), bukan UI.

### 6.1 Auth & onboarding

**US-AUTH-01 — Register langkah 1 (akun)**  
Sebagai calon owner, saya mengirim nama lengkap, email, telepon, password agar akun pending dibuat.

Acceptance:

- Field: `fullName`, `email`, `phone`, `password` (min 8).
- Kekuatan password dihitung di klien (`RegisterPage`); backend menolak jika `< 8`, dan **menyarankan** (tidak wajib v1) huruf besar+kecil+angka. Karakter khusus tidak wajib server-side.
- Email unik global. Telepon disimpan E.164 longgar (`08…` dinormalisasi ke `+62…`).
- Response: `registrationId`, `email`, `otpExpiresAt` (OTP tidak dikembalikan di production).
- Email OTP 6 digit, TTL 10 menit, max 5 kali salah → lock 15 menit; resend cooldown 60 detik.

**US-AUTH-02 — Verifikasi OTP**  
Kode 6 digit (`Step2OTP`).

Acceptance:

- `POST /auth/otp/verify` { `registrationId`, `otp` }.
- Sukses → status user `email_verified`, token sementara `onboardingToken` (15 menit) untuk langkah 3.
- Resend: `POST /auth/otp/resend`.

**US-AUTH-03 — Lengkapi bisnis (langkah 3)**  
Field dari `Step3Business`: nama bisnis, tipe (`restaurant` \| `retail` \| `service`), negara, provinsi, kota, plan, T&C.

Acceptance:

- T&C `acceptedTerms: true` wajib.
- Membuat `organization`, outlet pertama (nama = nama bisnis), gudang default “Gudang Utama”, membership `owner`, subscription sesuai plan.
- Mapping plan UI → enum: `Teratur Free` → `free_trial` (14 hari, entitlement starter); `Teratur Pro` → `pro`. API juga menerima `starter` \| `growth` \| `pro` \| `business` langsung.
- Response: `accessToken`, `refreshToken`, `user`, `organization`, `outlet`.

**US-AUTH-04 — Login owner**  
Email + password. Remember me 30 hari.

Acceptance:

- Salah kredensial: `401 INVALID_CREDENTIALS` (pesan generik, tidak bocorkan apakah email ada).
- `rememberMe: true` → refresh TTL 30 hari; `false` → 12 jam.
- Demo seed hanya di environment non-prod.

**US-AUTH-05 — Forgot / reset password**  
Link UI `/forgot-password` (halaman belum ada; API tetap wajib).

Acceptance:

- `POST /auth/forgot-password` selalu 202 (anti enumeration).
- Email berisi token TTL 1 jam, sekali pakai.
- `POST /auth/reset-password` { `token`, `newPassword` } revoke semua refresh token.

**US-AUTH-06 — Ganti password (login)**  
Profil modal (`oldPassword`, `newPassword` min 8).

**US-AUTH-07 — Logout**  
Revoke refresh token yang dipakai. Access token tetap valid sampai expiry pendek (15 menit) — diterima.

### 6.2 Profil, notifikasi, sesi

Sumber: `frontend/src/pages/profile/index.tsx`.

**US-PRF-01** GET/PATCH profil user: `fullName`, `jobTitle` (jabatan display), `email` (ubah email → re-verify, v1: email immutable kecuali Owner support), `phone`, `avatarUrl`.

**US-PRF-02** GET/PATCH organisasi/outlet default: `outletName`, `businessType` (lebih kaya dari register: Coffee Shop & Bakery, Restoran, Warung Makan, Toko Retail, Katering, Manufaktur Makanan), `address`, `city`, `outletPhone`. `joinedAt` read-only. `plan` read-only dari subscription.

**US-PRF-03** Preferensi notifikasi boolean: `lowStock`, `dailyReport`, `newTransaction`, `unpaidReminder` (UI: stokMenurun, laporanHarian, transaksiMasuk, pengingat).

**US-PRF-04** Daftar sesi aktif (refresh tokens): `userAgent`, `ip`, `lastUsedAt`, `isCurrent`. v1 tidak wajib geo “Jakarta”.

**US-PRF-05** Nonaktifkan akun (zona berbahaya): soft-disable user owner **tidak** menghapus org di v1; status `disabled`. Hard delete out of scope.

### 6.3 Outlet & gudang

**US-OUT-01** CRUD outlet (Owner). Limit sesuai plan.

**US-OUT-02** CRUD warehouse per outlet: `name` (contoh UI: “Chiller Utama A-1”, “Gudang Utama (Central)”), `code`, `isDefault`.

**US-OUT-03** Switch outlet: daftar outlet yang user boleh akses.

### 6.4 Supplier

UI menampilkan `pemasok` sebagai string di bahan/pengeluaran. Backend v1: entitas `suppliers` + field teks fallback.

**US-SUP-01** CRUD supplier: `name`, `phone?`, `email?`, `notes?`, `isActive`.

Plan: Starter boleh pakai string `supplierName` saja; Growth+ CRUD supplier penuh.

### 6.5 Master bahan baku

Sumber: `frontend/src/components/shared/MasterDataMenu/bahan-baku/index.tsx`.

**US-ING-01** List + search SKU/nama + filter kategori.

**US-ING-02** Create/update:

| Field UI | API |
|---|---|
| sku | `sku` unique per org |
| nama | `name` |
| kategori | `category` enum |
| satuan | `uom` |
| hargaBeli | `purchasePriceIdr` (integer rupiah per **purchase UOM**; lihat DESIGN untuk UOM dasar) |
| stokMinimal | `minStock` (numeric) |
| pemasok | `supplierId` atau `supplierName` |
| status | computed, tidak diinput create |

Kategori enum:

- `dairy` → “Susu & Olahan”
- `coffee_bean` → “Biji Kopi”
- `syrup` → “Sirup & Pemanis”
- `packaging` → “Kemasan”
- `flavor_powder` → “Bubuk Flavor”
- `other` → “Lain-lain” (API; UI v1 belum ada opsi tapi laporan stok punya “Bahan Tambahan”)

UOM: `ml`, `gram`, `kg`, `pcs` (form). Juga `liter`, `botol`, `karton`, `pouch`, `pack` untuk kompatibilitas laporan mock.

**US-ING-03** Soft delete. Dilarang hard-delete jika dipakai resep atau punya mutasi.

**US-ING-04** Status computed dari stok agregat org atau outlet aktif:

- `out_of_stock` / UI “Habis”: on-hand ≤ 0
- `low` / “Hampir Habis”: 0 < on-hand ≤ minStock
- `active` / “Aktif”: on-hand > minStock

### 6.6 Master produk & resep (BOM)

Sumber: `frontend/src/components/shared/MasterDataMenu/produk/produk/index.tsx`.

**US-PRD-01** Create/update produk:

- `name`, `category` (teks bebas v1, contoh “Coffee Shop”), `sku`, `sellingPriceIdr`, `kind`
- `kind` UI: “Diracik saat order” → `made_to_order`; “Stok jadi (ready stock)” → `finished_good`; “Pre-order” → `pre_order`

**US-PRD-02** Generate SKU: inisial nama (maks 5 huruf) + 2 digit acak, prefix `P-`. Client bisa kirim `sku` sendiri; server generate jika kosong. Unique per org.

**US-PRD-03** Recipe lines: `ingredientId` (atau finished good SKU seperti `FG-CRO`), `qty` per 1 porsi. Minimal 0 line untuk `finished_good` yang dibeli jadi; `made_to_order` wajib ≥ 1 line.

**US-PRD-04** Live HPP & margin (server hitung, client boleh preview):

```
hpp = Σ (line.qty × unitCostAvg)
grossProfit = sellingPrice − hpp
marginPct = sellingPrice > 0 ? grossProfit / sellingPrice × 100 : 0
```

Label:

- ≥ 40% → `healthy` “Margin Sehat”
- ≥ 20% → `thin` “Margin Tipis”
- ≥ 0% → `low` “Margin Rendah”
- < 0% → `loss` “Rugi”

**US-PRD-05** List produk + HPP + margin untuk tabel/dashboard.

### 6.7 Inventory on-hand & adjustment

Sumber: `frontend/src/components/shared/MasterDataMenu/inventory/index.tsx`.

**US-INV-01** List posisi stok: sku, nama, tipe (`ingredient` \| `finished_good`), lokasi gudang, `qtyOnHand` (stokFisik), `qtyAvailable` (stokTersedia = on-hand − reserved; v1 reserved=0 kecuali transfer in-transit), `minStock`, `uom`, `status`.

Status:

- `ok` Aman: available > minStock
- `low` Menipis: 0 < available ≤ minStock
- `critical` Kritis/Habis: available ≤ 0

**US-INV-02** Adjustment `IN` (MASUK) / `OUT` (KELUAR) dengan `qty`, `notes`, `unitCostIdr` wajib untuk IN jika belum ada avg cost.

**US-INV-03** Riwayat mutasi per SKU (append-only ledger).

Aturan stok:

- Tidak boleh `qtyAvailable` negatif untuk penjualan Starter (fail closed). Owner boleh override adjustment OUT sampai 0 (tidak negatif) seperti mock `Math.max(0, …)` — **keputusan: ledger tidak boleh negatif**; adjustment OUT yang melebihi on-hand → `409 INSUFFICIENT_STOCK`.
- Setiap perubahan stok = 1+ baris `stock_movements` dalam transaksi DB yang sama dengan update balance.

### 6.8 Transfer antar gudang

Sumber: `frontend/src/pages/inventory/ManajemenPersediaanPage.tsx`.

**US-TRF-01** Buat transfer: gudang asal ≠ tujuan, item, qty, satuan. Status awal `in_transit` (“Dalam Pengiriman”). `noTransfer` format `TRF/YYYYMMDD/NN` (timezone org).

**US-TRF-02** Receive → `completed` (“Selesai”): stok tujuan bertambah, asal sudah berkurang saat create (atau saat receive — **keputusan: reserve/keluar di create, masuk di receive**; cancel mengembalikan stok asal).

**US-TRF-03** Cancel `in_transit` → `cancelled`; stok asal dikembalikan.

**US-TRF-04** Idempotency-Key wajib di POST.

Plan: Growth+.

### 6.9 Stock opname

**US-SOP-01** Create baris opname: sku, `systemQty` (snapshot server, bukan trust client), `physicalQty`, `notes`. `variance = physical − system`. Status `pending_review`.

**US-SOP-02** Approve (Owner/Store Manager) → `approved` dan adjustment ledger `OPNAME` sebesar variance.

**US-SOP-03** Reject → `rejected`, tidak mengubah stok.

Plan: Growth+.

### 6.10 Waste

**US-WST-01** Catat waste: item, qty, alasan, `lossIdr` (boleh dihitung server = qty × avgCost, client boleh override). Petugas = user login.

Alasan: `expired` Kadaluwarsa; `damaged` Rusak/Pecah; `trial_fail` Hasil Trial/Gagal; `lost` Hilang.

Efek: stok berkurang, COGS/waste terpisah dari HPP penjualan. Dashboard “Food Waste”.

Plan: Growth+.

### 6.11 POS / penjualan

Sumber field: `frontend/src/pages/reports/LaporanTransaksiPage.tsx`, dashboard recent trx.

**US-POS-01** Create sale (kasir):

- `orderType`: `dine_in` \| `takeaway` \| `delivery`
- `paymentMethod`: `qris` \| `cash` \| `debit` \| `bank_transfer`
- `items[]`: `productId`, `qty`, `unitPriceIdr` (default harga master; kasir boleh override jika izin)
- `discountIdr`, `taxIdr` (pajak v1 = input kasir/nominal, bukan engine PPN penuh)
- `customerName?`
- `Idempotency-Key` wajib

Perhitungan:

```
subtotal = Σ (qty × unitPrice)
total = subtotal − discount + tax
```

Validasi: `total >= 0`, discount ≤ subtotal.

Status: `paid` Lunas (v1 semua create langsung lunas — QRIS “konfirmasi lunas” manual sesuai FAQ). `pending` disiapkan untuk pembayaran nanti. `cancelled` / `void`.

**US-POS-02** Ledakan resep (atomic):

- `made_to_order`: tiap line resep × qty terjual → movement `SALE` OUT di gudang default outlet.
- `finished_good`: OUT produk jadi (bukan bahan), kecuali resep juga diisi (opsional double — **keputusan: finished_good hanya OUT SKU produk**; bahan tidak diledakkan).
- `pre_order`: tidak potong stok sampai status `paid` dan flag `fulfill` (v1: sama seperti made_to_order jika resep ada).

Jika stok tidak cukup → seluruh sale rollback, `409 INSUFFICIENT_STOCK` + daftar SKU kurang.

**US-POS-03** Void/cancel dalam shift yang sama (Owner/Manager/Kasir dengan izin): stok dikembalikan movement `SALE_VOID`. Tidak boleh void setelah D+1 tanpa Owner.

**US-POS-04** `noNota` format `INV/YYYYMMDD/NNN` per outlet.

**US-POS-05** List + filter: search nota, metode, tipe, kasir, rentang tanggal (WITA), status. Pagination `page`, `limit`, `total`.

### 6.12 Pengeluaran

Sumber: `frontend/src/pages/pengeluaran/PengeluaranContent.tsx`.

**US-EXP-01** CRUD:

- tanggal, namaBarang, kategori, jumlah, satuan, hargaSatuan, total (server = qty × unitPrice), pemasok, metode bayar, status, catatan

Kategori:

- `raw_material` Bahan Baku
- `packaging` Kemasan & Packaging
- `operational` Biaya Operasional
- `salary` Gaji & Upah
- `utilities` Utilitas (Listrik/Air/Gas)
- `equipment` Peralatan & Inventaris
- `transport` Transportasi & Logistik
- `other` Lain-lain

Status: `paid` Lunas, `unpaid` Belum Bayar, `credit` Kredit.

Metode: sama dengan POS.

**US-EXP-02** KPI list: total hari ini, kemarin, belum bayar, jumlah trx hari ini (WITA).

**US-EXP-03** Pengeluaran kategori `raw_material`/`packaging` **tidak otomatis** menambah stok di v1 (hindari double dengan adjustment). Flag opsional `alsoReceiveStock` di Growth+ (default false).

### 6.13 Karyawan & shift kas

Sumber: `frontend/src/pages/karyawan/KaryawanPage.tsx`.

**US-STF-01** CRUD staff:

- name, role, phone, email, employment (`full_time` \| `part_time` \| `contract`), joinedDate, baseSalaryIdr, allowanceIdr, currentShift label
- Role: `store_manager`, `head_barista`, `barista`, `cashier`, `cook`, `helper`
- Aggregat `totalSalesHandled`, `totalTrx`, `ratingScore`: v1 sales/trx dihitung dari sales; rating default 5.0 (tidak diedit kasir)

**US-STF-02** Staff boleh punya user login opsional (invite email Phase 2). v1: record karyawan tanpa akun, kasir demo memakai user owner.

**US-STF-03** Buka shift: `startingCashIdr`, `shiftName` `morning` \| `evening` (UI Shift Pagi 07:00–15:00 / Malam 15:00–23:00), cashier staffId. Status `open`. Satu shift open per outlet.

**US-STF-04** Tutup shift: `actualPhysicalCashIdr`, notes.

```
expectedCash = startingCash + cashSales (sale paid, method cash, dalam window shift)
difference = actualPhysical − expectedCash
status = difference == 0 ? balanced : variance
```

`qrisSales` dihitung dari sale method qris (informasional, tidak masuk expected cash).

**US-STF-05** Roster, performance, payroll: **baca-only stub** atau 501 `NOT_IMPLEMENTED` dengan message jelas — **non-goal v1** selain field gaji di master staf (untuk estimasi payroll = Σ base+allowance seperti mock).

### 6.14 Dashboard KPI

Sumber: `frontend/src/components/shared/DashboardStatistik/default/index.tsx`.

Query: `range=today|yesterday|week|month|custom` + `from`/`to` WITA, `outletId?`.

KPI wajib: omset, COGS, nett profit, stok kritis & waste, chart bulanan omset/HPP/profit, low stock + burn rate, menu terlaris vs margin, transaksi terkini.

Rumus: §10.

### 6.15 Laporan transaksi

Filter + detail line items + export xlsx/pdf. Sumber `LaporanTransaksiPage.tsx`.

### 6.16 Laporan stok & ROP

Sumber `LaporanStokPage.tsx` + FAQ help-center.

Per SKU per periode:

- stokAwal, masuk, keluar, stokAkhir
- biayaPerSatuan (avg cost), totalNilai = stokAkhir × avg
- status: Aman / Menipis / Kritis / Overstock
- `leadTimeDays` (default 3, field di ingredient/supplier)
- `dailyUsage` = keluar_periode / jumlah_hari_periode (hari dengan outlet buka = kalender, v1: jumlah hari rentang)
- `rop = minStock + (dailyUsage × leadTimeDays)`
- `daysToStockout = dailyUsage > 0 ? onHand / dailyUsage : null`
- `reorderQty` rekomendasi: jika onHand ≤ rop maka `max(minStock × 2, ceil(dailyUsage × (leadTime + 7)) − onHand)` else 0

Overstock v1: `onHand > max(minStock × 4, rop × 3)` dan dailyUsage rendah.

Plan: ROP & rekomendasi Growth+; Starter hanya mutasi dasar tanpa ROP.

### 6.17 Chat AI (kontrak)

Sumber `frontend/src/pages/chat-ai/index.tsx`.

**US-AI-01** `POST /ai/chat` { `conversationId?`, `message`, `clientMessageId?` } → `{ conversationId, message: { id, role, text, createdAt, suggestions[] } }`.

v1: stub rule-based (omset, stok kritis, HPP, bundling) memakai data tenant nyata. Bukan LLM. Response time p95 < 1.5s.

**US-AI-02** GET history, POST reset (hapus percakapan).

### 6.18 Billing entitlement (bukan payment gateway)

**US-BIL-01** GET subscription: plan, status, currentPeriodEnd, outletLimit, feature flags.

**US-BIL-02** Endpoint terlarang plan → `403 PLAN_REQUIRED` `{ requiredPlan, currentPlan }`.

Payment gateway, invoice Xendit, dll. **non-goal v1** (plan diset register/seed/admin).

---

## 7. Data Entities (product level)

Identifier: UUID. Kode bisnis (`sku`, `noNota`) string. Timestamp ISO-8601 UTC; field `*Display` opsional WITA.

### 7.1 Enums (API snake_case, UI label Indonesia)

| Enum | Values (api → UI) |
|---|---|
| `planCode` | `free_trial`, `starter`, `growth`, `pro`, `business` |
| `businessTypeRegister` | `restaurant`, `retail`, `service` |
| `outletBusinessType` | `coffee_bakery`, `restaurant`, `warung`, `retail`, `catering`, `food_manufacture` |
| `orgRole` | `owner`, `admin`, `staff` |
| `staffRole` | `store_manager`, `head_barista`, `barista`, `cashier`, `cook`, `helper` |
| `employmentType` | `full_time`, `part_time`, `contract` |
| `ingredientCategory` | `dairy`, `coffee_bean`, `syrup`, `packaging`, `flavor_powder`, `other` |
| `ingredientStatus` | `active`, `low`, `out_of_stock` |
| `productKind` | `made_to_order`, `finished_good`, `pre_order` |
| `marginGrade` | `healthy`, `thin`, `low`, `loss` |
| `stockItemType` | `ingredient`, `finished_good` |
| `stockStatus` | `ok`, `low`, `critical`, `overstock` |
| `movementType` | `purchase_in`, `adjustment_in`, `adjustment_out`, `sale_out`, `sale_void_in`, `transfer_out`, `transfer_in`, `opname`, `waste_out` |
| `transferStatus` | `in_transit`, `completed`, `cancelled` |
| `opnameStatus` | `pending_review`, `approved`, `rejected` |
| `wasteReason` | `expired`, `damaged`, `trial_fail`, `lost` |
| `orderType` | `dine_in`, `takeaway`, `delivery` |
| `paymentMethod` | `qris`, `cash`, `debit`, `bank_transfer` |
| `saleStatus` | `paid`, `pending`, `cancelled` |
| `expenseCategory` | `raw_material`, `packaging`, `operational`, `salary`, `utilities`, `equipment`, `transport`, `other` |
| `payStatus` | `paid`, `unpaid`, `credit` |
| `shiftName` | `morning`, `evening` |
| `shiftStatus` | `open`, `balanced`, `variance` |
| `uom` | `ml`, `gram`, `kg`, `pcs`, `liter`, `botol`, `karton`, `pouch`, `pack`, `orang`, `bulan` |

### 7.2 Entitas dan field inti

**User:** id, fullName, email, phone, passwordHash, avatarUrl, jobTitle, emailVerifiedAt, status (`active`\|`disabled`), createdAt

**Organization:** id, name, country, province, city, registerBusinessType, createdAt

**Outlet:** id, organizationId, name, businessType, address, city, phone, isActive

**Warehouse:** id, organizationId, outletId, name, code, isDefault

**Membership:** userId, organizationId, orgRole, defaultOutletId

**Staff:** id, organizationId, outletId, userId?, name, staffRole, phone, email, employmentType, joinedOn, baseSalaryIdr, allowanceIdr, currentShiftLabel, isActive

**Subscription:** organizationId, planCode, status (`trialing`\|`active`\|`expired`), trialEndsAt, outletLimit

**Ingredient:** sku, name, category, uom, purchasePriceIdr, minStock, leadTimeDays, supplierId?, isActive

**Product:** sku, name, category, sellingPriceIdr, kind, isActive

**RecipeLine:** productId, componentType (`ingredient`\|`product`), componentId, qty

**InventoryBalance:** warehouseId, itemType, itemId, qtyOnHand, qtyReserved, avgUnitCost (numeric)

**StockMovement:** id, occurredAt, type, qty, unitCost, refType, refId, notes, actorUserId

**Sale / SaleItem:** noNota, soldAt, cashierStaffId/userId, orderType, paymentMethod, subtotalIdr, discountIdr, taxIdr, totalIdr, status, cogsIdr (snapshot)

**Expense:** date, name, category, qty, uom, unitPriceIdr, totalIdr, supplier, paymentMethod, payStatus, notes

**StockTransfer / lines:** noTransfer, fromWarehouseId, toWarehouseId, status, actor

**StockOpname:** systemQty, physicalQty, variance, status, notes

**WasteLog:** qty, reason, lossIdr

**CashShift:** startingCashIdr, cashSalesIdr, qrisSalesIdr, actualPhysicalCashIdr, differenceIdr, notes, status, openedAt, closedAt

**NotificationPreference:** flags §6.2

**AiConversation / AiMessage**

**IdempotencyKey:** key, organizationId, userId, requestHash, responseStatus, responseBody, createdAt

**AuditLog:** actor, action, entity, entityId, metadata JSON, ip

---

## 8. Auth, Roles, Permissions

### 8.1 Identitas

- Password: min 8, hash argon2id (detail DESIGN).
- Access JWT 15 menit + refresh (12 jam / 30 hari).
- Frontend hanya menyimpan access token di `localStorage.auth_token` saat ini. Backend tetap mengembalikan `refreshToken`; frontend harus disimpan (disarankan `localStorage.auth_refresh` atau cookie httpOnly nanti). v1 API: refresh via body `{ refreshToken }`.

### 8.2 Permission matrix

Legend: F = full, R = read, C = create, U = update, A = approve, — = deny, O = outlet sendiri.

| Resource | Owner | Store Manager | Kasir | Head Barista / Barista | Kitchen | Helper |
|---|---|---|---|---|---|---|
| Org/billing/plan | F | — | — | — | — | — |
| Outlet/warehouse | F | R + U nama gudang O | R O | R O | R O | R O |
| Bahan/produk/resep | F | F O/org | R | R | R | R |
| Inventory list | F | F O | R O | R O | R O | R |
| Adjustment IN/OUT | F | F O | — | — | — | — |
| Transfer | F | F O | — | — | — | — |
| Opname create | F | F O | — | C O | C O | — |
| Opname approve | F | A O | — | — | — | — |
| Waste | F | F O | C O | C O | C O | C O |
| POS sale | F | F O | C O | — | — | — |
| Sale void | F | F O | C O (hari ini) | — | — | — |
| Pengeluaran | F | F O | R | — | — | — |
| Staff CRUD | F | U O (bukan gaji?) **v1 Manager tidak lihat gaji** | — | — | — | — |
| Shift open/close | F | F O | F O (punya shift) | — | — | — |
| Laporan | F | R O | R O (transaksi sendiri opsional; v1 R O) | — | — | — |
| Dashboard | F | R O | R O ringkas | — | — | — |
| Profil sendiri | F | F | F | F | F | F |
| AI chat | F | F O | — | — | — | — |

Owner selalu bypass outlet restriction kecuali write yang butuh `X-Outlet-Id`.

---

## 9. Plan / entitlement gating

Sumber harga: `frontend/src/components/shared/Price/default/index.tsx`.

| Plan | Harga /outlet/bln | Tahunan | Outlet |
|---|---|---|---|
| `free_trial` | 0, 14 hari | — | 1 |
| `starter` | 149_000 | 99_000/bln (1.188.000/th) | 1 |
| `growth` | 349_000 | 299_000/bln (3.588.000/th) | 1 |
| `pro` | 699_000 | 599_000/bln (7.188.000/th) | 1 (small chain: max 3 di v1 backend flag, UI Business untuk >3) |
| `business` | 1_200_000 | 999_000/bln (11.988.000/th) | 3–20 |

Feature flags:

| Fitur | Starter/Trial | Growth | Pro | Business |
|---|---|---|---|---|
| POS, produk, resep, HPP basic, dashboard omset | ✓ | ✓ | ✓ | ✓ |
| Inventory on-hand + adjustment | ✓ basic | ✓ | ✓ | ✓ |
| Laporan penjualan | ✓ | ✓ | ✓ | ✓ |
| Pengeluaran | ✓ | ✓ | ✓ | ✓ |
| Karyawan directory + shift kas | ✓ (max 5 staf) | ✓ 25 | ✓ unlimited | ✓ |
| Transfer, opname, waste, ROP | 403 | ✓ | ✓ | ✓ |
| Supplier master + margin SKU report | basic string | ✓ | ✓ | ✓ |
| Laba rugi (nett profit KPI) | omset-COGS saja | ✓ ops expense | ✓ | ✓ |
| Batch costing, PO, produksi, arus kas, approval | — | — | ✓ (stub 501 jika belum) | ✓ |
| Multi-outlet, role advanced, API keys | — | — | — | ✓ |
| AI chat stub | 20 msg/hari | 200 | 1000 | 5000 |

Starter “COGS basic”: HPP dari last/avg cost dan dashboard COGS penjualan, **tanpa** waste% dan ROP.

---

## 10. Analytics / KPI definitions

Semua filter waktu di **WITA** `Asia/Makassar`. Sale dihitung `status = paid`.

### 10.1 Omset (Gross Revenue)

```
omset = Σ sale.totalIdr
```

Catatan: mock kadang menampilkan subtotal; **canonical = totalBayar** (setelah diskon+pajak) agar sama dengan kas masuk. Field terpisah `omsetGross = Σ subtotal` dan `omsetNet = Σ totalIdr` disediakan; kartu dashboard “Total Omset Penjualan” memakai `omsetNet` (`totalIdr`).

### 10.2 COGS / HPP bahan

```
cogs = Σ stock_movements.amount
  where type = sale_out
  and occurredAt in range
  and warehouse in selected outlets
```

`amount = qty × unitCostAvg` pada saat movement (snapshot di baris ledger, bukan hitung ulang).

Rasio HPP = `cogs / omsetNet × 100`. Ambang “Sangat Sehat” < 40% (copy dashboard 38%).

### 10.3 Nett profit

```
nettProfit = omsetNet − cogs − operatingExpenses
operatingExpenses = Σ expenses.totalIdr
  where payStatus != unpaid? 
```

**Canonical v1:** semua expense dengan `date` dalam range, **termasuk unpaid**, kecuali kategori `raw_material` dan `packaging` **jika** ada flag `countedInCogs` (default: bahan/kemasan **tidak** masuk opex agar tidak double dengan COGS stok). Gaji, utilitas, operasional, transport, equipment, other = opex.

Margin bersih = `nettProfit / omsetNet × 100`.

Growth+: rumus ini. Starter: `omsetNet − cogs` (abaikan opex) dan label “Laba kotor”.

### 10.4 Waste

```
wasteIdr = Σ waste.lossIdr in range
wastePct = wasteIdr / omsetNet × 100
criticalSkuCount = count balances status critical
```

Kartu dashboard: “N Item Kritis” + “Food Waste: Rp X (Y%)”.

### 10.5 Burn rate

```
dailyUsage = qty_out_last_7d / 7
```

(movement sale_out + waste_out + adjustment_out, 7 hari kalender WITA).

### 10.6 ROP

```
rop = minStock + (dailyUsage × leadTimeDays)
```

selaras FAQ `frontend/src/pages/help-center/index.tsx`.

### 10.7 Menu terlaris vs margin

- Terlaris: `Σ qty` sale_item desc
- Margin tinggi: `marginPct` dari HPP snapshot per line (`unitPrice − unitCogs`) / unitPrice

### 10.8 Trend vs periode sebelumnya

`trendPct = (current − previous) / previous × 100`; previous = rentang setara mundur.

---

## 11. Non-functional requirements

| NFR | Target |
|---|---|
| Load awal | ~100 org, 1–20 outlet/org, <50 kasir konkuren |
| POS p95 | < 300 ms (create sale, termasuk stok) |
| Dashboard p95 | < 500 ms (agregat pre-aggregate harian) |
| Availability | 99.5% monthly v1 (bukan 99.9 Enterprise landing) |
| Consistency stok | Serializable/row-lock per balance; tidak lost update |
| Timezone | Asia/Makassar |
| Currency | IDR; money integer rupiah; qty numeric 4 desimal |
| Audit | semua write stok, sale void, opname approve, auth |
| Pagination | default `page=1`, `limit=20`, max 100 |
| Idempotensi | POST sales, transfers; TTL key 24 jam |
| Email | OTP + reset; provider pluggable (log di dev) |
| File export | job async; URL signed 15 menit |
| Retention | audit 1 tahun; ledger tidak dihapus |

---

## 12. Error, empty states, idempotency

### 12.1 Envelope error (wajib)

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Stok Fresh Milk tidak mencukupi",
    "details": [{ "sku": "BB-001", "required": 200, "available": 50 }]
  },
  "requestId": "req_01J..."
}
```

Kode utama: `INVALID_CREDENTIALS`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `PLAN_REQUIRED`, `NOT_FOUND`, `CONFLICT`, `IDEMPOTENCY_CONFLICT`, `INSUFFICIENT_STOCK`, `SHIFT_OPEN`, `RATE_LIMITED`, `OTP_INVALID`, `OTP_EXPIRED`.

HTTP: 400 validasi, 401 auth, 403 izin/plan, 404, 409 konflik/stok/idempotency beda payload, 422 bisnis, 429, 500.

### 12.2 Empty

List kosong: `{ data: [], meta: { page, limit, total: 0 } }` HTTP 200. Bukan 404.

### 12.3 Idempotency

Header `Idempotency-Key` (UUID). Scope: `organizationId + userId + method + path + key`. Payload hash SHA-256. Replay mengembalikan response tersimpan. Payload berbeda → 409 `IDEMPOTENCY_CONFLICT`.

---

## 13. Seed & demo

Non-production:

| Field | Value |
|---|---|
| Email | `owner@teratur.id` |
| Password | `12345678` |
| Nama | Julian Firmansyah |
| Org | Kopi Susu Teratur |
| Outlet | Kopi Teratur Flagship |
| Plan | `pro` (agar semua menu UI bisa di-demo) |
| Bahan/produk/stok/sales | selaras mock UI (Greenfield, House Blend, dll.) |

Produksi: seed ini **mati**.

---

## 14. Out of scope (ringkas)

Frontend, payment gateway, QRIS PSP, hardware, LLM penuh, payroll resmi, e-commerce, mobile native, multi-currency, gudang 3PL eksternal, accounting PSAK lengkap.

---

## 15. Success metrics (backend)

| Metrik | Target 90 hari setelah MVP |
|---|---|
| Register → org lengkap | ≥ 70% |
| POS create sukses (bukan 5xx) | ≥ 99.5% |
| Insiden tenant leak | 0 |
| p95 POS | < 300 ms |
| Org aktif mingguan dengan ≥ 1 sale | diukur, baseline |

---

## 16. Phased delivery

### Phase 0 — Foundation (PR 1–3 DESIGN)

Auth, org/outlet, middleware, schema, seed.

### Phase 1 — MVP Starter

Master bahan/produk/resep, inventory + adjustment, POS + ledger, pengeluaran, dashboard omset/COGS, laporan transaksi, profil.

### Phase 2 — Growth

Transfer, opname, waste, ROP laporan stok, supplier, karyawan+shift, export, AI stub, notifikasi prefs (storage; kirim email harian opsional).

### Phase 3 — Pro / Business

Batch costing, purchasing, produksi, arus kas, approval, multi-outlet limits, API keys. Chat LLM.

---

## 17. Open questions

1. Apakah pajak 10% otomatis atau input kasir? **Sementara: input kasir (`taxIdr`).**
2. Harga jual per outlet vs org? **v1 org-level.**
3. Apakah finished good dengan resep juga meledakkan bahan saat dijual? **v1 tidak.**
4. Refresh token storage di frontend (localStorage vs cookie) — perlu keputusan FE.
5. Invite staf ke login kapan? **Phase 2.**
6. Unit cost: numeric(14,4) vs integer millirupiah — lihat DESIGN (dipilih numeric(14,4) untuk cost/qty, integer untuk total uang).
7. Redirect 401 frontend ke `/login` vs `/auth/login` — bug FE.

---

## 18. Mapping layar frontend → modul API

| UI | File | API modul |
|---|---|---|
| Login | `frontend/src/pages/auth/LoginPage.tsx` | Auth |
| Register | `frontend/src/pages/auth/RegisterPage.tsx` | Auth |
| Dashboard | `frontend/src/components/shared/DashboardStatistik/default/index.tsx` | Dashboard |
| Bahan baku | `frontend/src/components/shared/MasterDataMenu/bahan-baku/index.tsx` | Ingredients |
| Produk | `frontend/src/components/shared/MasterDataMenu/produk/produk/index.tsx` | Products |
| Inventory | `frontend/src/components/shared/MasterDataMenu/inventory/index.tsx` | Inventory |
| Persediaan ops | `frontend/src/pages/inventory/ManajemenPersediaanPage.tsx` | Transfers, opname, waste |
| Pengeluaran | `frontend/src/pages/pengeluaran/PengeluaranContent.tsx` | Expenses |
| Karyawan | `frontend/src/pages/karyawan/KaryawanPage.tsx` | Staff, shifts |
| Lap. transaksi | `frontend/src/pages/reports/LaporanTransaksiPage.tsx` | Sales |
| Lap. stok | `frontend/src/pages/reports/LaporanStokPage.tsx` | Stock reports |
| Profil | `frontend/src/pages/profile/index.tsx` | Me, org, outlet |
| Chat AI | `frontend/src/pages/chat-ai/index.tsx` | AI stub |
| Pricing | `frontend/src/components/shared/Price/default/index.tsx` | Entitlements |
| API client | `frontend/src/api/client.ts` | Bearer + base URL |

---

## 19. References

- `frontend/src/utils/constants.ts` — API URL, timezone, app name
- `frontend/src/api/client.ts` — Axios interceptor
- `frontend/src/router/routes.ts` — rute dashboard
- Help center FAQ ROP & waste: `frontend/src/pages/help-center/index.tsx`
- DESIGN: `backend/DESIGN.md`
