# PRD — TERATUR.id

**Product Requirements Document**

| Item | Keterangan |
|---|---|
| Produk | TERATUR.id — POS, Smart Inventory & Financial Report untuk bisnis F&B/UMKM |
| Jenis | Aplikasi web SaaS (responsive: desktop, tablet, mobile) |
| Versi dokumen | 1.0 |
| Tanggal | 25 November 2026 |
| Sumber | Audit langsung kode frontend `teratur/frontend` |
| Status | Living document — perlu validasi Product & Engineering |
| Bahasa produk | Indonesia |

> Dokumen ini disusun **dari implementasi frontend yang ada**, bukan dari dokumen bisnis terpisah. Bagian yang masih berupa mock/demo ditandai eksplisit agar tidak dianggap fitur final.

---

## 1. Ringkasan Produk

TERATUR.id adalah aplikasi manajemen operasional berbasis web untuk bisnis F&B (coffee shop, restoran, bakery, retail makanan) yang menggabungkan:

1. **Kasir/POS** — transaksi penjualan, shift kasir, dan struk.
2. **Smart Inventory** — stok bahan baku, resep/BOM, auto stock deduction, transfer gudang, stock opname, dan waste control.
3. **HPP & Profitabilitas** — kalkulasi HPP per resep, margin per menu, dan analisis laba kotor.
4. **Keuangan** — pencatatan pengeluaran (manual & AI OCR struk), laporan transaksi, laporan stok, dan export.
5. **SDM** — data staf, shift/handover kasir, roster, performa, dan payroll.
6. **AI Assistant** — analisis omset, stok kritis, efisiensi HPP, ide bundling, dan pemindaian struk.
7. **Langganan** — paket bisnis, kuota outlet/AI, dan riwayat faktur.

Nama **TERATUR** menjadi janji produk: operasional yang rapi, terukur, dan terkontrol.

---

## 2. Latar Belakang & Masalah

Pemilik usaha F&B skala kecil–menengah umumnya menghadapi masalah berikut:

| Masalah | Dampak |
|---|---|
| Stok bahan baku dicatat manual / tidak real-time | Kehabisan bahan saat jam sibuk, atau overstock dan expired |
| HPP resep tidak diketahui | Harga jual asal-asalan, margin tipis tanpa disadari |
| Waste dan selisih opname tidak tercatat | Kebocoran biaya tidak terdeteksi |
| Rekap transaksi dan pengeluaran terpisah | Laba bersih tidak akurat, sulit ambil keputusan |
| Shift kasir dan uang laci tidak terkontrol | Risiko selisih kas dan fraud |
| Multi-outlet tidak terpantau | Pemilik tidak punya gambaran performa lintas cabang |

TERATUR.id menjawabnya dengan satu alur: **bahan baku → resep/HPP → transaksi kasir → stok terpotong otomatis → laporan & laba bersih**.

---

## 3. Tujuan Produk

### 3.1 Tujuan

1. Memungkinkan pemilik usaha mengetahui **omset, HPP, laba bersih, dan stok kritis** dalam satu dashboard.
2. Menghubungkan **resep menu ke bahan baku** sehingga stok terpotong otomatis per transaksi.
3. Memberi peringatan dini **Just-In-Time (JIT)** dan **Re-Order Point (ROP)** sebelum stok habis.
4. Menekan **food waste** dan mendeteksi selisih stok/kas.
5. Menyediakan laporan yang bisa **diexport** untuk pembukuan.
6. Menjaga pengalaman yang **cepat, rapi, dan bisa dipakai di mobile**.

### 3.2 Non-Goals (untuk fase saat ini)

- Bukan sistem akuntansi penuh (jurnal umum, neraca, pajak).
- Bukan aplikasi payroll lengkap dengan perhitungan PPh/BPJS.
- Bukan e-commerce / marketplace.
- Bukan aplikasi offline-first penuh (meski narasi marketing menyebut offline-first).
- Bukan pengganti mesin kasir fisik; fokus pada perangkat lunak.

---

## 4. Target Pengguna & Persona

| Persona | Peran | Kebutuhan utama | Frekuensi |
|---|---|---|---|
| **Owner / Pemilik** | Pemilik 1–5 outlet | Omset, laba bersih, stok kritis, perbandingan outlet | Harian |
| **Store Manager** | Penanggung jawab outlet | Master data, pengeluaran, opname, approval | Harian |
| **Kasir / Barista** | Operator POS | Transaksi cepat, buka/tutup shift, cetak struk | Setiap transaksi |
| **Admin / Finance** | Pembukuan | Pengeluaran, laporan, export, rekonsiliasi | Harian/mingguan |
| **Calon Pelanggan** | Pengunjung website | Memahami fitur, harga, simulasi, dan mendaftar | Sekali |

**Asumsi peran & akses:** kode frontend belum menerapkan RBAC granular. Semua pengguna yang login dapat mengakses seluruh menu dashboard. Pembatasan per role perlu ditambahkan di backend dan route guard frontend.

---

## 5. Metrik Keberhasilan

| Kategori | Metrik | Target awal |
|---|---|---|
| Aktivasi | Registrasi selesai → transaksi pertama | ≤ 1 hari |
| Adopsi | Outlet yang mengisi resep/HPP | ≥ 60% dalam 7 hari |
| Operasional | Akurasi stok (opname vs sistem) | ≥ 98% |
| Efisiensi | Food waste ratio | ≤ 1,5% dari omset |
| Profitabilitas | Rasio HPP | ≤ 40% (sehat) |
| Retensi | Owner aktif mingguan (WAU) | ≥ 40% D30 |
| Engagement | Penggunaan AI/OCR struk | ≥ 30% outlet per bulan |
| Performa | LCP halaman utama | ≤ 2,5 detik |
| Kualitas | Error rate API dari frontend | < 1% request |

---

## 6. Ruang Lingkup

### 6.1 Modul & Status Implementasi

| # | Modul | Status frontend | Prioritas |
|---|---|---|---|
| 1 | Landing page & halaman publik | Implemented (statis) | P0 |
| 2 | Auth: login, register 3 langkah, OTP, reset | Implemented (API) | P0 |
| 3 | Dashboard analytics | Implemented (API) | P0 |
| 4 | Master bahan baku | Implemented (API + fallback lokal) | P0 |
| 5 | Master produk & resep/HPP | Partial (create API, list fallback) | P0 |
| 6 | Master inventory | Implemented (API + fallback) | P0 |
| 7 | Master supplier | Partial (read API, CRUD lokal) | P1 |
| 8 | Master gudang | Mock / lokal | P1 |
| 9 | Persediaan: transfer, opname, waste | Implemented (API + fallback) | P0 |
| 10 | Pengeluaran + AI OCR struk | Implemented (API + simulasi OCR) | P0 |
| 11 | POS / kasir | **Belum ada layar kasir** (baru marketing + hook) | P0 |
| 12 | Laporan transaksi & stok | Implemented (API + mock fallback) | P0 |
| 13 | Karyawan, shift, roster, payroll | Partial (API + mock) | P1 |
| 14 | Billing & langganan | Partial (UI statis + read API) | P1 |
| 15 | Profil, keamanan, notifikasi | Partial (API + lokal) | P1 |
| 16 | AI Assistant | Implemented (API + fallback demo) | P1 |
| 17 | Pusat bantuan | Implemented (statis) | P2 |
| 18 | Export laporan | Simulasi UI (belum wire ke API) | P1 |

### 6.2 Platform

- Browser modern: Chrome, Edge, Safari, Firefox versi terbaru.
- Responsive: mobile ≥ 360px, tablet, desktop.
- Bahasa: Indonesia.
- Zona waktu default: `Asia/Makassar` (WITA).

---

## 7. Peta Informasi & Rute

### 7.1 Halaman Publik

| Rute | Halaman | Layout |
|---|---|---|
| `/` | Landing page | `UsersLayout` |
| `/layanan/pos` | Halaman marketing POS | `UsersLayout` |
| `/layanan/inventaris` | Halaman marketing Inventaris | `UsersLayout` |
| `/hardware` | Katalog hardware POS | `UsersLayout` |
| `/blog` | Daftar artikel | `UsersLayout` |
| `/blog/:id` | Detail artikel | `UsersLayout` |
| `/bantuan` | FAQ publik | `UsersLayout` |
| `/kontak` | Kontak & form | `UsersLayout` |
| `/kebijakan-privasi` | Privacy policy | `UsersLayout` |
| `/syarat-ketentuan` | Terms | `UsersLayout` |

### 7.2 Auth

| Rute | Halaman | Layout |
|---|---|---|
| `/auth/login` | Login owner | `AuthLayout` |
| `/auth/register` | Registrasi 3 langkah | `AuthLayout` |

### 7.3 Dashboard

| Rute | Halaman | Status |
|---|---|---|
| `/dashboard` | Dashboard analytics | Implemented |
| `/dashboard/master-data` | Pemilihan sub-menu master data | Implemented |
| `/dashboard/master-data/bahan-baku` | Master bahan baku | Implemented |
| `/dashboard/master-data/produk` | Master produk, resep, HPP | Implemented |
| `/dashboard/master-data/inventory` | Master persediaan | Implemented |
| `/dashboard/master-data/suppliers` | Master supplier | Partial |
| `/dashboard/master-data/warehouses` | Master gudang | Mock |
| `/dashboard/persediaan` | Transfer, opname, waste | Implemented |
| `/dashboard/pengeluaran` | Buku kas & AI OCR | Implemented |
| `/dashboard/karyawan` | Staf, shift, roster, payroll | Partial |
| `/dashboard/laporan-transaksi` | Laporan penjualan | Implemented |
| `/dashboard/laporan-stok` | Laporan stok & ROP | Implemented |
| `/dashboard/billing` | Paket & tagihan | Partial |
| `/dashboard/profile` | Profil & keamanan | Partial |
| `/dashboard/chat-ai` | AI assistant | Implemented |
| `/dashboard/pusat-bantuan` | Pusat bantuan | Implemented |

**Rute yang didefinisikan di `ROUTES` tetapi belum terdaftar di router:** `/dashboard/transactions`, `/dashboard/menu`, `/dashboard/inventory`, `/dashboard/reports`, `/dashboard/settings`. Perlu dihapus atau diimplementasikan agar tidak menimbulkan link mati.

---

## 8. Kebutuhan Fungsional

### FR-01 — Landing Page & Halaman Publik

**Tujuan:** menjelaskan nilai produk, membangun kepercayaan, dan mengarahkan ke registrasi/demo.

**Fitur:**
- Hero dengan headline, 4 poin nilai, CTA "Coba Simulator Kasir" dan "Daftar Akun Baru".
- Slider fitur unggulan: Master Bahan & HPP, Auto Stock Deduction, Waste & Fraud Control.
- Alur 3 langkah: input bahan & resep → transaksi & auto deduct → pantau net profit & JIT.
- **Simulasi kasir interaktif**: klik menu, stok bahan berkurang, log transaksi, reset simulasi.
- Section laporan keuangan & profit.
- Pricing 3 paket: Starter, Pro, Enterprise.
- FAQ, pre-footer, CTA, footer dengan newsletter.
- Navbar sticky dengan anchor ke section, halaman POS, Hardware, Blog, Bantuan, Kontak.
- SEO per halaman melalui komponen `Seo` (title, description, canonical, OG, Twitter, `noIndex`).

**Aturan:**
- Simulasi kasir hanya demo lokal, tidak memanggil API.
- Semua CTA registrasi mengarah ke `/auth/register`; CTA Enterprise ke `/kontak`.
- Link `#simulasi`, `#master`, `#inventory`, `#laporan`, `#pricing`, `#faq` harus smooth-scroll.

**Definition of Done:**
- [ ] Semua section tampil di mobile & desktop tanpa horizontal overflow.
- [ ] Anchor scroll bekerja dari navbar dan dari halaman lain.
- [ ] Meta SEO terisi dan canonical benar.
- [ ] Simulasi kasir bisa di-reset dan tidak error saat stok habis.

---

### FR-02 — Autentikasi & Onboarding

**Tujuan:** pengguna dapat membuat akun, memverifikasi email, melengkapi data bisnis, dan masuk ke dashboard.

**Alur registrasi (3 langkah):**
1. **Akun** — nama lengkap, email, telepon, password, konfirmasi password, indikator kekuatan password.
2. **OTP** — 6 digit, auto-focus antar input, kirim ulang OTP.
3. **Bisnis** — nama bisnis, tipe bisnis (`restaurant`/`retail`/`service`), negara, provinsi, kota, pilihan plan, setuju syarat & ketentuan.

**Login:**
- Email + password, show/hide password, "Ingat saya 30 hari".
- Kotak akun demo owner (saat ini hardcoded `owner1@teratur.id` / `password123`).
- Redirect ke `/dashboard` setelah sukses.
- Error ditampilkan via toast.

**Aturan:**
- Password minimal 8 karakter.
- Token disimpan di `localStorage`: access token, refresh token, user, organization, outlet, subscription, active outlet.
- Interceptor Axios menyisipkan `Authorization: Bearer <token>` dan `X-Outlet-Id`.
- Pada 401, frontend mencoba refresh token sekali; jika gagal, sesi dibersihkan dan diarahkan ke login.
- Endpoint: `/auth/login`, `/auth/register`, `/auth/otp/verify`, `/auth/otp/resend`, `/auth/register/complete`, `/auth/logout`, `/auth/refresh`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password`, `/me`.

**Definition of Done:**
- [ ] Registrasi 3 langkah berhasil end-to-end dan menyimpan sesi.
- [ ] OTP salah menampilkan pesan yang jelas.
- [ ] Refresh token tidak menyebabkan infinite loop.
- [ ] Link "Lupa password" mengarah ke halaman yang benar (saat ini mengarah ke `/forgot-password` yang belum terdaftar).

---

### FR-03 — Dashboard Analytics

**Tujuan:** memberi ringkasan bisnis dan operasional dalam satu layar.

**Fitur:**
- Filter periode: hari ini, kemarin, minggu, bulan.
- Status outlet aktif dan status shift aktif.
- Tombol refresh data.
- 4 KPI utama:
  1. Total omset penjualan + jumlah transaksi + tren %.
  2. Total COGS/HPP + rasio HPP + tren.
  3. Nett profit + margin bersih + tren.
  4. Stok kritis + nilai waste + rasio waste.
- Grafik batang 3 seri: omset (biru), HPP (kuning), nett profit (hijau).
- Ringkasan finansial: omset kotor, diskon, omset net, rasio HPP, nett profit.
- Peringatan stok menipis (JIT) dengan supplier, burn rate, stok saat ini, min. stok, aksi PO/reorder.
- Ringkasan food waste dan tombol "Catat Bahan Waste / Rusak" (modal).
- Tabel performa menu: terlaris vs margin tertinggi; kolom terjual, harga jual, HPP, margin, laba kotor.
- Live stream transaksi terbaru.
- Shortcut ke Master Data dan Persediaan.

**Aturan bisnis:**
- Rasio HPP ≤ 40% = sehat; 41–55% = normal; > 55% = perlu perhatian.
- Waste ratio ≤ 1,5% = terkontrol; di atas itu = perlu perhatian.
- Modal waste mengirim `POST /wastes` dengan `itemType: ingredient`, `itemId`, `qty`, `uom`, `reason` (`expired`/`damaged`/`trial_fail`/`lost`), dan opsional catatan.
- Data dari `GET /dashboard?range=...&outletId=...`.

**Definition of Done:**
- [ ] Loading, error, dan empty state tampil benar.
- [ ] Angka KPI dan grafik berubah saat filter periode diganti.
- [ ] Waste tersimpan dan dashboard ter-refresh.
- [ ] Tidak ada `NaN`/`Infinity` saat data kosong.

---

### FR-04 — Master Bahan Baku

**Tujuan:** mengelola bahan mentah, satuan, harga beli, stok minimum, supplier, dan lead time.

**Fitur:**
- Tabel bahan baku dengan pencarian dan filter kategori.
- Kategori: dairy, biji kopi, sirup/pemanis, kemasan, bubuk flavor, lainnya.
- Satuan: ml, gram, kg, pcs, liter, botol, karton, pouch, pack, orang, bulan.
- CRUD: tambah, edit, hapus (dengan konfirmasi).
- Kolom: SKU, nama, kategori, satuan, harga beli, stok minimum, supplier, status.
- Fallback data lokal bila API kosong/offline.

**API:** `GET/POST /ingredients`, `PATCH/DELETE /ingredients/:id`, `GET /suppliers`.

**Definition of Done:**
- [ ] Tambah/edit/hapus memanggil API dan meng-invalidate cache `ingredients` + `inventory`.
- [ ] Validasi field wajib dan angka tidak negatif.
- [ ] Pencarian dan filter bekerja bersamaan.

---

### FR-05 — Master Produk, Resep & HPP

**Tujuan:** menghubungkan menu dengan resep bahan baku dan menghitung HPP/margin otomatis.

**Fitur:**
- Form produk: nama menu, kategori, SKU (bisa generate otomatis), harga jual, jenis produk (`made_to_order`, `finished_good`, `pre_order`).
- Builder resep: pilih bahan, qty, satuan; tambah/hapus baris; subtotal per bahan.
- Kalkulasi HPP berjalan: total qty × biaya bahan.
- Margin: laba, persentase, label dan warna:
  - ≥ 40% = "Margin Sehat" (hijau)
  - 20–39,99% = "Margin Tipis" (kuning)
  - < 20% = "Margin Rendah" (merah)
  - < 0% = "Rugi" (merah)
- Daftar produk: KPI total menu & rata-rata margin, pencarian, filter kategori, modal detail resep, edit, hapus.
- Preview HPP melalui `POST /products/preview-hpp` (hook tersedia).

**Aturan:**
- SKU harus unik.
- Harga jual > 0.
- Resep minimal 1 baris untuk produk `made_to_order`.
- Produk nonaktif tidak tampil di POS.

**API:** `GET/POST /products`, `GET/PATCH/DELETE /products/:id`, `POST /products/preview-hpp`.

**Catatan implementasi:** saat data API tersedia, daftar produk masih memakai HPP estimasi 35% dari harga jual dan detail resep placeholder. Perlu diganti dengan data HPP/resep sebenarnya dari API.

**Definition of Done:**
- [ ] Simpan produk + resep berhasil dan muncul di daftar.
- [ ] Perubahan harga/resep langsung memperbarui HPP & margin.
- [ ] Modal detail resep menampilkan komponen dan biaya yang benar.

---

### FR-06 — Master Persediaan

**Tujuan:** memantau stok fisik, stok tersedia, minimum, lokasi gudang, dan riwayat mutasi.

**Fitur:**
- Tabel inventory: SKU, nama, tipe (`ingredient`/`finished_good`), gudang, stok fisik, stok tersedia, stok minimum, satuan, status.
- Status: Aman, Menipis, Kritis/Habis.
- Filter tipe dan pencarian.
- Penyesuaian stok masuk/keluar (`POST /inventory/adjustments`).
- Riwayat mutasi per item (`GET /inventory/:itemType/:itemId/movements`).
- Fallback data lokal.

**Aturan:**
- Status "Kritis/Habis" jika `qtyOnHand = 0`; "Menipis" jika `qtyOnHand ≤ minStock`.
- Penyesuaian wajib menyertakan arah (`in`/`out`), qty, dan item.

**Definition of Done:**
- [ ] Penyesuaian stok memperbarui tabel dan dashboard.
- [ ] Riwayat mutasi tampil untuk item yang dipilih.
- [ ] Tidak ada stok negatif.

---

### FR-07 — Master Supplier

**Tujuan:** mengelola vendor, PIC, kontak, kategori, lead time, dan termin pembayaran.

**Fitur:**
- Daftar supplier dengan pencarian dan filter kategori.
- Kolom: nama, PIC, telepon, email, alamat, kategori, lead time, termin, status, catatan.
- Tambah/edit/hapus (saat ini lokal).
- Data awal dari `GET /suppliers` bila tersedia.

**Gap:** belum ada hook `POST/PATCH/DELETE /suppliers`; operasi CRUD belum persisten ke backend.

**Definition of Done:**
- [ ] CRUD supplier terhubung ke API.
- [ ] Lead time supplier dipakai oleh perhitungan ROP.

---

### FR-08 — Master Gudang

**Tujuan:** mengelola lokasi penyimpanan dan kapasitas.

**Fitur:**
- Kartu/tabel gudang: nama, kode, tipe (dry storage, cold storage/chiller, front bar, packaging), lokasi, PIC, suhu, kapasitas terpakai, jumlah SKU, status.
- Tambah/edit/hapus (lokal).

**Gap:** belum terhubung ke hook `useWarehouses`/`useCreateWarehouse` yang sudah tersedia. Perlu di-wire ke `GET/POST /outlets/:outletId/warehouses` dan `PATCH /warehouses/:id`.

**Definition of Done:**
- [ ] CRUD gudang persisten ke API.
- [ ] Kapasitas dan jumlah SKU dihitung dari data inventory.

---

### FR-09 — Operasi Persediaan: Transfer, Opname, Waste

**Tujuan:** mengontrol perpindahan stok, mencocokkan stok fisik, dan mencatat kerugian.

**Tab Transfer:**
- Daftar transfer: no. transfer, waktu, gudang asal/tujuan, barang, qty, satuan, petugas, status (`Selesai`, `Dalam Pengiriman`, `Dibatalkan`).
- Buat transfer: gudang asal, gudang tujuan, catatan, lines (item, qty, uom).
- Aksi receive/cancel.
- Idempotency key pada create.

**Tab Opname:**
- Daftar opname: tanggal, kode barang, nama, stok sistem, stok fisik, selisih, satuan, keterangan, petugas, status (`Disetujui`, `Pending Review`).
- Buat opname: item, qty fisik, uom, catatan.
- Approve/reject.

**Tab Waste:**
- Daftar waste: tanggal, barang, qty, satuan, alasan (kadaluwarsa, rusak/pecah, trial/gagal, hilang), kerugian Rp, petugas.
- Catat waste baru.

**Aturan:**
- Selisih = stok fisik − stok sistem.
- Opname yang disetujui menyesuaikan stok dan memicu invalidasi dashboard/inventory.
- Waste memotong stok dan mencatat loss.

**API:** `/transfers`, `/transfers/:id`, `/transfers/:id/receive`, `/transfers/:id/cancel`, `/opnames`, `/opnames/:id/approve`, `/opnames/:id/reject`, `/wastes`.

**Definition of Done:**
- [ ] Ketiga tab dapat membuat data baru dan status berubah sesuai aksi.
- [ ] Angka selisih dan kerugian benar.
- [ ] Aksi approve/receive meng-invalidate data terkait.

---

### FR-10 — Pengeluaran & AI OCR Struk

**Tujuan:** mencatat pembelian bahan, kemasan, operasional, gaji, utilitas, peralatan, transportasi, dan lain-lain; mempercepat input lewat foto struk.

**Fitur manual:**
- Form: tanggal, nama barang, kategori, qty, satuan, harga satuan, supplier, metode bayar, status bayar, catatan, `countedInCogs`.
- Kategori: bahan baku, kemasan, operasional, gaji, utilitas, peralatan, transportasi, lain-lain.
- Metode bayar: tunai, transfer bank, QRIS, kartu debit.
- Status bayar: lunas, belum bayar, kredit.
- Ringkasan: total hari ini, jumlah transaksi hari ini, total kemarin, total belum dibayar.
- Filter tanggal: hari ini, kemarin, semua.
- Edit/hapus.

**Fitur AI OCR (human-in-the-loop):**
1. Pilih/upload foto struk.
2. Simulasi scanning.
3. Tampilkan hasil ekstraksi: merchant, tanggal, item, qty, satuan, harga satuan, total, metode bayar, nomor struk, confidence.
4. Kasir **wajib memverifikasi** sebelum menyimpan.
5. Simpan dengan `inputMethod: AI_RECEIPT`, `receiptImageUrl`, `receiptConfidence`, `receiptNumber`.

**Aturan:**
- Total = qty × harga satuan (dihitung).
- Pengeluaran dengan `countedInCogs` memengaruhi COGS.
- AI tidak boleh menyimpan otomatis tanpa konfirmasi manusia.

**API:** `GET/POST /expenses`, `GET/PATCH/DELETE /expenses/:id`, `GET /expenses/summary`.

**Gap:** OCR masih simulasi di frontend; belum ada endpoint upload/scan struk yang dipanggil. Perlu endpoint backend + penyimpanan file.

**Definition of Done:**
- [ ] Pengeluaran manual tersimpan dan ringkasan berubah.
- [ ] Alur AI OCR tidak bisa menyimpan sebelum verifikasi.
- [ ] File struk tersimpan dan bisa dilihat kembali.

---

### FR-11 — POS / Kasir

**Tujuan:** memproses penjualan, memotong stok sesuai resep, dan mencetak struk.

**Status:** **belum ada layar kasir di dashboard.** Yang tersedia:
- Halaman marketing `/layanan/pos`.
- Simulasi kasir di landing page.
- Hook `usePos`: `GET /pos/menu`, `GET /pos/active-shift`, `POST /pos/sales`, `GET /pos/receipt/:saleId`.
- Hook `useSales`: `GET /sales`, `POST /sales`, `POST /sales/:id/cancel`.
- Hook `useShifts`: buka/tutup shift.

**Kebutuhan minimum layar kasir:**
- Grid menu + pencarian/kategori.
- Keranjang: qty, diskon, pajak, total.
- Pilih tipe pesanan: dine-in, takeaway, delivery.
- Pilih metode bayar: tunai, QRIS, debit, transfer.
- Validasi shift aktif sebelum transaksi.
- Simpan transaksi dengan idempotency key.
- Tampilkan struk dan tombol cetak.
- Auto stock deduction terjadi di backend berdasarkan resep.
- Handling stok tidak cukup.

**Definition of Done:**
- [ ] Kasir tidak bisa transaksi tanpa shift aktif.
- [ ] Transaksi berhasil memotong stok dan muncul di laporan.
- [ ] Struk dapat dilihat/dicetak.
- [ ] Double-click tidak membuat transaksi ganda.

---

### FR-12 — Laporan Transaksi & Stok

**Tujuan:** menyediakan laporan operasional dan finansial yang dapat difilter dan diexport.

**Laporan Transaksi:**
- Ringkasan: total penjualan, jumlah transaksi, rata-rata transaksi, total item terjual.
- Filter: pencarian, metode bayar, tipe pesanan, status, rentang tanggal.
- Tabel: no. nota, waktu, kasir & outlet, tipe pesanan, metode bayar, item, total, status, aksi.
- Detail transaksi (modal) + cetak.
- Export Excel/CSV/PDF.

**Laporan Stok:**
- Ringkasan: total nilai stok, jumlah SKU, item menipis, item kritis, item overstock.
- Tab: Semua, Perlu Re-Order (ROP), Mutasi.
- Kolom: barang & kode, kategori, stok awal, masuk, keluar, stok akhir, min. stok, biaya per satuan, total nilai, status, lead time, pemakaian harian, ROP, hari menuju habis, rekomendasi reorder, supplier.
- Progress bar sisa stok.
- Export.

**Aturan:**
- ROP = stok minimum + (pemakaian harian × lead time).
- Status: Aman, Menipis, Kritis, Overstock.
- Export minimal format `.xlsx` dan `.pdf`.

**API:** `GET /reports/sales`, `GET /reports/stock`, `POST /reports/sales/export`, `GET /reports/jobs/:jobId`.

**Gap:** modal export masih simulasi (`setTimeout`) dan belum memanggil `useExportSales`/`useExportJob`.

**Definition of Done:**
- [ ] Filter mengubah data tabel dan ringkasan.
- [ ] Export benar-benar menghasilkan file dari backend.
- [ ] Status job export ditampilkan (progress/selesai/gagal).

---

### FR-13 — Karyawan, Shift, Roster, Performa, Payroll

**Tujuan:** mengelola staf dan akuntabilitas kasir.

**Tab:**
1. **Daftar Staf** — nama, role, kontak, status kerja, tanggal masuk, gaji pokok, tunjangan, shift saat ini, total penjualan ditangani, total transaksi, rating.
2. **Shift & Kasir Handover** — tanggal, shift, kasir, kas awal, penjualan tunai, penjualan QRIS, kas fisik, selisih, catatan, status.
3. **Jadwal Kerja (Roster)** — grid hari × staf/shift.
4. **Performa & KPI** — penjualan, transaksi, rating, kontribusi.
5. **Payroll & Insentif** — periode, gaji pokok, bonus, potongan, total net.

**Role staf:** store manager, head barista, barista, cashier, cook, helper.
**Tipe kerja:** full-time, part-time, kontrak.

**API:** `GET/POST /staff`, `GET/PATCH/DELETE /staff/:id`, `GET /shifts`, `GET /shifts/active`, `POST /shifts/open`, `POST /shifts/close`, `POST /shifts/:id/close`, `GET/POST /payroll`.

**Aturan shift:**
- Hanya satu shift aktif per outlet.
- Tutup shift menghitung expected cash vs kas fisik dan selisih.
- Selisih ≠ 0 harus diberi catatan.

**Gap:** roster, performance, dan sebagian payroll masih mock; endpoint Phase 2 disebut mengembalikan `501 NOT_IMPLEMENTED`.

**Definition of Done:**
- [ ] CRUD staf persisten.
- [ ] Buka/tutup shift berhasil dan selisih terhitung.
- [ ] Payroll dapat dibuat per periode.
- [ ] Roster/performance jelas statusnya (live atau coming soon).

---

### FR-14 — Billing & Langganan

**Tujuan:** pengguna dapat melihat paket aktif, kuota, pilihan upgrade, dan riwayat faktur.

**Fitur:**
- Kartu paket aktif: nama paket, masa aktif, deskripsi, kuota outlet, akun kasir, kuota AI OCR.
- Toggle siklus: bulanan / tahunan (hemat 20%).
- 3 kartu paket: Starter F&B, Pro Business, Enterprise Scale.
- Modal upgrade: ringkasan paket, siklus, total tagihan, pilihan metode bayar (BCA VA, Mandiri VA, QRIS, kartu kredit/debit).
- Tabel riwayat faktur: nomor, tanggal, deskripsi, metode, nominal, status, unduh PDF.

**API:** `GET /billing/subscription` (read-only).

**Gap:** harga, faktur, dan aksi upgrade masih statis; belum ada endpoint checkout/invoice. `useBilling` hanya membaca subscription dan belum dipakai untuk render.

**Definition of Done:**
- [ ] Data paket & kuota berasal dari API.
- [ ] Upgrade membuat transaksi pembayaran nyata.
- [ ] Faktur dapat diunduh.

---

### FR-15 — Profil, Keamanan & Notifikasi

**Tujuan:** pengguna mengelola identitas, bisnis, preferensi notifikasi, dan keamanan akun.

**Fitur:**
- Kartu profil: avatar/inisial, nama, jabatan, email, telepon, outlet, tanggal bergabung, status verifikasi, badge paket.
- Edit informasi akun: nama, jabatan, email, telepon, foto.
- Edit informasi usaha: nama outlet, jenis usaha, alamat, kota, telepon, paket.
- Preferensi notifikasi: stok menurun, laporan harian, transaksi masuk, pengingat.
- Keamanan: ganti password (lama, baru, konfirmasi), sesi aktif.
- Modal edit dan modal ganti password.

**API:** `GET/PATCH /me`, `PATCH /me/notification-preferences`, `POST /me/disable`, `GET /me/sessions`, `DELETE /me/sessions/:id`, `PATCH /organizations/current`, `/outlets`.

**Gap:** beberapa field masih nilai awal lokal; sesi aktif belum dirender dari API; upload avatar belum ada endpoint.

**Definition of Done:**
- [ ] Perubahan profil & notifikasi persisten.
- [ ] Ganti password memvalidasi password lama.
- [ ] Sesi lain bisa dicabut.

---

### FR-16 — AI Assistant

**Tujuan:** membantu pemilik menganalisis bisnis dan mempercepat pencatatan struk.

**Fitur:**
- Chat dengan riwayat sesi (disimpan di `localStorage`).
- Buat, cari, hapus sesi; hapus semua riwayat.
- Quick prompt: Analisis Omset, Stok Kritis, Efisiensi HPP, Ide Bundling, Scan Struk.
- Attachments: gambar, PDF, CSV, scan struk (maks. 8 MB).
- Scan struk: tampilkan hasil ekstraksi + tombol verifikasi/simpan/tolak/rescan.
- Copy jawaban, reset percakapan, indikator "AI sedang berpikir".
- Fallback jawaban demo jika API gagal.

**API:** `POST /ai/chat`, `GET /ai/conversations/:id`, `POST /ai/conversations/:id/reset`, `GET /ai/context?range=...`, `POST /ai/advisor`.

**Aturan:**
- AI tidak boleh menyimpan transaksi tanpa konfirmasi pengguna.
- Data konteks yang dikirim ke AI dibatasi pada ringkasan bisnis (bukan data sensitif mentah).
- Batas kuota AI mengikuti paket langganan.

**Definition of Done:**
- [ ] Chat mengirim konteks dan menerima jawaban API.
- [ ] Riwayat sesi bertahan setelah refresh.
- [ ] Scan struk bisa disimpan ke pengeluaran setelah verifikasi.

---

### FR-17 — Pusat Bantuan

**Tujuan:** pengguna menemukan jawaban sendiri dan bisa menghubungi support.

**Fitur:**
- Hero pencarian.
- FAQ dengan kategori: Kasir & POS, Persediaan & Stok, Laporan & Omset, Akun & Langganan.
- Panduan cepat (4 kartu) dengan durasi baca.
- Kontak support: WhatsApp, telepon, email.
- Modal tiket bantuan (subjek, kategori, deskripsi) + state sukses.

**Gap:** data FAQ/panduan statis; tiket belum dikirim ke backend.

**Definition of Done:**
- [ ] Pencarian & filter kategori bekerja.
- [ ] Tiket tersimpan dan menghasilkan nomor tiket.
- [ ] Kontak support dapat diklik di mobile.

---

### FR-18 — Layout, Navigasi & Notifikasi

**Fitur:**
- **Dashboard layout:** sidebar desktop 260px (collapsed 80px), header 64px, konten padding 24px, background `#F8FAFC`.
- **Mobile:** bottom navigation floating + menu akses cepat; sidebar disembunyikan.
- **Header:** toggle sidebar, judul "Dashboard Utama", notifikasi, toggle tema, dropdown profil (Profil, Pengaturan, Keluar).
- **Sidebar:** grup menu Dashboard, Administrasi, Laporan, Akun & Bisnis, AI, Customer Service.
- **Promo carousel:** banner + kartu status outlet/shift + shortcut AI & laporan.
- **Notifikasi:** panel dengan kategori stok, transaksi, laporan, update; tandai dibaca, hapus semua.
- **Breadcrumb** di layout master data.

**Gap:**
- Notifikasi masih mock.
- Toggle tema belum mengubah tema aplikasi.
- Belum ada outlet switcher di header meski `useOutlets` mendukung.
- Belum ada route guard; halaman dashboard dapat dirender tanpa login (data API gagal).

**Definition of Done:**
- [ ] Navigasi aktif mengikuti URL.
- [ ] Mobile bottom nav tidak menutupi konten (safe area).
- [ ] Notifikasi terhubung ke API.
- [ ] Tema gelap benar-benar berfungsi atau tombol dihapus.
- [ ] Pengguna tanpa sesi diarahkan ke login.

---

## 9. Alur Pengguna Utama

### 9.1 Onboarding Pengguna Baru

```text
Landing → Daftar → Isi akun → Verifikasi OTP → Isi data bisnis & plan
→ Dashboard → Lengkapi bahan baku → Buat produk & resep → Catat pengeluaran
→ Buka shift → Transaksi pertama → Lihat laporan
```

### 9.2 Operasional Harian Outlet

```text
Buka shift (kas awal) → Transaksi POS → Stok terpotong otomatis
→ Pantau stok kritis/JIT → Buat PO / transfer stok → Catat pengeluaran
→ Tutup shift (hitung kas fisik) → Lihat laporan harian
```

### 9.3 Restock Berbasis ROP

```text
Laporan Stok → Tab "Perlu Re-Order" → Lihat ROP & rekomendasi qty
→ Buat PO ke supplier → Terima barang → Stok bertambah
```

### 9.4 Pencatatan Pengeluaran dengan AI

```text
Pengeluaran → Scan Struk AI → Upload/pilih foto → AI ekstrak
→ Kasir verifikasi & koreksi → Simpan → Pengeluaran masuk buku kas
```

### 9.5 Stock Opname

```text
Persediaan → Tab Opname → Input stok fisik → Sistem hitung selisih
→ Review → Approve/Reject → Stok sistem disesuaikan
```

---

## 10. Aturan Bisnis Ringkas

| Aturan | Nilai |
|---|---|
| Rasio HPP sehat | ≤ 40% |
| Rasio HPP normal | 41–55% |
| Rasio HPP perlu perhatian | > 55% |
| Margin sehat | ≥ 40% |
| Margin tipis | 20–39,99% |
| Margin rendah | < 20% |
| Food waste ratio terkontrol | ≤ 1,5% dari omset |
| ROP | Stok minimum + (pemakaian harian × lead time) |
| Status stok | `ok`, `low`, `critical`, `overstock` |
| Shift aktif | Maksimal 1 per outlet |
| Idempotency | Wajib untuk create sale & transfer |
| Zona waktu | `Asia/Makassar` |

---

## 11. Kontrak Data & API

### 11.1 Envelope Response

```json
{
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100 },
  "requestId": "..."
}
```

### 11.2 Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pesan untuk pengguna",
    "details": [{ "path": "email", "message": "Email tidak valid" }]
  },
  "requestId": "..."
}
```

### 11.3 Header

| Header | Kegunaan |
|---|---|
| `Authorization: Bearer <token>` | Autentikasi |
| `X-Outlet-Id` | Konteks outlet aktif |
| `Idempotency-Key` | Mencegah duplikasi transaksi/transfer |

### 11.4 Enum Penting

- `PlanCode`: free_trial, starter, growth, pro, business, Teratur Free, Teratur Pro.
- `Uom`: ml, gram, kg, pcs, liter, botol, karton, pouch, pack, orang, bulan.
- `PaymentMethod`: qris, cash, debit, bank_transfer.
- `PayStatus`: paid, unpaid, credit.
- `OrderType`: dine_in, takeaway, delivery.
- `ExpenseCategory`: raw_material, packaging, operational, salary, utilities, equipment, transport, other.
- `ItemType`: ingredient, finished_good.
- `ProductKind`: made_to_order, finished_good, pre_order.
- `MarginGrade`: healthy, thin, low, loss.

---

## 12. Non-Functional Requirements

### 12.1 Performa

- LCP ≤ 2,5 detik pada 4G; CLS < 0,1.
- Route-level code splitting (sudah menggunakan `React.lazy`).
- Cache server-state 2–10 menit sesuai modul (TanStack Query).
- Hindari render ulang tabel besar; gunakan pagination server-side.

### 12.2 Keamanan

- Token disimpan di `localStorage` (risiko XSS). Rekomendasi: pertimbangkan httpOnly cookie atau strategi mitigasi XSS.
- Semua request melalui HTTPS.
- Validasi input di client **dan** server.
- Jangan menampilkan detail error mentah ke pengguna.
- Sesi dapat dicabut dari halaman profil.
- Rate limit login/OTP di backend.

### 12.3 Reliabilitas

- Retry query maksimal 1x (default saat ini).
- Fallback mock hanya untuk demo; di produksi harus menampilkan error/empty state yang jujur.
- Idempotency untuk operasi finansial.
- Refresh token queue agar tidak ada request paralel yang gagal.

### 12.4 Aksesibilitas

- Target WCAG 2.1 AA.
- Kontras teks minimal 4,5:1.
- Fokus keyboard terlihat.
- Label form eksplisit; ikon dekoratif `aria-hidden`.
- Touch target minimal 44×44 px di mobile.

### 12.5 SEO

- Meta title/description unik per halaman publik.
- Canonical, OG, Twitter Card.
- `noIndex` untuk halaman auth.
- Structured data `SoftwareApplication` di `index.html`.
- Sitemap & robots.txt (belum ada di repo).

### 12.6 Kompatibilitas

- Chrome/Edge/Safari/Firefox 2 versi terakhir.
- Mobile 360px–430px, tablet 768px, desktop 1280px+.
- Safe area iOS untuk bottom nav.

---

## 13. Status Implementasi & Gap Kritis

| Area | Status | Catatan |
|---|---|---|
| Design system | Partial | AntD theme + Tailwind, tetapi token warna duplikatif |
| Auth | Baik | Perlu route guard & fix link `/login`, `/forgot-password` |
| Dashboard | Baik | Data API, ada fallback error/loading |
| Master produk | Partial | HPP daftar masih estimasi 35% |
| Supplier | Partial | CRUD lokal |
| Gudang | Mock | Hook API tersedia tapi belum dipakai |
| POS kasir | **Belum ada** | Hanya marketing + hook |
| Export | Simulasi | Belum panggil API export |
| Billing | Statis | Belum ada checkout |
| AI OCR | Simulasi | Belum ada upload/scan API |
| Notifikasi | Mock | Belum ada API |
| Dark mode | UI only | Toggle tidak mengubah tema |
| RBAC | Belum ada | Semua menu terbuka untuk user login |
| Testing | Belum ada | Tidak ada unit/E2E test |
| Type safety | Partial | Masih ada `any`, `as any` |

### 13.1 Bug / Risiko yang Perlu Segera Diperbaiki

1. Interceptor 401 mengarah ke `/login`, sedangkan rute login adalah `/auth/login`.
2. Link "Lupa password" mengarah ke `/forgot-password` yang tidak terdaftar.
3. Tidak ada proteksi rute dashboard.
4. `ROUTES` memiliki 5 rute yang tidak terdaftar di router.
5. Halaman billing memakai data faktur statis.
6. `useBilling` tidak digunakan untuk render paket aktif.
7. Toggle tema tidak berfungsi.
8. Beberapa halaman menampilkan mock saat API kosong, berpotensi menyesatkan pengguna produksi.
9. `noUnusedLocals` aktif tetapi masih ada variabel tidak terpakai di beberapa file.
10. Belum ada error boundary global.

---

## 14. Di Luar Ruang Lingkup / Roadmap Lanjutan

- Layar kasir POS penuh + mode offline-first.
- Integrasi pembayaran QRIS dinamis dan payment gateway.
- OCR struk nyata (upload, storage, queue, confidence).
- RBAC & audit log.
- Multi-outlet switcher dan konsolidasi lintas cabang.
- Purchase order & penerimaan barang end-to-end.
- Prediksi stok dengan machine learning.
- Notifikasi push/WhatsApp/email.
- Akuntansi lengkap (jurnal, neraca, arus kas).
- Payroll dengan pajak & BPJS.
- Loyalty, member, voucher, dan promo.
- Mobile app native.
- Sitemap, robots.txt, dan observability (Sentry/analytics).

---

## 15. Dependensi & Asumsi

- Backend `teratur-system` menyediakan endpoint sesuai `src/hooks/*` dan `src/types/api.ts`.
- Autentikasi memakai access + refresh token.
- Setiap request membutuhkan outlet aktif.
- Data master (bahan, produk, supplier) sudah disiapkan sebelum transaksi.
- Backend menghitung auto stock deduction berdasarkan resep.
- Backend menghitung HPP, COGS, dan laba; frontend hanya menampilkan.
- Perangkat kasir memiliki koneksi internet stabil (kecuali fase offline-first).

---

## 16. Rencana Rilis

| Fase | Fokus | Keluaran |
|---|---|---|
| **Fase 0 — Stabilisasi** | Fix bug kritis, route guard, token, export, mock removal | Frontend production-safe |
| **Fase 1 — Core Ops** | POS kasir, shift, auto deduct, laporan | Alur transaksi end-to-end |
| **Fase 2 — Inventory Pro** | ROP/JIT, transfer, opname, waste, PO | Kontrol stok penuh |
| **Fase 3 — Finance & AI** | OCR nyata, export nyata, AI context | Efisiensi pembukuan |
| **Fase 4 — Scale** | Multi-outlet, RBAC, billing, payroll | Siap multi-cabang |

---

## 17. Pertanyaan Terbuka

1. Apakah POS kasir akan menjadi halaman dashboard baru atau aplikasi terpisah?
2. Apakah multi-outlet memerlukan konsolidasi laporan lintas cabang dalam satu dashboard?
3. Apakah harga paket di landing dan billing harus disamakan?
4. Siapa yang berhak menyetujui opname dan pengeluaran?
5. Apakah AI OCR wajib menyimpan file struk asli, dan berapa lama retensinya?
6. Apakah diperlukan mode offline-first di fase 1?
7. Apakah data pelanggan (member) masuk ruang lingkup?
8. Bagaimana strategi migrasi dari mock ke data produksi tanpa mengejutkan pengguna?

---

## 18. Glosarium

| Istilah | Arti |
|---|---|
| **HPP** | Harga Pokok Penjualan / COGS |
| **BOM** | Bill of Materials — daftar bahan penyusun produk |
| **ROP** | Re-Order Point — titik stok harus dipesan ulang |
| **JIT** | Just-In-Time — pengadaan tepat waktu sebelum stok habis |
| **Opname** | Penghitungan fisik stok dan rekonsiliasi dengan sistem |
| **Waste** | Bahan terbuang karena expired, rusak, gagal produksi, atau hilang |
| **Shift** | Periode kerja kasir dengan kas awal dan kas akhir |
| **Outlet** | Cabang/lokasi bisnis |
| **Tenant/Organization** | Entitas bisnis pemilik data |
| **Nett Profit** | Omset net − HPP − beban operasional |
| **Margin** | (Harga jual − HPP) / Harga jual × 100% |

---

*Dokumen ini dibuat berdasarkan audit frontend pada 25 November 2026. Perbarui saat ada perubahan rute, hook API, atau status modul.*
