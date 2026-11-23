# Panduan Menjalankan Backend (Teratur)

Panduan lengkap untuk mengatur dan menjalankan backend project **Teratur**, mulai dari instalasi dependensi, konfigurasi environment, persiapan database PostgreSQL, migrasi skema, seeding data awal, hingga menjalankan server development dan pengujian.

---

## 1. Prasyarat Sistem

Sebelum memulai, pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi `>= 22.0.0 < 23.0.0`
- **npm**: Versi bawaan Node.js
- **PostgreSQL**: Versi 14 atau lebih baru (baik lokal maupun via Docker)

---

## 2. Instalasi Dependensi

Jalankan perintah berikut pada direktori root project untuk menginstall seluruh dependensi yang dibutuhkan:

```bash
npm install
```

---

## 3. Konfigurasi Environment Variable

Salin file template `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Buka file `.env` lalu sesuaikan pengaturannya:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://<username>:<password>@<host>:<port>/<nama_database>
JWT_ACCESS_SECRET=ganti_dengan_random_secret_minimal_32_karakter_ya
JWT_REFRESH_SECRET=ganti_dengan_random_secret_minimal_32_karakter_ya
OTP_PEPPER=default_otp_pepper_secret
APP_TZ=Asia/Makassar
CORS_ORIGINS=http://localhost:5173
SMTP_URL=
SEED_DEMO=true
LOG_LEVEL=info
```

> **Penting**:
> - `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` wajib memiliki panjang **minimal 32 karakter**.
> - Sesuaikan `DATABASE_URL` dengan kredensial PostgreSQL Anda. Contoh: `postgres://postgres:postgres@localhost:5432/teratur`.

---

## 4. Persiapan Database PostgreSQL

### Opsi A: Menggunakan PostgreSQL Lokal

Masuk ke terminal PostgreSQL (psql) atau GUI database (DBeaver/pgAdmin), lalu buat database baru:

```sql
CREATE DATABASE teratur;
```

Atau melalui terminal:

```bash
createdb -U postgres teratur
```

### Opsi B: Menggunakan Docker (Opsional)

Jika ingin menjalankan PostgreSQL via Docker:

```bash
docker run --name teratur-postgres \
  -e POSTGRES_USER=teratur \
  -e POSTGRES_PASSWORD=teratur \
  -e POSTGRES_DB=teratur \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Jika menggunakan container di atas, konfigurasi `DATABASE_URL` pada `.env` adalah:
```env
DATABASE_URL=postgres://teratur:teratur@localhost:5432/teratur
```

---

## 5. Migrasi Skema Database

Untuk mengeksekusi file migrasi SQL yang sudah ada di direktori `drizzle/migrations/` ke database:

```bash
npm run db:migrate
```

*Alternatif jika ingin sinkronisasi langsung skema schema TypeScript ke database (development mode):*
```bash
npm run db:push
```

---

## 6. Mengisi Database (Seeding)

Jalankan script seed untuk memasukkan data awal atau demo:

```bash
npm run db:seed
```

---

## 7. Kredensial Login Akun Demo (Seed Data)

Setelah menjalankan `npm run db:seed`, database akan terisi dengan **8 Outlet**, **4 Owner** (tiap 1 owner mengelola 2 outlet), dan **16 Karyawan** (tiap outlet memiliki 2 karyawan: kasir & barista). Seluruh akun menggunakan password seragam: `password123`.

### 7.1. Akun Pemilik Usaha / Owner (4 Akun)

Setiap Owner memiliki hak akses penuh ke seluruh outlet dalam organisasinya.

| No | Nama Owner | Email | Password | Role | Organisasi | Outlet yang Dimiliki |
|---|---|---|---|---|---|---|
| 1 | Budi Santoso | `owner1@teratur.id` | `password123` | `owner` | Kopi Teratur | • Kopi Teratur - Braga<br>• Kopi Teratur - Dago |
| 2 | Hendra Wijaya | `owner2@teratur.id` | `password123` | `owner` | Seduh Selaras | • Seduh Selaras - Senopati<br>• Seduh Selaras - Kemang |
| 3 | Anisa Rahmawati | `owner3@teratur.id` | `password123` | `owner` | Rasa Kembara | • Rasa Kembara - Malioboro<br>• Rasa Kembara - Prawirotaman |
| 4 | I Made Sukadana | `owner4@teratur.id` | `password123` | `owner` | Nusa Rasa Hospitality | • Nusa Rasa - Ubud<br>• Nusa Rasa - Canggu |

### 7.2. Akun Karyawan / Staff Operasional (16 Akun)

Setiap Karyawan ditugaskan secara spesifik pada 1 outlet (login dibatasi hanya untuk outlet penugasannya).

| No | Organisasi | Outlet Penugasan | Nama Karyawan | Email | Password | Peran / Jabatan | Shift |
|---|---|---|---|---|---|---|---|
| 1 | Kopi Teratur | Kopi Teratur - Braga | Agus Pratama | `kasir.braga@teratur.id` | `password123` | Kasir (`cashier`) | Pagi |
| 2 | Kopi Teratur | Kopi Teratur - Braga | Dewi Lestari | `barista.braga@teratur.id` | `password123` | Barista (`barista`) | Sore |
| 3 | Kopi Teratur | Kopi Teratur - Dago | Fajar Hidayat | `kasir.dago@teratur.id` | `password123` | Kasir (`cashier`) | Pagi |
| 4 | Kopi Teratur | Kopi Teratur - Dago | Rina Anggraini | `barista.dago@teratur.id` | `password123` | Barista (`barista`) | Sore |
| 5 | Seduh Selaras | Seduh Selaras - Senopati | Dimas Setiawan | `kasir.senopati@teratur.id` | `password123` | Kasir (`cashier`) | Pagi |
| 6 | Seduh Selaras | Seduh Selaras - Senopati | Maya Putri | `barista.senopati@teratur.id` | `password123` | Barista (`barista`) | Sore |
| 7 | Seduh Selaras | Seduh Selaras - Kemang | Rizky Ramadhan | `kasir.kemang@teratur.id` | `password123` | Kasir (`cashier`) | Pagi |
| 8 | Seduh Selaras | Seduh Selaras - Kemang | Sarah Nabila | `barista.kemang@teratur.id` | `password123` | Barista (`barista`) | Sore |
| 9 | Rasa Kembara | Rasa Kembara - Malioboro | Eko Prasetyo | `kasir.malioboro@teratur.id` | `password123` | Kasir (`cashier`) | Pagi |
| 10 | Rasa Kembara | Rasa Kembara - Malioboro | Sri Wahyuni | `barista.malioboro@teratur.id` | `password123` | Barista (`barista`) | Sore |
| 11 | Rasa Kembara | Rasa Kembara - Prawirotaman | Bayu Nugroho | `kasir.prawirotaman@teratur.id` | `password123` | Kasir (`cashier`) | Pagi |
| 12 | Rasa Kembara | Rasa Kembara - Prawirotaman | Tari Wulandari | `barista.prawirotaman@teratur.id` | `password123` | Barista (`barista`) | Sore |
| 13 | Nusa Rasa Hospitality | Nusa Rasa - Ubud | Wayan Darma | `kasir.ubud@teratur.id` | `password123` | Kasir (`cashier`) | Pagi |
| 14 | Nusa Rasa Hospitality | Nusa Rasa - Ubud | Ni Kadek Ayu | `barista.ubud@teratur.id` | `password123` | Barista (`barista`) | Sore |
| 15 | Nusa Rasa Hospitality | Nusa Rasa - Canggu | Ketut Adi | `kasir.canggu@teratur.id` | `password123` | Kasir (`cashier`) | Pagi |
| 16 | Nusa Rasa Hospitality | Nusa Rasa - Canggu | Ni Luh Putu | `barista.canggu@teratur.id` | `password123` | Barista (`barista`) | Sore |

### 7.3. Ringkasan Menu Tiap Outlet (Menu Berbeda per Outlet)

Setiap outlet memiliki variasi menu minuman signature/racikan (dengan resep BOM dan bahan baku unik) serta pastry/snack yang berbeda:

1. **Kopi Teratur - Braga (Bandung)**
   - *Signature & Kopi*: Es Kopi Susu Braga (Rp 22.000), Braga Cold Brew Heritage 1L (Rp 85.000), Piccolo Heritage Braga (Rp 26.000)
   - *Pastry & Bakery*: Croissant Butter Malabar (Rp 24.000), Toast Roti Srikaya Klasik (Rp 18.000)
2. **Kopi Teratur - Dago (Bandung)**
   - *Specialty & Fusion*: Dago Mountain Latte (Rp 28.000), Uji Matcha Espresso Dago (Rp 32.000), Iced Black Coffee Dago (Rp 20.000)
   - *Pastry & Bakery*: Pain au Chocolat Dago (Rp 27.000), Salted Caramel Fudge Brownie (Rp 25.000)
3. **Seduh Selaras - Senopati (Jakarta)**
   - *Signature & Espresso*: Spanish Latte Senopati (Rp 35.000), Salted Caramel Macchiato Senopati (Rp 38.000), Velvet Flat White Senopati (Rp 33.000)
   - *Artisan Pastry*: Truffle Mushroom Croissant (Rp 38.000), Cinnamon Roll Senopati Glaze (Rp 28.000)
4. **Seduh Selaras - Kemang (Jakarta)**
   - *Plant-Based & Tea*: Kemang Oat Pandan Latte (Rp 36.000), Wild Berry Iced Tea Kemang (Rp 28.000), Earl Grey Milk Tea Macchiato (Rp 30.000)
   - *Pastry & Snack*: Strawberry Cream Cheese Danish (Rp 32.000), Truffle Parmesan Potato Wedges (Rp 30.000)
5. **Rasa Kembara - Malioboro (Yogyakarta)**
   - *Tradisional & Signature*: Kopi Joss Aren Merapi (Rp 18.000), Es Kopi Klepon Malioboro (Rp 22.000), Teh Tarik Malioboro Klasik (Rp 16.000)
   - *Kudapan Tradisional*: Bakpia Crispy Kacang Hijau (Rp 15.000), Singkong Keju Merekah Malioboro (Rp 14.000)
6. **Rasa Kembara - Prawirotaman (Yogyakarta)**
   - *Manual Brew & Fizz*: Manual Brew V60 Arabika Menoreh (Rp 25.000), Cascara Honey Sparkle Prawiro (Rp 22.000), Iced Hazelnut Menoreh Latte (Rp 26.000)
   - *Bakery & Snack*: Banana Bread Slice Prawirotaman (Rp 18.000), Almond Fruit Tart Prawirotaman (Rp 22.000)
7. **Nusa Rasa - Ubud (Bali)**
   - *Botanical & Wellness*: Golden Turmeric Botanical Latte (Rp 32.000), Coconut Cold Brew Kintamani (Rp 35.000), Butterfly Pea Flower Tea Ubud (Rp 24.000)
   - *Healthy Brunch*: Tropical Dragonfruit Chia Bowl (Rp 45.000), Ubud Avocado Sourdough Toast (Rp 40.000)
8. **Nusa Rasa - Canggu (Bali)**
   - *Coastal Specialty*: Sea Salt Toffee Flat White Canggu (Rp 38.000), Canggu Iced Dark Chocolate 70% (Rp 34.000), Canggu Double Espresso on the Rock (Rp 26.000)
   - *Coastal Bakery*: Maple Glaze Butter Croffle (Rp 30.000), Smoked Beef Cream Cheese Bagel (Rp 48.000)

### 7.4. Contoh Pengujian Login via cURL

Contoh login sebagai Owner 1:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner1@teratur.id",
    "password": "password123",
    "rememberMe": false
  }'
```

Contoh login sebagai Karyawan Kasir Outlet Braga:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kasir.braga@teratur.id",
    "password": "password123",
    "rememberMe": false
  }'
```

---

## 8. Menjalankan Server Backend

### Mode Development (dengan hot-reload):
```bash
npm run dev
```
Server akan berjalan di `http://localhost:3000` (atau sesuai konfigurasi `PORT` di `.env`).

### Mode Produksi (Build & Run):
```bash
npm run build
npm start
```

---

## 9. Perintah Tambahan (Drizzle & Testing)

| Perintah | Deskripsi |
|---|---|
| `npm run db:generate` | Membuat file migrasi baru berdasarkan perubahan skema di `src/db/schema/` |
| `npm run db:migrate` | Menjalankan migrasi SQL ke database |
| `npm run db:push` | Mendorong perubahan skema langsung ke database tanpa file migrasi baru |
| `npm run db:seed` | Menjalankan script pengisian data awal (`src/db/seed.ts`) |
| `npm run db:studio` | Membuka Drizzle Studio di browser untuk melihat & mengelola data database secara visual |
| `npm test` | Menjalankan unit & integration test menggunakan Vitest |
| `npm run test-watch` | Menjalankan test dalam mode watch |
