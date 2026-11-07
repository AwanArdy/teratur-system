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

## 7. Menjalankan Server Backend

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

## 8. Perintah Tambahan (Drizzle & Testing)

| Perintah | Deskripsi |
|---|---|
| `npm run db:generate` | Membuat file migrasi baru berdasarkan perubahan skema di `src/db/schema/` |
| `npm run db:migrate` | Menjalankan migrasi SQL ke database |
| `npm run db:push` | Mendorong perubahan skema langsung ke database tanpa file migrasi baru |
| `npm run db:seed` | Menjalankan script pengisian data awal (`src/db/seed.ts`) |
| `npm run db:studio` | Membuka Drizzle Studio di browser untuk melihat & mengelola data database secara visual |
| `npm test` | Menjalankan unit & integration test menggunakan Vitest |
| `npm run test-watch` | Menjalankan test dalam mode watch |
