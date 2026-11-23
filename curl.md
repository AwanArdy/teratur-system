# Panduan curl API Teratur

Panduan ini mencakup **semua endpoint yang terpasang saat ini** di `src/app.ts`. Contoh memakai akun demo hasil `npm run db:seed`.

Server development: `http://localhost:3000`. Router yang sama dipasang di dua prefix:

| Prefix | Contoh |
|---|---|
| `/api/v1` | `http://localhost:3000/api/v1/auth/login` |
| `/api` | `http://localhost:3000/api/auth/login` |

Semua contoh di bawah memakai `/api/v1`. Ganti prefix jika klien lama masih memanggil `/api`.

---

## 0. Siapkan shell

Jalankan server dulu (`npm run dev`), lalu di terminal lain:

```bash
export BASE="http://localhost:3000/api/v1"
```

Respons sukses hampir selalu berbentuk:

```json
{
  "data": {},
  "requestId": "req_01J..."
}
```

List yang berpaginasi menambah `meta`:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0 },
  "requestId": "req_01J..."
}
```

`requestId` mengikuti header `X-Request-Id` jika dikirim. Jika tidak, server membuat `req_<ULID>` dan mengembalikannya di body serta header `X-Request-Id`. Contoh di dokumen ini memakai nilai ilustratif `req_demo`. UUID, token, dan timestamp di contoh adalah bentuk yang harus muncul, nilainya berbeda tiap database.

Respons error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data request tidak valid",
    "details": [{ "path": "email", "message": "Format email tidak valid" }]
  },
  "requestId": "req_demo"
}
```

Kode yang sering muncul:

| HTTP | `error.code` | Kapan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body atau query tidak lolos Zod |
| 400 | `OUTLET_REQUIRED` | Endpoint butuh header `X-Outlet-Id` |
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | Header `Idempotency-Key` kosong |
| 400 | `INVALID_IDEMPOTENCY_KEY` | Nilai key bukan UUID |
| 401 | `UNAUTHORIZED` | Token hilang, kadaluarsa, atau sesi dicabut |
| 401 | `INVALID_CREDENTIALS` | Email atau password login salah |
| 403 | `FORBIDDEN` | Peran tidak cukup |
| 403 | `PLAN_REQUIRED` | Paket di bawah minimum, atau langganan `expired` |
| 403 | `ONBOARDING_REQUIRED` | Akun masih `pending` / belum punya organisasi |
| 404 | `NOT_FOUND` | Resource atau path tidak ada |
| 409 | `CONFLICT` | SKU ganda, atau state dokumen bentrok |
| 409 | `IDEMPOTENCY_CONFLICT` | Key yang sama dipakai dengan body berbeda |
| 409 | `REQUEST_IN_PROGRESS` | Request dengan key yang sama masih berjalan |
| 409 | `SHIFT_ALREADY_OPEN` | Masih ada shift kas terbuka di outlet |
| 429 | `RATE_LIMITED` | OTP terkunci atau dikirim terlalu cepat |
| 501 | `NOT_IMPLEMENTED` | Roster, performance, dan payroll staf (Phase 2) |
| 502 | `BAD_GATEWAY` | RAG service membalas error |
| 503 | `SERVICE_UNAVAILABLE` | RAG service tidak terjangkau |

---

## 1. Health dan meta (tanpa token)

### GET `/healthz` dan GET `/health`

Keduanya di root, **bukan** di bawah `/api`.

```bash
curl -sS "$BASE/../healthz" | jq .
curl -sS "http://localhost:3000/health" | jq .
```

**Harusnya `200`:**

```json
{ "status": "ok", "ts": "2026-11-22T08:00:00.000Z" }
```

`ts` adalah waktu server saat request, bukan nilai tetap.

### GET `/api/v1/meta`

```bash
curl -sS -H "X-Request-Id: req-demo" "$BASE/meta" | jq .
```

**Harusnya `200`:**

```json
{
  "data": {
    "timezone": "Asia/Makassar",
    "currency": "IDR",
    "apiVersion": "v1"
  },
  "requestId": "req-demo"
}
```

`timezone` mengikuti `APP_TZ` di `.env` (default `Asia/Makassar`).

---

## 2. Auth

Akun demo seed (`SEED_DEMO=true`, bukan production):

| Field | Nilai |
|---|---|
| Email | `kasir@teratur.id` |
| Password | `password123` |
| Nama | Budi Santoso |
| Peran org | `owner` |
| Paket | `pro` / `active` |
| Organisasi | Kopi Teratur |
| Outlet | Kopi Teratur - Outlet Pusat |
| Gudang | Gudang Utama (`WH-01`) |

Owner boleh mengakses endpoint yang mengizinkan `owner`/`admin` **dan** endpoint staf (`manager`, `cashier`, dan seterusnya), karena middleware `authorizeStaff` meloloskan owner dan admin.

### POST `/auth/login`

```bash
curl -sS -D - -o /tmp/login.json \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: req-demo" \
  -X POST "$BASE/auth/login" \
  -d '{
    "email": "kasir@teratur.id",
    "password": "password123",
    "rememberMe": false
  }'
jq . /tmp/login.json

export ACCESS_TOKEN="$(jq -r '.data.accessToken' /tmp/login.json)"
export REFRESH_TOKEN="$(jq -r '.data.refreshToken' /tmp/refresh.json 2>/dev/null || jq -r '.data.refreshToken' /tmp/login.json)"
export ORG_ID="$(jq -r '.data.organization.id' /tmp/login.json)"
export OUTLET_ID="$(jq -r '.data.outlet.id' /tmp/login.json)"
```

**Harusnya `200`:**

```json
{
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<token-opaque>",
    "expiresIn": 900,
    "user": {
      "id": "<uuid>",
      "fullName": "Budi Santoso",
      "phone": "081234567890",
      "jobTitle": "Owner / Kasir"
    },
    "organization": { "id": "<uuid>", "name": "Kopi Teratur" },
    "outlet": { "id": "<uuid>", "name": "Kopi Teratur - Outlet Pusat" },
    "subscription": { "planCode": "pro", "status": "active" }
  },
  "requestId": "req-demo"
}
```

`expiresIn` adalah umur access token dalam detik (15 menit). `rememberMe: false` membuat refresh token hidup 12 jam. `rememberMe: true` membuatnya hidup 30 hari.

Password salah **harusnya `401`:**

```json
{
  "error": { "code": "INVALID_CREDENTIALS", "message": "Email atau password salah" },
  "requestId": "req-demo"
}
```

Header untuk request berikutnya:

```bash
# simpan ulang jika variabel di atas belum terset
export ACCESS_TOKEN="$(jq -r '.data.accessToken' /tmp/login.json)"
export REFRESH_TOKEN="$(jq -r '.data.refreshToken' /tmp/login.json)"
export OUTLET_ID="$(jq -r '.data.outlet.id' /tmp/login.json)"
```

### POST `/auth/refresh`

```bash
curl -sS -H "Content-Type: application/json" -H "X-Request-Id: req-demo" \
  -X POST "$BASE/auth/refresh" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | tee /tmp/refresh.json | jq .
export ACCESS_TOKEN="$(jq -r '.data.accessToken' /tmp/refresh.json)"
export REFRESH_TOKEN="$(jq -r '.data.refreshToken' /tmp/refresh.json)"
```

**Harusnya `200`.** Refresh token lama langsung hangus (rotasi). Pakai token baru.

```json
{
  "data": {
    "accessToken": "<jwt-baru>",
    "refreshToken": "<token-opaque-baru>",
    "expiresIn": 900
  },
  "requestId": "req-demo"
}
```

Token bekas pakai ulang **harusnya `401`** `UNAUTHORIZED` — `Refresh token tidak valid atau kadaluarsa`.

### POST `/auth/logout`

```bash
curl -sS -o /tmp/logout.body -w "HTTP %{http_code}\n" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/auth/logout" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

**Harusnya `204`** dan body kosong. Login lagi sebelum lanjut, karena sesi itu sudah dicabut.

### POST `/auth/forgot-password`

```bash
curl -sS -H "Content-Type: application/json" -H "X-Request-Id: req-demo" \
  -X POST "$BASE/auth/forgot-password" \
  -d '{"email":"kasir@teratur.id"}' | jq .
```

**Harusnya `202`**, baik email ada maupun tidak (anti enumerasi):

```json
{
  "data": { "message": "Jika email terdaftar, tautan reset telah dikirim" },
  "requestId": "req-demo"
}
```

Di development tanpa `SMTP_URL`, token mentah tercetak di log server: `[DEV RESET] Email: ... | ResetToken: ...`.

### POST `/auth/reset-password`

Jangan dijalankan pada akun demo jika Anda masih ingin login dengan `password123`. Token salah **harusnya `400`:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Token reset tidak valid atau sudah digunakan/kadaluarsa"
  },
  "requestId": "req-demo"
}
```

Token valid **harusnya `204`** body kosong. Semua refresh token user itu ikut dicabut.

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/auth/reset-password" \
  -d '{"token":"<reset-token-dari-log>","newPassword":"password123"}'
```

### POST `/auth/change-password` (butuh Bearer)

Mengganti password juga mencabut semua sesi. Letakkan di akhir sesi uji.

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/auth/change-password" \
  -d '{"oldPassword":"password123","newPassword":"password123"}'
```

Password lama benar **harusnya `204`**. Password lama salah **harusnya `401`** `UNAUTHORIZED` — `Password lama salah`.

### Alur daftar akun baru

Tiga langkah. OTP hanya tercetak di log server saat `NODE_ENV=development` dan `SMTP_URL` kosong: `[DEV OTP] Email: ... | OTP Code: 123456`.

**POST `/auth/register` — harusnya `201`:**

```bash
curl -sS -H "Content-Type: application/json" -H "X-Request-Id: req-demo" \
  -X POST "$BASE/auth/register" \
  -d '{
    "fullName": "Sari Wijaya",
    "email": "sari.uji@example.com",
    "phone": "081234567891",
    "password": "rahasia123"
  }' | tee /tmp/register.json | jq .
export REG_ID="$(jq -r '.data.registrationId' /tmp/register.json)"
```

```json
{
  "data": {
    "registrationId": "<uuid>",
    "email": "sari.uji@example.com",
    "otpExpiresAt": "2026-11-22T08:10:00.000Z"
  },
  "requestId": "req-demo"
}
```

Email yang sudah ada **harusnya `400`** `VALIDATION_ERROR` — `Email sudah terdaftar dalam sistem`.

**POST `/auth/otp/resend` — harusnya `202`** (tunggu minimal 60 detik dari OTP sebelumnya, kalau tidak **`429`** `RATE_LIMITED`):

```bash
curl -sS -H "Content-Type: application/json" \
  -X POST "$BASE/auth/otp/resend" \
  -d "{\"registrationId\":\"$REG_ID\"}" | jq .
```

```json
{
  "data": {
    "email": "sari.uji@example.com",
    "otpExpiresAt": "2026-11-22T08:20:00.000Z"
  },
  "requestId": "req_..."
}
```

**POST `/auth/otp/verify` — harusnya `200`:**

```bash
curl -sS -H "Content-Type: application/json" \
  -X POST "$BASE/auth/otp/verify" \
  -d "{\"registrationId\":\"$REG_ID\",\"otp\":\"123456\"}" | tee /tmp/otp.json | jq .
export ONBOARDING="$(jq -r '.data.onboardingToken' /tmp/otp.json)"
```

```json
{
  "data": { "onboardingToken": "<jwt>", "expiresIn": 900 },
  "requestId": "req_..."
}
```

OTP salah **harusnya `400`** `OTP_INVALID`. OTP lewat 10 menit **harusnya `400`** `OTP_EXPIRED`.

**POST `/auth/register/complete` — harusnya `201`:**

```bash
curl -sS -H "Content-Type: application/json" \
  -X POST "$BASE/auth/register/complete" \
  -d "{
    \"onboardingToken\": \"$ONBOARDING\",
    \"businessName\": \"Warung Sari\",
    \"businessType\": \"restaurant\",
    \"country\": \"Indonesia\",
    \"province\": \"Jawa Barat\",
    \"city\": \"Bandung\",
    \"plan\": \"pro\",
    \"acceptedTerms\": true
  }" | jq .
```

```json
{
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<token-opaque>",
    "expiresIn": 900,
    "user": {
      "id": "<uuid>",
      "fullName": "Sari Wijaya",
      "email": "sari.uji@example.com",
      "phone": "081234567891",
      "jobTitle": "Owner / Pemilik Usaha"
    },
    "organization": { "id": "<uuid>", "name": "Warung Sari" },
    "outlet": { "id": "<uuid>", "name": "Warung Sari" },
    "subscription": { "planCode": "pro", "status": "active" }
  },
  "requestId": "req_..."
}
```

`plan` yang diterima: `Teratur Free`, `Teratur Pro`, `free_trial`, `starter`, `growth`, `pro`, `business`. `acceptedTerms` wajib `true`. Dipanggil dua kali **harusnya `400`** `CONFLICT`.

Login lagi sebagai akun demo sebelum bagian berikutnya.

---

## 3. Profil — `/me`

Semua endpoint butuh `Authorization: Bearer $ACCESS_TOKEN`.

### GET `/me`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "X-Request-Id: req-demo" \
  "$BASE/me" | jq .
```

**Harusnya `200`:**

```json
{
  "data": {
    "id": "<uuid>",
    "fullName": "Budi Santoso",
    "email": "kasir@teratur.id",
    "phone": "081234567890",
    "jobTitle": "Owner / Kasir",
    "avatarUrl": null,
    "status": "active",
    "notificationPreferences": {
      "lowStock": true,
      "dailyReport": true,
      "newTransaction": false,
      "unpaidReminder": true
    },
    "activeSessionsCount": 1
  },
  "requestId": "req-demo"
}
```

`notificationPreferences` di atas adalah default bila baris preferensi belum ada. `activeSessionsCount` mengikuti jumlah refresh token yang belum dicabut.

### PATCH `/me`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/me" \
  -d '{"jobTitle":"Owner / Kasir"}' | jq .
```

**Harusnya `200`** dengan baris user yang diperbarui (`fullName`, `jobTitle`, `phone`, `avatarUrl`, plus kolom akun). `avatarUrl` harus URL valid atau `null`.

### PATCH `/me/notification-preferences`

Keempat boolean wajib.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/me/notification-preferences" \
  -d '{
    "lowStock": true,
    "dailyReport": true,
    "newTransaction": true,
    "unpaidReminder": true
  }' | jq .
```

**Harusnya `200`:** objek preferensi yang tersimpan, `newTransaction` menjadi `true`.

### GET `/me/sessions`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/me/sessions" | jq .
```

**Harusnya `200`:** `data` adalah array sesi aktif (id, user, organisasi, waktu kedaluwarsa). Ambil satu `id` yang **bukan** sesi yang sedang dipakai jika ingin uji cabut.

### DELETE `/me/sessions/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X DELETE "$BASE/me/sessions/<session-uuid>" | jq .
```

**Harusnya `200`:**

```json
{ "data": { "id": "<session-uuid>" }, "requestId": "req_..." }
```

Sesi milik user lain atau id yang tidak ada **harusnya `404`** `NOT_FOUND`.

### POST `/me/disable`

Menonaktifkan akun yang sedang login dan mencabut semua sesinya. Jangan dijalankan pada `kasir@teratur.id`.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X POST "$BASE/me/disable" \
  -d '{"confirmEmail":"sari.uji@example.com"}' | jq .
```

**Harusnya `200`** bila email cocok:

```json
{ "data": { "id": "<user-uuid>", "status": "disabled" }, "requestId": "req_..." }
```

Email konfirmasi tidak cocok **harusnya `400`** `VALIDATION_ERROR` — `Konfirmasi email tidak cocok`.

---

## 4. Organisasi, outlet, gudang, billing

### GET `/organizations/current`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "X-Request-Id: req-demo" \
  "$BASE/organizations/current" | jq .
```

**Harusnya `200`:**

```json
{
  "data": {
    "id": "<uuid>",
    "name": "Kopi Teratur",
    "country": "Indonesia",
    "province": "Jawa Barat",
    "city": "Bandung",
    "registerBusinessType": "restaurant",
    "acceptedTermsAt": "2026-11-22T00:00:00.000Z",
    "createdAt": "2026-11-22T00:00:00.000Z",
    "updatedAt": "2026-11-22T00:00:00.000Z"
  },
  "requestId": "req-demo"
}
```

### PATCH `/organizations/current`

Hanya `owner`.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/organizations/current" \
  -d '{"city":"Bandung"}' | jq .
```

**Harusnya `200`:** objek organisasi dengan `city` tetap `Bandung` (atau nilai baru yang Anda kirim). Bukan owner **harusnya `403`** `FORBIDDEN`.

### GET `/outlets`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/outlets" | jq .
export OUTLET_ID="$(curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/outlets" | jq -r '.data[0].id')"
```

**Harusnya `200`:** `data` array. Elemen pertama seed:

```json
{
  "id": "<uuid>",
  "organizationId": "<uuid>",
  "name": "Kopi Teratur - Outlet Pusat",
  "businessType": "coffee_bakery",
  "address": "Jl. Braga No. 88, Sumur Bandung",
  "city": "Bandung",
  "phone": "022-4201234",
  "isActive": true,
  "deletedAt": null,
  "createdAt": "<iso>",
  "updatedAt": "<iso>"
}
```

### GET `/outlets/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/outlets/$OUTLET_ID" | jq .
```

**Harusnya `200`:** `{ "data": <outlet di atas> }`. Id asing **harusnya `404`**.

### POST `/outlets`

Hanya `owner`. Paket demo `pro` punya `outletLimit` 5, jadi outlet kedua masih muat. Saat kuota penuh **harusnya `403`** `FORBIDDEN` dengan pesan batas outlet.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X POST "$BASE/outlets" \
  -d '{
    "name": "Kopi Teratur - Dago",
    "businessType": "coffee_bakery",
    "address": "Jl. Dago No. 1",
    "city": "Bandung",
    "phone": "022-4209999"
  }' | tee /tmp/outlet2.json | jq .
export OUTLET2_ID="$(jq -r '.data.id' /tmp/outlet2.json)"
```

**Harusnya `201`:** outlet baru plus gudang default yang dibuat bersamaan. `businessType` yang sah: `coffee_bakery`, `restaurant`, `warung`, `retail`, `catering`, `food_manufacture`.

### PATCH `/outlets/:id`

Owner atau admin.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/outlets/$OUTLET2_ID" \
  -d '{"phone":"022-4208888"}' | jq .
```

**Harusnya `200`:** outlet dengan `phone` baru.

### GET `/outlets/:outletId/warehouses`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/outlets/$OUTLET_ID/warehouses" | tee /tmp/wh.json | jq .
export WAREHOUSE_ID="$(jq -r '.data[0].id' /tmp/wh.json)"
```

**Harusnya `200`:** array. Seed outlet pusat:

```json
{
  "id": "<uuid>",
  "organizationId": "<uuid>",
  "outletId": "<outlet-pusat>",
  "name": "Gudang Utama",
  "code": "WH-01",
  "isDefault": true,
  "createdAt": "<iso>"
}
```

Outlet yang bukan milik organisasi **harusnya `404`**.

### POST `/outlets/:outletId/warehouses`

Owner atau admin. Kode ganda di outlet yang sama **harusnya `409`** `CONFLICT`.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X POST "$BASE/outlets/$OUTLET_ID/warehouses" \
  -d '{"name":"Gudang Belakang","code":"WH-02","isDefault":false}' \
  | tee /tmp/wh2.json | jq .
export WAREHOUSE2_ID="$(jq -r '.data.id' /tmp/wh2.json)"
```

**Harusnya `201`:** baris gudang dengan `code` `WH-02`. Gudang kedua ini dipakai nanti untuk transfer.

### PATCH `/warehouses/:id`

Owner atau admin. Path ini **tidak** berada di bawah outlet.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/warehouses/$WAREHOUSE2_ID" \
  -d '{"name":"Gudang Belakang Bar"}' | jq .
```

**Harusnya `200`:** gudang dengan nama baru.

### GET `/billing/subscription`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "X-Request-Id: req-demo" \
  "$BASE/billing/subscription" | jq .
```

**Harusnya `200`** untuk akun seed (paket `pro`):

```json
{
  "data": {
    "planCode": "pro",
    "status": "active",
    "outletLimit": 5,
    "trialEndsAt": null,
    "currentPeriodEnd": null,
    "features": {
      "transfers": true,
      "opname": true,
      "waste": true,
      "rop": true,
      "aiDailyLimit": 1000,
      "staffLimit": null,
      "nettProfitIncludesOpex": true
    }
  },
  "requestId": "req-demo"
}
```

Batas menurut paket:

| Paket | `aiDailyLimit` | `staffLimit` | transfer / opname / waste / ROP |
|---|---|---|---|
| `free_trial`, `starter` | 20 | 5 | false |
| `growth` | 200 | 25 | true |
| `pro` | 1000 | null (tak terbatas) | true |
| `business` | 5000 | null | true |

---

## 5. Supplier

Butuh Bearer. Tulis hanya owner/admin.

### GET `/suppliers`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/suppliers" | tee /tmp/suppliers.json | jq .
export SUPPLIER_ID="$(jq -r '.data[0].id' /tmp/suppliers.json)"
```

**Harusnya `200`:** `data` array minimal dua supplier seed:

- `Roastery Nusantara Bandung`, phone `081122334455`, email `order@roasterynusantara.id`
- `CV Segar Dairy & Sirup`, phone `081344556677`

### GET `/suppliers/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/suppliers/$SUPPLIER_ID" | jq .
```

**Harusnya `200`:** `{ "data": <satu supplier> }`. Tidak ketemu **`404`**.

### POST `/suppliers`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X POST "$BASE/suppliers" \
  -d '{
    "name": "Toko Kemasan Braga",
    "phone": "081300011122",
    "email": "halo@kemasanbraga.id",
    "notes": "Cup dan sedotan"
  }' | tee /tmp/supplier-new.json | jq .
export SUPPLIER_NEW="$(jq -r '.data.id' /tmp/supplier-new.json)"
```

**Harusnya `201`:** supplier baru, `isActive: true`.

### PATCH `/suppliers/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/suppliers/$SUPPLIER_NEW" \
  -d '{"notes":"Cup, lid, dan sedotan"}' | jq .
```

**Harusnya `200`:** supplier dengan `notes` baru.

### DELETE `/suppliers/:id`

Soft delete. **Harusnya `204`** body kosong. Jangan hapus supplier seed jika resep/bahan masih menunjuk mereka. Hapus yang baru dibuat:

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X DELETE "$BASE/suppliers/$SUPPLIER_NEW"
```

---

## 6. Bahan baku — `/ingredients`

List memakai stok outlet aktif. Kirim `X-Outlet-Id` agar `qtyOnHand` terisi. Tanpa header, owner tetap lolos auth dan outlet aktif jatuh ke outlet pertama yang diizinkan.

### GET `/ingredients`

Query: `search`, `category` (`dairy` | `coffee_bean` | `syrup` | `packaging` | `flavor_powder` | `other`), `page`, `limit` (1–100, default 20).

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/ingredients?search=arabika&category=coffee_bean&page=1&limit=20" \
  | tee /tmp/ings.json | jq .
export INGREDIENT_ID="$(jq -r '.data[0].id' /tmp/ings.json)"
```

**Harusnya `200`.** Seed `ING-BEAN-ARB`:

```json
{
  "data": [
    {
      "id": "<uuid>",
      "sku": "ING-BEAN-ARB",
      "name": "Biji Kopi Arabika House Blend",
      "category": "coffee_bean",
      "uom": "gram",
      "purchasePriceIdr": 280,
      "minStock": 1000,
      "purchaseUnitCost": 280,
      "qtyOnHand": 15000,
      "status": "active",
      "supplierName": "Roastery Nusantara Bandung"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 },
  "requestId": "req_..."
}
```

`status`: `out_of_stock` jika `qtyOnHand <= 0`, `low` jika `qtyOnHand <= minStock`, selain itu `active`. Field lain dari baris tabel (lead time, supplier id, timestamp) ikut terbawa.

Tanpa filter, `total` sama dengan jumlah bahan seed (sekitar 20 SKU `ING-*`).

### GET `/ingredients/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/ingredients/$INGREDIENT_ID" | jq .
```

**Harusnya `200`:** satu baris bahan (nilai stok numerik masih string dari kolom numeric, karena endpoint detail tidak menormalisasi seperti list).

### POST `/ingredients`

Owner/admin. Wajib salah satu dari `purchasePriceIdr` atau `purchaseUnitCost`. SKU ganda **harusnya `409`** `CONFLICT`.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X POST "$BASE/ingredients" \
  -d '{
    "sku": "ING-UJI-GULA",
    "name": "Gula Pasir Curah",
    "category": "other",
    "uom": "gram",
    "purchaseUnitCost": 18.5,
    "minStock": 500,
    "leadTimeDays": 2,
    "supplierName": "Pasar Baru"
  }' | tee /tmp/ing-new.json | jq .
export INGREDIENT_NEW="$(jq -r '.data.id' /tmp/ing-new.json)"
```

**Harusnya `201`:** `purchasePriceIdr` dibulatkan menjadi `19`, `lastPurchaseUnitCost` `"18.5000"`, `minStock` `"500.0000"`.

### PATCH `/ingredients/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/ingredients/$INGREDIENT_NEW" \
  -d '{"minStock": 800}' | jq .
```

**Harusnya `200`:** `minStock` `"800.0000"`.

### DELETE `/ingredients/:id`

**Harusnya `204`.** Hapus bahan uji, jangan bahan resep seed.

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X DELETE "$BASE/ingredients/$INGREDIENT_NEW"
```

---

## 7. Produk — `/products`

### GET `/products`

Query: `search`, `page`, `limit`.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/products?search=gula%20aren&limit=5" | tee /tmp/products.json | jq .
export PRODUCT_ID="$(jq -r '.data[0].id' /tmp/products.json)"
```

**Harusnya `200`.** Item seed `KPS-AREN-ICE`:

```json
{
  "id": "<uuid>",
  "sku": "KPS-AREN-ICE",
  "name": "Es Kopi Susu Gula Aren",
  "category": "Kopi Susu",
  "sellingPriceIdr": 22000,
  "kind": "made_to_order",
  "isActive": true
}
```

`meta.total` pada pencarian itu `1` bila hanya satu nama yang cocok.

### GET `/products/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/products/$PRODUCT_ID" | jq .
```

**Harusnya `200`:** produk plus baris `recipe` dari database dan objek `hpp`. Untuk Es Kopi Susu Gula Aren (resep 18 g arabika @280, 130 ml susu @20, 30 ml aren @35, 1 cup @850) HPP = `18*280 + 130*20 + 30*35 + 850` = **9540**.

```json
{
  "data": {
    "id": "<uuid>",
    "sku": "KPS-AREN-ICE",
    "name": "Es Kopi Susu Gula Aren",
    "sellingPriceIdr": 22000,
    "kind": "made_to_order",
    "recipe": [
      { "componentType": "ingredient", "componentId": "<uuid>", "qty": "18.0000" }
    ],
    "hpp": {
      "hppIdr": 9540,
      "marginIdr": 12460,
      "marginPercentage": 56.64,
      "marginPct": 56.64,
      "marginGrade": "healthy",
      "recipeDetails": [
        { "componentType": "ingredient", "componentId": "<uuid>", "qty": 18, "unitCost": 280, "subtotal": 5040 }
      ]
    }
  },
  "requestId": "req_..."
}
```

`marginGrade`: `healthy` jika margin ≥ 40%, `thin` ≥ 20%, `low` ≥ 0%, selain itu `loss`.

### POST `/products/preview-hpp`

Tidak menulis database.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/products/preview-hpp" \
  -d "{
    \"sellingPriceIdr\": 22000,
    \"recipe\": [
      { \"componentType\": \"ingredient\", \"componentId\": \"$INGREDIENT_ID\", \"qty\": 18 }
    ]
  }" | jq .
```

**Harusnya `200`:**

```json
{
  "data": {
    "hppIdr": 5040,
    "marginIdr": 16960,
    "marginPercentage": 77.09,
    "marginPct": 77.09,
    "marginGrade": "healthy",
    "recipeDetails": [
      {
        "componentType": "ingredient",
        "componentId": "<ingredient-uuid>",
        "qty": 18,
        "unitCost": 280,
        "subtotal": 5040
      }
    ]
  },
  "requestId": "req_..."
}
```

Komponen yang bukan milik organisasi **harusnya `404`**.

### POST `/products`

Owner/admin. `kind`: `made_to_order` (default), `finished_good`, `pre_order`.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X POST "$BASE/products" \
  -d "{
    \"name\": \"Es Kopi Uji\",
    \"category\": \"Kopi Susu\",
    \"sku\": \"KPS-UJI\",
    \"sellingPriceIdr\": 18000,
    \"kind\": \"made_to_order\",
    \"recipe\": [
      { \"componentType\": \"ingredient\", \"componentId\": \"$INGREDIENT_ID\", \"qty\": 18 }
    ]
  }" | tee /tmp/product-new.json | jq .
export PRODUCT_NEW="$(jq -r '.data.id' /tmp/product-new.json)"
```

**Harusnya `201`:** produk tersimpan beserta baris resep. SKU `KPS-UJI` yang dikirim dua kali **harusnya `409`**.

### PATCH `/products/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/products/$PRODUCT_NEW" \
  -d '{"sellingPriceIdr":19000}' | jq .
```

**Harusnya `200`:** `sellingPriceIdr` 19000.

### DELETE `/products/:id`

**Harusnya `204`.** Hapus produk uji saja.

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X DELETE "$BASE/products/$PRODUCT_NEW"
```

---

## 8. Inventori — `/inventory`

### GET `/inventory`

Query: `search`, `itemType` (`ingredient` | `finished_good`), `warehouseId`, `page`, `limit`.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/inventory?itemType=ingredient&limit=5" | jq .
```

**Harusnya `200`.** Satu baris seed arabika di Gudang Utama:

```json
{
  "data": [
    {
      "id": "<uuid-bahan>",
      "sku": "ING-BEAN-ARB",
      "name": "Biji Kopi Arabika House Blend",
      "itemType": "ingredient",
      "uom": "gram",
      "warehouseId": "<uuid-gudang>",
      "warehouseName": "Gudang Utama",
      "qtyOnHand": 15000,
      "qtyReserved": 0,
      "qtyAvailable": 15000,
      "minStock": 1000,
      "avgUnitCost": 280,
      "status": "ok",
      "supplierName": "Roastery Nusantara Bandung"
    }
  ],
  "meta": { "page": 1, "limit": 5, "total": 20 },
  "requestId": "req_..."
}
```

`status`: `critical` jika tersedia ≤ 0, `low` jika tersedia ≤ `minStock`, selain itu `ok`. `total` mengikuti jumlah saldo, bukan angka tetap jika Anda sudah menambah stok.

### POST `/inventory/adjustments`

Butuh `X-Outlet-Id`. Owner/admin lolos. Staf hanya `manager`. `warehouseId` opsional (kalau kosong, gudang default outlet).

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/inventory/adjustments" \
  -d "{
    \"itemType\": \"ingredient\",
    \"itemId\": \"$INGREDIENT_ID\",
    \"warehouseId\": \"$WAREHOUSE_ID\",
    \"direction\": \"in\",
    \"qty\": 100,
    \"unitCost\": 280,
    \"notes\": \"Koreksi timbang\"
  }" | jq .
```

**Harusnya `201`:**

```json
{
  "data": {
    "balance": { "qtyOnHand": 15100, "avgUnitCost": 280 },
    "movement": {
      "type": "adjustment_in",
      "qty": "100.0000",
      "unitCost": "280.0000",
      "itemId": "<uuid>"
    }
  },
  "requestId": "req_..."
}
```

`avgUnitCost` tetap 280 karena biaya masuk sama dengan biaya rata-rata yang ada. Arah `out` mengurangi `qtyOnHand` dan membuat movement `adjustment_out` dengan qty negatif. Stok keluar melebihi saldo **harusnya gagal** (stok tidak boleh negatif). Stok masuk pertama tanpa `unitCost` dan biaya rata-rata masih 0 **harusnya `400`** `VALIDATION_ERROR`.

### GET `/inventory/:itemType/:itemId/movements`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/inventory/ingredient/$INGREDIENT_ID/movements?page=1&limit=20" | jq .
```

**Harusnya `200`:** `data` array movement terbaru (termasuk adjustment di atas), plus `meta`. `itemType` selain `ingredient` atau `finished_good` **harusnya `400`**.

---

## 9. Shift kasir — `/shifts`

Buka shift sebelum penjualan tunai agar penjualan menempel ke laci.

### GET `/shifts/active`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/shifts/active" | jq .
```

Belum ada shift **harusnya `200`** dengan `"data": null`. Tanpa outlet **harusnya `400`** `OUTLET_REQUIRED`.

### POST `/shifts/open`

Owner/admin atau staf `manager`/`cashier`. Butuh `X-Outlet-Id`.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/shifts/open" \
  -d '{"startingCashIdr":500000,"shiftName":"morning","notes":"Modal pagi"}' \
  | tee /tmp/shift.json | jq .
export SHIFT_ID="$(jq -r '.data.id' /tmp/shift.json)"
```

**Harusnya `201`:**

```json
{
  "data": {
    "id": "<uuid>",
    "outletId": "<outlet>",
    "staffId": "<uuid-budi>",
    "shiftName": "morning",
    "startingCashIdr": 500000,
    "cashSalesIdr": 0,
    "qrisSalesIdr": 0,
    "status": "open",
    "notes": "Modal pagi",
    "openedAt": "<iso>"
  },
  "requestId": "req_..."
}
```

Akun demo punya baris staf, jadi `cashierStaffId` boleh dikosongkan. Dipanggil lagi saat shift masih terbuka **harusnya `409`** `SHIFT_ALREADY_OPEN`. `shiftName`: `morning` atau `evening`.

### GET `/shifts`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/shifts?page=1&limit=20" | jq .
```

**Harusnya `200`:** `data` berisi shift yang baru dibuka, `meta.total` minimal 1.

### POST `/shifts/close` dan POST `/shifts/:id/close`

Keduanya menutup shift. Wajib salah satu dari `actualPhysicalCashIdr` atau `endingCashIdr`.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/shifts/$SHIFT_ID/close" \
  -d '{"actualPhysicalCashIdr":500000,"notes":"Pas"}' | jq .
```

**Harusnya `200`:** `status` menjadi `closed`, `actualPhysicalCashIdr` 500000, `differenceIdr` 0 bila belum ada penjualan tunai, `closedAt` terisi.

Tutup saat tidak ada shift terbuka **harusnya `404`**.

---

## 10. Penjualan — `/sales`

Semua route butuh Bearer **dan** `X-Outlet-Id`. Tanpa outlet **harusnya `400`** `OUTLET_REQUIRED`.

Buat penjualan memotong stok resep (BOM) dan butuh paket minimal `starter`. Paket `free_trial` juga level 0, sama dengan `starter`, jadi lolos `requirePlan('starter')`.

### POST `/sales`

Wajib header `Idempotency-Key` berupa UUID. Key yang sama + body yang sama dalam 24 jam mengulang respons lama (`X-Idempotent-Replay: true`) tanpa memotong stok dua kali. Key sama + body beda **harusnya `409`** `IDEMPOTENCY_CONFLICT`.

```bash
export IDEM="$(uuidgen | tr '[:upper:]' '[:lower:]')"
curl -sS -D - \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Idempotency-Key: $IDEM" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: req-demo" \
  -X POST "$BASE/sales" \
  -d "{
    \"orderType\": \"dine_in\",
    \"paymentMethod\": \"qris\",
    \"discountIdr\": 0,
    \"taxIdr\": 0,
    \"customerName\": \"Tamu Uji\",
    \"items\": [{ \"productId\": \"$PRODUCT_ID\", \"qty\": 2 }]
  }" | tee /tmp/sale.http
```

**Harusnya `201`** untuk Es Kopi Susu Gula Aren qty 2 (harga 22000, HPP per cup 9540):

```json
{
  "data": {
    "id": "<uuid>",
    "noNota": "NT-...",
    "soldAt": "<iso>",
    "soldAtDisplay": "<tanggal WITA>",
    "cashier": { "name": "Budi Santoso" },
    "orderType": "dine_in",
    "paymentMethod": "qris",
    "customerName": "Tamu Uji",
    "subtotalIdr": 44000,
    "discountIdr": 0,
    "taxIdr": 0,
    "totalIdr": 44000,
    "cogsIdr": 19080,
    "status": "paid",
    "items": [
      {
        "productId": "<uuid>",
        "name": "Es Kopi Susu Gula Aren",
        "qty": 2,
        "unitPriceIdr": 22000,
        "lineTotalIdr": 44000
      }
    ]
  },
  "requestId": "req-demo"
}
```

`unitPriceIdr` boleh dikirim per item. Kalau dikosongkan, harga katalog yang dipakai. Stok bahan tidak cukup **harusnya gagal** dan nota tidak tersimpan. Ulangi curl yang sama (key sama) **harusnya `201`** dengan body identik dan header `X-Idempotent-Replay: true`.

Simpan id nota:

```bash
export SALE_ID="$(sed -n '/^{/,$p' /tmp/sale.http | jq -r '.data.id')"
```

### GET `/sales`

Query: `search`, `paymentMethod`, `orderType`, `status` (`paid` | `pending` | `cancelled`), `from`, `to` (`YYYY-MM-DD`), `page`, `limit`.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/sales?paymentMethod=qris&page=1&limit=20" | jq .
```

**Harusnya `200`:** `data` berisi nota di atas, `meta.total` minimal 1.

### GET `/sales/:id`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/sales/$SALE_ID" | jq .
```

**Harusnya `200`:** bentuk sama dengan objek di dalam `data` saat create. Id tidak ada **`404`**.

### POST `/sales/:id/cancel`

Owner/admin atau staf `manager`/`cashier`. Mengembalikan stok BOM.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -X POST "$BASE/sales/$SALE_ID/cancel" | jq .
```

**Harusnya `200`:** objek nota dengan `"status": "cancelled"`. Membatalkan lagi **harusnya gagal** (bukan `paid`).

---

## 11. POS — `/pos`

Fasad kasir di atas layanan penjualan yang sama. Semua butuh Bearer dan `X-Outlet-Id`.

### GET `/pos/menu`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/pos/menu?search=aren&page=1&limit=50" | jq .
```

**Harusnya `200`:** `data` dan `meta` sama seperti `GET /products` (default `limit` di sini 50, maksimal 100).

### GET `/pos/active-shift`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/pos/active-shift" | jq .
```

**Harusnya `200`:** `data` adalah shift `open`, atau `null` jika laci sudah ditutup.

### POST `/pos/sales`

Kontrak body sama dengan `POST /sales`, plus default `orderType` `dine_in`. Wajib `Idempotency-Key` UUID dan paket minimal `starter`.

```bash
export IDEM2="$(uuidgen | tr '[:upper:]' '[:lower:]')"
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Idempotency-Key: $IDEM2" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/pos/sales" \
  -d "{
    \"paymentMethod\": \"cash\",
    \"items\": [{ \"productId\": \"$PRODUCT_ID\", \"qty\": 1 }]
  }" | tee /tmp/pos-sale.json | jq .
export POS_SALE_ID="$(jq -r '.data.id' /tmp/pos-sale.json)"
```

**Harusnya `201`:** nota `paid`, `orderType` `dine_in`, `paymentMethod` `cash`, `subtotalIdr`/`totalIdr` 22000, `cogsIdr` 9540, satu item.

### GET `/pos/receipt/:id`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/pos/receipt/$POS_SALE_ID" | jq .
```

**Harusnya `200`:** objek nota ditambah:

```json
{
  "receipt": {
    "title": "TERATUR",
    "lines": ["1x Es Kopi Susu Gula Aren @22000 = 22000"],
    "footer": "Terima kasih atas kunjungan Anda"
  }
}
```

---

## 12. Pengeluaran — `/expenses`

List, detail, dan summary: owner/admin atau staf `manager`/`cashier`. Buat: owner/admin atau `manager`, plus `X-Outlet-Id`. Ubah dan hapus: owner/admin.

### GET `/expenses/summary`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/expenses/summary" | jq .
```

Sebelum ada pengeluaran hari ini **harusnya `200`:**

```json
{
  "data": {
    "todayTotalIdr": 0,
    "todayCount": 0,
    "yesterdayTotalIdr": 0,
    "unpaidTotalIdr": 0
  },
  "requestId": "req_..."
}
```

Tanggal "hari ini" memakai zona `APP_TZ` (WITA).

### POST `/expenses`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/expenses" \
  -d '{
    "date": "2026-11-22",
    "name": "Gas LPG 3kg",
    "category": "utilities",
    "qty": 1,
    "uom": "pcs",
    "unitPriceIdr": 22000,
    "paymentMethod": "cash",
    "payStatus": "paid",
    "notes": "Isi ulang",
    "countedInCogs": false
  }' | tee /tmp/expense.json | jq .
export EXPENSE_ID="$(jq -r '.data.id' /tmp/expense.json)"
```

**Harusnya `201`:** baris pengeluaran dengan `totalIdr` 22000 (`qty * unitPriceIdr`), `inputMethod` `MANUAL`.

`category`: `raw_material`, `packaging`, `operational`, `salary`, `utilities`, `equipment`, `transport`, `other`.  
`payStatus`: `paid`, `unpaid`, `credit`.  
`paymentMethod`: `qris`, `cash`, `debit`, `bank_transfer`.

### GET `/expenses`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/expenses?category=utilities&datePreset=today&page=1&limit=20" | jq .
```

**Harusnya `200`:** `data` memuat Gas LPG bila tanggal body sama dengan hari ini WITA. `datePreset`: `today`, `yesterday`, `custom` (pakai `from`/`to`).

### GET `/expenses/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/expenses/$EXPENSE_ID" | jq .
```

**Harusnya `200`:** satu pengeluaran. Tidak ada **`404`**.

### PATCH `/expenses/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/expenses/$EXPENSE_ID" \
  -d '{"notes":"Isi ulang tabung toko"}' | jq .
```

**Harusnya `200`:** `notes` baru. `totalIdr` dihitung ulang jika `qty` atau `unitPriceIdr` berubah.

### DELETE `/expenses/:id`

**Harusnya `204`.**

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X DELETE "$BASE/expenses/$EXPENSE_ID"
```

---

## 13. Dashboard — `/dashboard`

Owner/admin atau staf `manager`/`cashier`. Outlet dari query `outletId` atau header `X-Outlet-Id`.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/dashboard?range=today" | jq .
```

`range`: `today` (default), `yesterday`, `week` (7 hari), `month` (30 hari), `custom` (wajib `from` dan `to`, format `YYYY-MM-DD`).

**Harusnya `200`.** Setelah satu penjualan QRIS 44000 yang sudah dibatalkan dan satu penjualan tunai 22000 yang masih `paid`, angka kasar hari ini:

```json
{
  "data": {
    "kpis": {
      "omsetNetIdr": 22000,
      "omsetGrossIdr": 22000,
      "trxCount": 1,
      "cogsIdr": 9540,
      "cogsRatioPct": 43.4,
      "nettProfitIdr": 12460,
      "nettMarginPct": 56.6,
      "criticalSkuCount": 0,
      "wasteIdr": 0,
      "wastePct": 0,
      "trends": { "omsetPct": 100, "cogsPct": 100, "profitPct": 100 }
    },
    "chart": [],
    "lowStock": [],
    "menuPerformance": [],
    "recentSales": []
  },
  "requestId": "req_..."
}
```

Nilai persis bergantung pada penjualan yang masih `paid` di rentang tanggal. `trends.*Pct` adalah 100 bila periode sebelumnya 0 dan periode ini ada omset. Pada paket `pro`, `wasteIdr` dan margin menu ikut dihitung. Pada `starter`/`free_trial`, `wasteIdr` dipaksa 0 dan `marginPct` menu `null`. `lowStock` hanya bahan yang mendekati atau melewati stok minimum.

---

## 14. Transfer stok — `/transfers`

Butuh paket `growth` atau lebih. Akun seed `pro` lolos. Paket `starter` **harusnya `403`** `PLAN_REQUIRED`.

Butuh dua gudang. Bagian 4 sudah membuat `WAREHOUSE2_ID`.

### GET `/transfers`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/transfers?page=1&limit=20" | jq .
```

Belum ada dokumen **harusnya `200`:**

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0 },
  "requestId": "req_..."
}
```

Query `status`: `in_transit`, `completed`, `cancelled`.

### POST `/transfers`

Wajib `Idempotency-Key` UUID. Owner/admin atau staf `manager`. Gudang asal dan tujuan yang sama **harusnya `400`**.

```bash
export IDEM3="$(uuidgen | tr '[:upper:]' '[:lower:]')"
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Idempotency-Key: $IDEM3" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/transfers" \
  -d "{
    \"fromWarehouseId\": \"$WAREHOUSE_ID\",
    \"toWarehouseId\": \"$WAREHOUSE2_ID\",
    \"notes\": \"Isi ulang bar\",
    \"lines\": [
      {
        \"itemType\": \"ingredient\",
        \"itemId\": \"$INGREDIENT_ID\",
        \"qty\": 200,
        \"uom\": \"gram\"
      }
    ]
  }" | tee /tmp/transfer.json | jq .
export TRANSFER_ID="$(jq -r '.data.id' /tmp/transfer.json)"
```

**Harusnya `201`:** header `status` `in_transit`, `noTransfer` terisi, `lines` memuat 200 gram dengan `unitCost` dari saldo asal. Stok gudang asal berkurang 200. Stok kurang **harusnya gagal** dan dokumen tidak tersimpan.

### GET `/transfers/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/transfers/$TRANSFER_ID" | jq .
```

**Harusnya `200`:** header plus lines. Tidak ada **`404`**.

### POST `/transfers/:id/receive`

Owner/admin atau `manager`. Menambah stok gudang tujuan.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X POST "$BASE/transfers/$TRANSFER_ID/receive" | jq .
```

**Harusnya `200`:** `status` `completed`, `completedAt` terisi. Terima dua kali **harusnya gagal**.

### POST `/transfers/:id/cancel`

Hanya owner/admin. Hanya untuk dokumen yang masih `in_transit` (stok asal dikembalikan). Buat transfer kedua jika yang pertama sudah `completed`, lalu:

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X POST "$BASE/transfers/<id-in-transit>/cancel" | jq .
```

**Harusnya `200`:** `status` `cancelled`, `cancelledAt` terisi.

---

## 15. Opname — `/opnames`

Butuh paket `growth`+. Buat: owner/admin atau staf `manager`/`barista`/`kitchen`, plus `X-Outlet-Id`. Setujui dan tolak: owner/admin.

### GET `/opnames`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/opnames?page=1&limit=20" | jq .
```

**Harusnya `200`:** `data: []` dan `total: 0` bila belum ada opname.

### POST `/opnames`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/opnames" \
  -d "{
    \"warehouseId\": \"$WAREHOUSE_ID\",
    \"itemType\": \"ingredient\",
    \"itemId\": \"$INGREDIENT_ID\",
    \"physicalQty\": 14800,
    \"uom\": \"gram\",
    \"notes\": \"Selisih timbang pagi\"
  }" | tee /tmp/opname.json | jq .
export OPNAME_ID="$(jq -r '.data.id' /tmp/opname.json)"
```

**Harusnya `201`:** `status` `pending_review`, `systemQty` sama dengan saldo saat itu, `physicalQty` 14800, `varianceQty` = fisik − sistem. Stok **belum** berubah sampai disetujui.

### POST `/opnames/:id/approve`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X POST "$BASE/opnames/$OPNAME_ID/approve" | jq .
```

**Harusnya `200`:** `status` `approved`, `decidedAt` terisi, saldo gudang menjadi `physicalQty`.

### POST `/opnames/:id/reject`

Buat opname kedua, lalu:

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X POST "$BASE/opnames/<id-pending>/reject" | jq .
```

**Harusnya `200`:** `status` `rejected`. Saldo tidak berubah. Menyetujui dokumen yang sudah diputuskan **harusnya gagal**.

---

## 16. Waste — `/wastes`

Butuh paket `growth`+. Buat butuh `X-Outlet-Id`. Peran org `owner`, `admin`, atau `staff` boleh membuat.

### GET `/wastes`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/wastes?page=1&limit=20" | jq .
```

**Harusnya `200`:** list kosong bila belum ada waste.

### POST `/wastes`

`reason`: `expired`, `damaged`, `trial_fail`, `lost`. Qty harus lebih dari 0 dan tidak boleh melebihi saldo.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/wastes" \
  -d "{
    \"warehouseId\": \"$WAREHOUSE_ID\",
    \"itemType\": \"ingredient\",
    \"itemId\": \"$INGREDIENT_ID\",
    \"qty\": 20,
    \"uom\": \"gram\",
    \"reason\": \"trial_fail\"
  }" | jq .
```

**Harusnya `201`:** baris waste, stok berkurang 20, `lossIdr` terisi dari qty × biaya rata-rata bila tidak dikirim (20 × 280 = 5600).

---

## 17. Staf — `/staff`

List dan detail: owner, admin, atau staf `manager`. Staf lain **harusnya `403`**. Gaji (`baseSalaryIdr`, `allowanceIdr`) disembunyikan bila pemanggil berperan `staff`.

### GET `/staff`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/staff?page=1&limit=20" | tee /tmp/staff.json | jq .
export STAFF_ID="$(jq -r '.data[0].id' /tmp/staff.json)"
```

**Harusnya `200`.** Seed punya dua orang. Owner melihat gaji:

```json
{
  "data": [
    {
      "id": "<uuid>",
      "name": "Budi Santoso",
      "staffRole": "cashier",
      "phone": "081234567890",
      "email": "kasir@teratur.id",
      "employmentType": "full_time",
      "joinedOn": "2026-01-01",
      "baseSalaryIdr": 3500000,
      "allowanceIdr": 500000,
      "currentShiftLabel": "Pagi",
      "isActive": true
    },
    {
      "name": "Siti Aminah",
      "staffRole": "head_barista",
      "phone": "081298765432",
      "baseSalaryIdr": 4000000,
      "allowanceIdr": 500000
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 2 },
  "requestId": "req_..."
}
```

`total` naik jika Anda menambah staf.

### GET `/staff/roster`, `/staff/performance`, `/staff/payroll`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/staff/roster" | jq .
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/staff/performance" | jq .
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/staff/payroll" | jq .
```

**Harusnya `501`** ketiganya:

```json
{
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Roster/performance/payroll masuk Phase 2. Estimasi payroll = Σ baseSalaryIdr + allowanceIdr dari GET /staff."
  },
  "requestId": "req_..."
}
```

### GET `/staff/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/staff/$STAFF_ID" | jq .
```

**Harusnya `200`:** satu baris staf. Tidak ada **`404`**.

### POST `/staff`

Owner/admin. `role`: `store_manager`, `head_barista`, `barista`, `cashier`, `cook`, `helper`. Kuota `pro` tidak terbatas (`staffLimit: null`).

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/staff" \
  -d '{
    "fullName": "Raka Pratama",
    "role": "barista",
    "employmentType": "part_time",
    "phone": "081255500011",
    "email": "raka@example.com",
    "monthlySalaryIdr": 2500000
  }' | tee /tmp/staff-new.json | jq .
export STAFF_NEW="$(jq -r '.data.id' /tmp/staff-new.json)"
```

**Harusnya `201`:** `name` "Raka Pratama", `staffRole` `barista`, `baseSalaryIdr` 2500000, `joinedOn` tanggal WITA hari ini.

### PATCH `/staff/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X PATCH "$BASE/staff/$STAFF_NEW" \
  -d '{"phone":"081255500099"}' | jq .
```

**Harusnya `200`:** phone baru.

### DELETE `/staff/:id`

Soft delete. **Harusnya `204`.** Jangan hapus Budi (kasir yang menempel ke user login dan shift).

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X DELETE "$BASE/staff/$STAFF_NEW"
```

---

## 18. Payroll stub — `/payroll`

Hanya owner/admin. Ini catatan gaji manual, terpisah dari `GET /staff/payroll` yang masih 501.

### GET `/payroll`

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/payroll?page=1&limit=20" | jq .
```

**Harusnya `200`:** `data: []`, `total: 0` bila belum ada stub.

### POST `/payroll`

`totalNetIdr` = `baseSalaryIdr + bonusIdr - deductionsIdr` (minimal 0).

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -X POST "$BASE/payroll" \
  -d "{
    \"staffId\": \"$STAFF_ID\",
    \"periodStart\": \"2026-11-01\",
    \"periodEnd\": \"2026-11-30\",
    \"baseSalaryIdr\": 3500000,
    \"bonusIdr\": 200000,
    \"deductionsIdr\": 50000,
    \"notes\": \"Periode November\"
  }" | jq .
```

**Harusnya `201`:**

```json
{
  "data": {
    "id": "<uuid>",
    "staffId": "<uuid>",
    "periodStart": "2026-11-01",
    "periodEnd": "2026-11-30",
    "baseSalaryIdr": 3500000,
    "bonusIdr": 200000,
    "deductionsIdr": 50000,
    "totalNetIdr": 3650000,
    "notes": "Periode November"
  },
  "requestId": "req_..."
}
```

`staffId` asing **harusnya `404`**.

---

## 19. AI — `/ai`

Owner/admin atau staf `manager`. Kuota chat harian mengikuti paket (`pro` = 1000). Melebihi kuota **harusnya ditolak** oleh service chat.

### GET `/ai/context`

Query `range`: `today`, `yesterday`, `week` (default), `month`.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/ai/context?range=today" | jq .
```

**Harusnya `200`:**

```json
{
  "data": {
    "period": { "from": "2026-11-22", "to": "2026-11-22" },
    "financials": {
      "omsetNetIdr": 22000,
      "cogsIdr": 9540,
      "grossProfitIdr": 12460,
      "grossMarginPct": 56.6,
      "opexIdr": 0,
      "nettProfitIdr": 12460,
      "nettMarginPct": 57,
      "wasteLossIdr": 1
    },
    "lowStockItems": [],
    "topProducts": [
      { "name": "Es Kopi Susu Gula Aren", "totalQty": 1, "totalSalesIdr": 22000 }
    ],
    "topExpenseCategories": []
  },
  "requestId": "req_..."
}
```

Angka mengikuti data hari ini. `lowStockItems` hanya bahan yang `qtyOnHand` ≤ `minStock` (maksimal 5). `topProducts` maksimal 5 menu lunas.

### POST `/ai/chat`

Rule-based di dalam API ini (bukan model eksternal). Kata kunci `stok`/`omset`/`promo` mengubah jawaban.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/ai/chat" \
  -d '{"message":"Menu apa yang paling laris minggu ini?"}' \
  | tee /tmp/chat.json | jq .
export CONV_ID="$(jq -r '.data.conversationId' /tmp/chat.json)"
```

**Harusnya `200`:**

```json
{
  "data": {
    "conversationId": "<uuid>",
    "message": {
      "id": "<uuid>",
      "role": "assistant",
      "text": "Omset periode ini Rp 22.000 dari menu terlaris:\n• Es Kopi Susu Gula Aren (1x)",
      "createdAt": "<iso>",
      "suggestions": ["Analisa margin menu", "Lihat dashboard"]
    }
  },
  "requestId": "req_..."
}
```

Pesan yang tidak memuat kata omset/stok/promo **harusnya** sapaan default plus saran `Stok kritis apa saja?`, `Menu apa yang paling laris?`, `Beri ide bundling`. Kirim `conversationId` yang sama agar riwayat berlanjut.

### GET `/ai/conversations/:id`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$BASE/ai/conversations/$CONV_ID" | jq .
```

**Harusnya `200`:**

```json
{
  "data": {
    "id": "<conversation-uuid>",
    "messages": [
      { "role": "user", "text": "Menu apa yang paling laris minggu ini?" },
      { "role": "assistant", "text": "Omset periode ini Rp ...", "suggestions": [] }
    ]
  },
  "requestId": "req_..."
}
```

Percakapan organisasi lain **harusnya `404`**.

### POST `/ai/conversations/:id/reset`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -X POST "$BASE/ai/conversations/$CONV_ID/reset" | jq .
```

**Harusnya `200`:** `{ "data": { "conversationId": "<uuid-baru>" } }`. Percakapan lama ditandai terhapus.

### POST `/ai/advisor`

Kompatibilitas lama. Tanpa `RAG_SERVICE_URL` server membalas mock, bukan memanggil model.

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/ai/advisor" \
  -d '{"prompt":"Bagaimana omset hari ini?","range":"today"}' | jq .
```

**Harusnya `200`** bila RAG belum dihubungkan:

```json
{
  "data": {
    "answer": "[MOCK RAG RESPONSE] Server RAG belum dihubungkan (RAG_SERVICE_URL belum diset). Berikut data context yang telah disiapkan untuk di-forward",
    "forwardPayload": {
      "organizationId": "<uuid>",
      "outletId": "<uuid>",
      "userRole": "owner",
      "planCode": "pro",
      "prompt": "Bagaimana omset hari ini?",
      "context": {}
    }
  },
  "requestId": "req_..."
}
```

Jika `RAG_SERVICE_URL` di-set dan layanan hidup, `data` adalah JSON dari `POST {RAG_SERVICE_URL}/v1/chat`. Jika layanan mati **harusnya `503`** `SERVICE_UNAVAILABLE`. Jika layanan membalas non-2xx **harusnya `502`** `BAD_GATEWAY`.

---

## 20. Laporan — `/reports`

Owner/admin atau staf `manager`/`cashier`.

### GET `/reports/sales`

Butuh `X-Outlet-Id`. Filter sama dengan `GET /sales`.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/reports/sales?from=2026-11-01&to=2026-11-30&page=1&limit=20" | jq .
```

**Harusnya `200`:** `data` array nota (bentuk item sama dengan `GET /sales`) dan `meta`.

### POST `/reports/sales/export`

Job v1 langsung `done`. Belum ada file xlsx/pdf.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  -H "Content-Type: application/json" \
  -X POST "$BASE/reports/sales/export" \
  -d '{"format":"xlsx","from":"2026-11-01","to":"2026-11-30"}' \
  | tee /tmp/job.json | jq .
export JOB_ID="$(jq -r '.data.jobId' /tmp/job.json)"
```

**Harusnya `202`:**

```json
{
  "data": { "jobId": "<uuid>", "status": "done" },
  "requestId": "req_..."
}
```

`format` hanya `xlsx` atau `pdf`.

### GET `/reports/jobs/:jobId`

```bash
curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE/reports/jobs/$JOB_ID" | jq .
```

**Harusnya `200`:**

```json
{
  "data": {
    "id": "<uuid>",
    "type": "sales_xlsx",
    "status": "done",
    "downloadUrl": null,
    "finishedAt": "<iso>"
  },
  "requestId": "req_..."
}
```

Job organisasi lain **harusnya `404`**.

### GET `/reports/stock`

ROP aktif karena paket seed `pro`. Pada `starter`/`free_trial`, `rop` selalu `null`.

```bash
curl -sS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Outlet-Id: $OUTLET_ID" \
  "$BASE/reports/stock?category=coffee_bean&page=1&limit=20" | jq .
```

**Harusnya `200`.** Bentuk satu bahan (angka stok mengikuti mutasi yang sudah Anda lakukan):

```json
{
  "data": [
    {
      "id": "<uuid>",
      "sku": "ING-BEAN-ARB",
      "name": "Biji Kopi Arabika House Blend",
      "category": "coffee_bean",
      "uom": "gram",
      "stokAwal": 15000,
      "masuk": 100,
      "keluar": 256,
      "stokAkhir": 14844,
      "minStock": 1000,
      "biayaPerSatuan": 280,
      "totalNilai": 4156320,
      "status": "ok",
      "leadTimeDays": 3,
      "dailyUsage": 36.57,
      "rop": 1109.71,
      "daysToStockout": 406,
      "reorderQty": 0,
      "supplierName": "Roastery Nusantara Bandung"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 2 },
  "requestId": "req_..."
}
```

`status` query: `ok`, `low`, `critical`, `overstock`. `stokAwal = stokAkhir - masuk + keluar` pada periode `from`–`to` (default jendela 7 hari bila tanggal dikosongkan). `reorderQty` lebih dari 0 hanya bila `stokAkhir` sudah menyentuh ROP.

---

## 21. Path yang tidak ada

```bash
curl -sS -H "X-Request-Id: req-demo" "$BASE/tidak-ada" | jq .
```

**Harusnya `404`:**

```json
{
  "error": { "code": "NOT_FOUND", "message": "Endpoint tidak ditemukan" },
  "requestId": "req-demo"
}
```

Request tanpa `Authorization: Bearer` ke route ber-`authenticate` **harusnya `401`:**

```json
{
  "error": { "code": "UNAUTHORIZED", "message": "Token otentikasi tidak ditemukan" },
  "requestId": "req_..."
}
```

---

## 22. Urutan uji yang aman untuk data demo

1. Health, meta, login.
2. Baca organisasi, outlet, gudang, billing, supplier, bahan, produk, inventori, dashboard.
3. Buka shift, buat satu penjualan POS, baca struk, tutup shift.
4. Buat gudang kedua, transfer, opname, waste hanya jika Anda siap mengubah saldo seed.
5. Jangan jalankan `change-password`, `reset-password`, `POST /me/disable`, atau `DELETE` pada user, outlet, bahan resep, dan staf Budi Santoso bila sesi berikutnya masih memakai `kasir@teratur.id` / `password123`.
