# Design Guide — TERATUR.id

**Panduan Desain & Sistem UI Frontend**

| Item | Keterangan |
|---|---|
| Produk | TERATUR.id — POS, Smart Inventory & Financial Report |
| Stack UI | React 19 + TypeScript + Vite + Ant Design 5 + Tailwind CSS v4 |
| Versi dokumen | 1.0 |
| Tanggal | 25 November 2026 |
| Sumber | Audit langsung `teratur/frontend` |
| Status | Living document |

> Dokumen ini menjelaskan **bagaimana UI TERATUR dibangun**, bukan sekadar preferensi. Semua nilai token, ukuran, dan pola diambil dari kode aktual. Bila ada dua sumber token yang berbeda, dokumen ini menandainya secara eksplisit.

---

## 1. Prinsip Desain

TERATUR menjual janji "teratur" — rapi, terukur, terkontrol. UI harus terasa seperti itu.

| Prinsip | Arti dalam UI |
|---|---|
| **Tenang & terpercaya** | Banyak white space, hierarki jelas, warna aksen dipakai hemat. Bukan dashboard "ramai". |
| **Angka adalah bintang** | KPI, margin, ROP, selisih kas harus paling mudah dibaca. Tipografi angka tegas, satuan eksplisit. |
| **Cepat dipakai** | Aksi utama selalu terlihat (tambah, simpan, export). Form panjang dipecah jadi bagian. |
| **Jujur soal status** | Loading, kosong, error, mock, dan "belum tersedia" harus dibedakan. Jangan menampilkan angka palsu sebagai fakta. |
| **Mobile tetap serius** | Bukan versi "dikecilkan": tabel bisa scroll, aksi jadi bottom nav, target sentuh besar. |
| **Konsisten sebelum cantik** | Satu pola tombol, satu pola modal, satu pola status badge di seluruh aplikasi. |

---

## 2. Identitas Merek

### 2.1 Nama & Penulisan

- Nama produk: **TERATUR** (kapital di logo/heading besar) atau **Teratur.id** (dalam kalimat).
- Di navbar ditulis `Teratur` + `.Id` dengan `.Id` berwarna hijau.
- Tagline: *"Cashier, Inventory & Financial System"*.
- Bahasa UI: **Indonesia** — gunakan istilah operasional yang dikenal pemilik outlet (omset, HPP, opname, waste, shift), bukan terjemahan kaku.

### 2.2 Logo

- Aset: `IloveTeraturLogo` dari `src/assets/images`.
- Ukuran navbar publik: 32–40 px; sidebar dashboard: 32 px; auth: lebih besar, di atas kartu form.
- Jangan memberi background gelap di belakang logo berwarna; gunakan area putih/transparan.
- Logo selalu berpasangan dengan wordmark, kecuali di sidebar collapsed (80 px).

### 2.3 Nada Visual

- Bersih, profesional, sedikit "hijau alami" (kesehatan bisnis & bahan segar).
- Ikon garis (Lucide) mendominasi; hindari ikon berwarna-warni acak.
- Ilustrasi/foto: nuansa coffee shop, dapur, dan meja kasir; bukan stok foto korporat generik.
- Sudut membulat (6–16 px) memberi kesan modern tapi tidak main-main.

---

## 3. Warna

### 3.1 Sumber Token (Penting)

Ada **dua sistem warna paralel** di codebase:

1. **Ant Design Theme** (`src/components/ui/ThemeConfig.tsx`) — **kanonik untuk komponen UI**.
2. **Tailwind Theme** (`tailwind.config.ts` + `@theme` di `src/index.css`) — dipakai untuk utility class di JSX.

Keduanya belum disatukan. **Aturan kerja:**

- Komponen Ant Design (Button, Input, Select, Modal, Table, Tag, Tabs) mengikuti token AntD.
- Layout, spacing, dan styling kustom memakai Tailwind.
- Untuk aksen brand di Tailwind, gunakan **hex langsung `#84C163`** (seperti yang sudah dilakukan di Navbar/Hero) agar konsisten dengan AntD. **Jangan** memakai `bg-primary` Tailwind untuk elemen brand, karena `primary` Tailwind = `#00b4d8` (cyan), bukan hijau brand.

### 3.2 Palet Kanonik (Ant Design)

| Nama | Hex | Token AntD | Pemakaian |
|---|---|---|---|
| **Primary Green** | `#84C163` | `colorPrimary` | CTA utama, link aktif, progress, fokus input, aksen brand |
| **Primary Green Hover** | `#97D06F` | `colorPrimaryHover`, `colorSuccess` | Hover tombol, state sukses |
| **Primary Blue** | `#337DBC` | `colorInfo` | Informasi, link sekunder, highlight netral |
| **Primary Blue Hover** | `#4A9AD9` | `colorLinkHover` | Hover link |
| **Teal** | `#63B7B0` | `colorWarning` | Catatan/inovasi, aksen pending |
| **Error Red** | `#ff4d4f` | `colorError` | Hapus, gagal, stok kritis |
| **Text Black** | `#000000` | `colorTextBase` | Judul & teks utama |

### 3.3 Palet Tailwind

| Token | Hex | Catatan |
|---|---|---|
| `primary` | `#00b4d8` | Cyan — **bukan** warna brand utama; hindari untuk CTA |
| `secondary` | `#80c05e` | Hijau mendekati brand |
| `softbg` | `#F8FAFC` | Background halaman dashboard |
| `herobg` | `#9ab1c2` | Aksen hero |
| `surface` | `#FFFFFF` | Kartu & permukaan |
| `textdark` | `#334155` | Teks body |
| `textlight` | `#64748B` | Teks sekunder |
| `menutext` | `#71717A` | Label menu |

Token tambahan di `@theme` (`src/index.css`):

| Token | Hex | Pemakaian |
|---|---|---|
| `brand` | `#1A7A4A` | Hijau tua (teks di atas hijau muda) |
| `brand-dark` | `#145C37` | Hover hijau tua |
| `brand-light` | `#D6F0E3` | Background badge hijau |
| `brand-muted` | `#F0FAF5` | Background section hijau sangat muda |
| `trust` | `#1A5FA8` | Biru kepercayaan |
| `trust-light` | `#E8F1FB` | Background info |

### 3.4 Warna Netral & Semantik Operasional

| Makna | Warna | Contoh |
|---|---|---|
| Aman / sehat | Emerald `#10B981` / `#059669` | Stok aman, margin sehat, shift selesai |
| Menipis / perhatian | Amber `#F59E0B` | Stok menipis, margin tipis, pending review |
| Kritis / gagal | Red `#EF4444` | Stok habis, selisih kas, error |
| Netral / info | Slate `#64748B`, Blue `#337DBC` | Metadata, keterangan |
| Overstock | Violet/Indigo | Status stok berlebih |

**Aturan:** satu status = satu warna di seluruh aplikasi. Jangan memakai hijau untuk "pending" di satu halaman dan amber di halaman lain.

### 3.5 Kontras

- Teks utama: `slate-900` / `#000000` di atas putih.
- Teks sekunder minimal `slate-500` (`#64748B`).
- Jangan memakai `text-slate-400` untuk teks penting (kontras rendah).
- Putih di atas `#84C163` hanya untuk teks tebal ≥ 14 px; untuk teks kecil gunakan `#145C37`.

---

## 4. Tipografi

### 4.1 Keluarga Font

| Peran | Font | Fallback |
|---|---|---|
| Display & body | **Plus Jakarta Sans** (300–800) | system sans |
| Angka/mono | **JetBrains Mono** (400–600) | monospace |

Font dimuat via Google Fonts di `src/index.css`. Tidak ada font lokal.

### 4.2 Skala

`html` di-set **14.5px**, sehingga `rem` sedikit lebih kecil dari default 16px. Ini membuat UI terasa lebih padat dan "produk", bukan "website".

| Peran | Kelas Tailwind | Ukuran efektif | Berat |
|---|---|---|---|
| Hero H1 | `text-3xl sm:text-4xl md:text-5xl xl:text-6xl` | 32–56 px | 800 (`font-extrabold`) |
| Judul halaman | `text-xl sm:text-2xl` | 20–24 px | 700 |
| Judul kartu/section | `text-sm sm:text-base` | 14–16 px | 700 |
| Body | `text-xs sm:text-sm` | 12–14 px | 400–500 |
| Label form | `text-xs font-semibold uppercase tracking-wider` | 12 px | 600 |
| Metadata | `text-[10px] sm:text-xs` | 10–12 px | 500 |
| KPI angka besar | `text-2xl sm:text-3xl` | 24–30 px | 800 |

### 4.3 Aturan Tipografi

- Heading selalu `font-display` (Plus Jakarta Sans) dan `font-semibold` ke atas.
- Angka uang: gunakan `font-bold`/`font-extrabold` + `tabular-nums` bila dalam tabel agar kolom rata.
- Format mata uang: `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` → `Rp 28.000`.
- Tanggal: `date-fns` locale `id` → `25 November 2026`.
- Hindari teks ALL CAPS panjang; hanya untuk label kecil.
- Maksimal 2 ukuran font per kartu (judul + isi).

---

## 5. Spacing, Radius, Shadow

### 5.1 Spacing

Skala 4 px. Nilai yang paling sering muncul:

| Konteks | Nilai |
|---|---|
| Gap antar elemen kecil | 4–8 px (`gap-1`, `gap-2`) |
| Padding kartu | 16–24 px (`p-4`, `p-5`, `p-6`) |
| Gap antar kartu | 12–16 px (`gap-3`, `gap-4`) |
| Padding halaman publik | `px-4 sm:px-6 md:px-8`, `py-3 sm:py-6 lg:py-8` |
| Padding konten dashboard | 24 px desktop, 16 px mobile |
| Jarak antar section landing | `py-10 sm:py-16` |

### 5.2 Radius

| Nilai | Pemakaian |
|---|---|
| `6px` | Radius dasar AntD (input, button, tag) |
| `8px` (`rounded-lg`) | Tombol kecil, badge, item menu |
| `12px` (`rounded-xl`) | Kartu kecil, panel, item list |
| `16px` (`rounded-2xl`) | Kartu utama, modal, container |
| `24px` (`rounded-3xl`) / `40px` | Hero, banner besar |
| `full` | Navbar pill, CTA pill, avatar, chip |

**Aturan:** jangan campur `rounded-lg` dan `rounded-2xl` pada elemen sejenis dalam satu grid.

### 5.3 Shadow

| Level | Kelas | Pemakaian |
|---|---|---|
| 0 | tanpa shadow + `border border-slate-200` | Kartu datar, tabel |
| 1 | `shadow-sm` | Kartu standar |
| 2 | `shadow-md` | Navbar sticky, dropdown, kartu hover |
| 3 | `shadow-lg` / `shadow-xl` | Modal, panel notifikasi, floating nav |
| Aksen | `shadow-[#84C163]/25` | CTA hijau |

Shadow berwarna hanya untuk CTA hijau; sisanya netral (`slate-900/5`).

---

## 6. Token Ant Design

Konfigurasi di `src/components/ui/ThemeConfig.tsx`:

```ts
token: {
  colorPrimary: '#84C163',
  colorInfo: '#337DBC',
  colorSuccess: '#97D06F',
  colorWarning: '#63B7B0',
  colorError: '#ff4d4f',
  colorTextBase: '#000000',
  borderRadius: 6,
  fontFamily: '"Plus Jakarta Sans", ...',
}
```

Override per komponen:

| Komponen | Override |
|---|---|
| Button | primary `#84C163`, hover `#97D06F`, link `#337DBC`, link hover `#4A9AD9` |
| Input | fokus hijau, outline `rgba(132,193,99,0.1)` |
| Select | sama dengan Input |
| Card | `fontWeightHead: 600`, `headerHeight: 48` |

**Catatan:** wrapper `src/components/ui/*` menambahkan sentuhan Tailwind:

- `Button` → passthrough AntD.
- `Card` → `shadow-sm hover:shadow-md transition-shadow duration-300`.
- `Input`/`TextArea` → border hover/fokus `#84C163`.
- `Select` → `w-full`, `minWidth: 120`.

Gunakan wrapper ini untuk konsistensi, kecuali butuh kontrol penuh AntD.

---

## 7. Ikonografi

- Library: **Lucide React** (`lucide-react`) untuk hampir semua ikon.
- Ukuran: 14 px (inline kecil), 16 px (default), 18–20 px (tombol/aksi), 24 px (empty state/kartu fitur).
- Warna: mengikuti teks (`currentColor`); ikon dalam kotak berwarna memakai pola `bg-{color}-50` + `text-{color}-600`.
- Stroke default 2; jangan mencampur ikon filled dan outline dalam satu grup.
- Ikon dekoratif: `aria-hidden="true"`.
- Ikon aksi tanpa label wajib punya `Tooltip` + `aria-label`.

Pemetaan umum:

| Aksi | Ikon |
|---|---|
| Tambah | `Plus` |
| Cari | `Search` |
| Filter | `Filter` |
| Edit | `Edit` / `Pencil` |
| Hapus | `Trash2` |
| Lihat detail | `Eye` |
| Export | `Download` |
| Stok | `Package`, `Boxes`, `Warehouse` |
| Uang | `Wallet`, `Receipt`, `TrendingUp`, `TrendingDown` |
| AI | `Sparkles`, `Zap`, `Bot` |
| Sukses | `CheckCircle2`, `BadgeCheck` |
| Peringatan | `AlertTriangle`, `AlertCircle` |

---

## 8. Komponen Inti

### 8.1 Tombol

| Varian | Kelas | Pemakaian |
|---|---|---|
| **Primary** | `bg-[#84C163] hover:bg-[#72ad52] text-white rounded-full px-6 py-3.5 font-semibold shadow-md shadow-[#84C163]/25 active:scale-95` | CTA landing, simpan utama |
| **Dark** | `bg-slate-900 hover:bg-[#84C163] text-white rounded-full` | CTA navbar |
| **Secondary/Outline** | `bg-white border border-slate-200 hover:bg-slate-50 rounded-full` | Aksi sekunder |
| **Ghost** | `hover:bg-slate-100 text-slate-700 rounded-full` | Link nav, aksi baris |
| **Danger** | AntD `danger` atau `text-red-600 hover:bg-red-50` | Hapus |
| **Icon-only** | `w-9 h-9 rounded-lg flex items-center justify-center` | Aksi tabel/header |

Aturan:
- Satu layar hanya boleh punya **satu** tombol primary yang dominan.
- Tombol besar memakai `rounded-full`; tombol dalam tabel/modal memakai `rounded-lg` (AntD default).
- State loading wajib: spinner + teks tetap, tombol disabled.
- Minimal tinggi 40 px desktop, 44 px mobile.

### 8.2 Kartu

Pola standar:

```tsx
<div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-bold text-slate-900">Judul</h3>
    <span className="text-xs text-slate-500">Aksi</span>
  </div>
  {/* isi */}
</div>
```

- Kartu KPI: label kecil uppercase, angka besar, delta + ikon tren, subteks periode.
- Kartu interaktif: tambahkan `hover:shadow-md transition-shadow cursor-pointer`.
- Jangan menumpuk lebih dari 2 level kartu (kartu di dalam kartu).

### 8.3 Form

- Label di atas field, `text-xs font-semibold uppercase tracking-wider text-slate-500`.
- Field wajib ditandai `*` merah atau teks "Wajib".
- Gunakan grid 2 kolom di desktop, 1 kolom di mobile.
- Helper text di bawah field, `text-[11px] text-slate-500`.
- Error di bawah field, merah, spesifik ("Harga jual harus lebih dari 0").
- Kelompokkan form panjang dengan judul section dan divider.
- Tombol aksi di kanan bawah modal: Batal (ghost) + Simpan (primary).

### 8.4 Tabel

- Header: `text-[11px] uppercase tracking-wider text-slate-500 font-semibold`, background `slate-50`.
- Baris: `text-xs sm:text-sm`, hover `bg-slate-50`, divider `border-slate-100`.
- Angka rata kanan; teks rata kiri; aksi rata kanan.
- Kolom status memakai badge, bukan teks polos.
- Di mobile: `overflow-x-auto` + `min-w-[...]`, atau ubah jadi kartu bertumpuk.
- Pagination di bawah kanan; tampilkan "Menampilkan X–Y dari Z".
- Empty state: ikon + judul + penjelasan + CTA.

### 8.5 Badge & Status

Pola: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold`.

| Status | Kelas |
|---|---|
| Aktif / Aman / Lunas / Selesai | `bg-emerald-50 text-emerald-700 border border-emerald-200` |
| Menipis / Pending / Kredit | `bg-amber-50 text-amber-700 border border-amber-200` |
| Kritis / Habis / Gagal / Dibatalkan | `bg-red-50 text-red-700 border border-red-200` |
| Info / Dalam Pengiriman | `bg-blue-50 text-blue-700 border border-blue-200` |
| Netral / Nonaktif | `bg-slate-100 text-slate-600 border border-slate-200` |

### 8.6 Modal

- AntD `Modal`, `centered`, `footer={null}` bila form kustom.
- Lebar: 480 px (konfirmasi), 640 px (form), 800–960 px (detail kompleks).
- Judul jelas + subjudul opsional.
- Tutup via X, ESC, dan klik backdrop (kecuali form kotor → konfirmasi).
- Modal destruktif memakai `Popconfirm` atau modal konfirmasi dengan tombol merah.

### 8.7 Notifikasi & Feedback

- Toast: **Sonner** (`toast.success`, `toast.error`), posisi `top-right`, `richColors`.
- AntD `message` masih dipakai di beberapa halaman — target konsolidasi ke Sonner.
- Loading halaman: `LoadingSkeleton` (spinner + "Memuat Teratur.id...").
- Loading tabel: skeleton baris, bukan spinner penuh.
- Error: banner inline + tombol "Coba lagi"; jangan hanya toast.

### 8.8 Tabs

- Dua gaya: AntD `Tabs` dan tab kustom pill.
- Tab kustom: container `bg-slate-100 rounded-xl p-1`, item aktif `bg-white shadow-sm text-slate-900`, nonaktif `text-slate-500`.
- Tab harus bisa di-scroll horizontal di mobile (`overflow-x-auto hide-scrollbar`).

### 8.9 Grafik

- Library: Recharts.
- Warna seri: omset `#337DBC`, HPP `#F59E0B`, nett profit `#84C163`.
- Grid horizontal tipis `#E2E8F0`, tanpa grid vertikal.
- Tooltip putih, shadow, format Rupiah.
- Sumbu Y disingkat (`Rp 1,2 jt`) agar tidak memakan ruang.
- Selalu sediakan legend dan state kosong.

---

## 9. Layout & Navigasi

### 9.1 Halaman Publik — `UsersLayout`

```text
<div bg-slate-50/70 min-h-screen flex flex-col>
  <NavbarMain />                         // sticky pill
  <main max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-6 lg:py-8>
    {children}
  </main>
  <Footer />
</div>
```

**Navbar publik:**
- Sticky `top-2 sm:top-3.5`, `z-50`, container `max-w-[1400px]`.
- Bentuk pill: `bg-white/95 backdrop-blur-xl border rounded-2xl sm:rounded-full shadow-md`.
- Kiri: logo + wordmark + tagline kecil.
- Tengah: link anchor (`#master`, `#inventory`, `#simulasi`, `#laporan`, `#pricing`, `#faq`) + halaman (POS, Hardware, Blog, Bantuan, Kontak).
- Kanan: "Masuk" (ghost) + "Coba Gratis" (dark pill → hover hijau).
- Mobile: hamburger → panel full-screen, body scroll dikunci.
- Link aktif: `hover:bg-slate-100 hover:text-[#84C163]`.

**Hero landing:**
- Container `rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem]`, gradient `from-emerald-50/70 via-sky-50/40 to-emerald-50/50`, border emerald tipis.
- Blob dekoratif `bg-[#84C163]/10 blur-3xl` (non-interaktif).
- Grid 12 kolom: 6 teks + 6 visual.
- H1 `font-extrabold tracking-tight leading-[1.18]` dengan kata kunci hijau.
- CTA: primary pill hijau + secondary putih outline.

**Section publik:**
- Jarak `py-10 sm:py-16`, divider `border-t border-slate-100`.
- Judul section: eyebrow kecil + H2 `text-xl sm:text-2xl font-bold`.
- Grid 1 kolom mobile → 2–3 kolom desktop.
- Animasi masuk: AOS (`data-aos="fade-up"`).

**Footer:**
- Latar gelap (`slate-900`), teks `slate-300`.
- Kolom: brand + deskripsi, produk, perusahaan, legal, newsletter.
- Bottom bar: copyright + social + status.

### 9.2 Auth — `AuthLayout`

- Split screen: panel kiri brand/ilustrasi (`IloveTeraturBgAuth`), panel kanan form putih.
- Mobile: hanya form, panel brand disembunyikan.
- Kartu form maksimal 420–480 px, padding 24–32 px.
- Registrasi memakai **stepper 3 langkah** dengan indikator progres di atas form.
- Password: tombol show/hide, indikator kekuatan (lemah/sedang/kuat).
- OTP: 6 kotak input, auto-focus, auto-submit saat lengkap, tombol kirim ulang dengan countdown.
- Semua halaman auth `noIndex`.

### 9.3 Dashboard — AntD `Layout`

```text
<Layout min-h-screen bg-[#F8FAFC]>
  <Sidebar width=260 collapsedWidth=80 />   // desktop saja
  <Layout>
    <SidebarHeader height=64 />             // sticky
    <Content padding="0 24px 32px">
      <PromoCarousel />                     // opsional
      {children}
    </Content>
  </Layout>
</Layout>
```

**Sidebar:**
- Lebar 260 px, collapsed 80 px, background putih, border kanan `slate-200`.
- Logo di atas; grup menu dengan label kecil uppercase.
- Item aktif: background `#84C163/10`, teks `#558637`, indikator kiri 4 px.
- Item hover: `bg-slate-50`.
- Submenu expand/collapse dengan chevron.
- Tooltip saat collapsed.

**Grup menu:**
1. **Dashboard**
2. **Administrasi** — Master Data, Persediaan, Pengeluaran, Karyawan & Shift
3. **Laporan** — Transaksi, Stok
4. **Akun & Bisnis** — Profile, Billing
5. **AI** — Chat AI
6. **Customer Service** — Pusat Bantuan

**Header dashboard:**
- Tinggi 64 px desktop / 56 px mobile, sticky, background putih, border bawah.
- Kiri: toggle sidebar + judul halaman.
- Kanan: notifikasi (badge unread), toggle tema, avatar + dropdown (Profil, Pengaturan, Keluar).
- Panel notifikasi: drawer kanan, lebar 360–400 px, dikelompokkan per tipe, aksi "tandai dibaca" & "hapus semua".

**Mobile dashboard:**
- Sidebar disembunyikan; bottom navigation floating (pill, `shadow-xl`, safe-area padding).
- Item: Dashboard, Persediaan, Kasir, Laporan, Menu.
- Konten padding 16 px; tabel scroll horizontal.

### 9.4 Layout Master Data

- Memakai `MasterDataLayout`: sidebar + header + **breadcrumb**.
- Breadcrumb: `Dashboard / Master Data / Bahan Baku`.
- Konten dibungkus kartu putih besar dengan sub-navigasi tab master data.

---

## 10. Responsif

| Breakpoint | Lebar | Perilaku |
|---|---|---|
| Base | < 640 px | 1 kolom, bottom nav, tabel scroll, font kecil |
| `sm` | ≥ 640 px | 2 kolom untuk kartu, padding naik |
| `md` | ≥ 768 px | Sidebar mulai dipertimbangkan, grid 2–3 kolom |
| `lg` | ≥ 1024 px | Sidebar penuh, navbar desktop, grid 3–4 kolom |
| `xl` | ≥ 1280 px | Container maksimal, tabel penuh |
| `2xl` | ≥ 1536 px | Jarang dipakai; hindari layout khusus |

Aturan:
- Mobile-first: tulis kelas base dulu, lalu `sm:`, `md:`, `lg:`.
- Tidak boleh ada horizontal scroll di body; hanya di container tabel.
- Target sentuh ≥ 44×44 px.
- Bottom nav wajib `pb-[env(safe-area-inset-bottom)]`.
- Uji minimal di 360 px, 390 px, 768 px, 1280 px.

---

## 11. Interaksi & Animasi

| Interaksi | Durasi | Easing |
|---|---|---|
| Hover warna/shadow | 150–200 ms | `ease-out` |
| Transform tombol (`active:scale-95`) | 100–150 ms | `ease-out` |
| Buka/tutup modal & drawer | 200–300 ms | AntD default |
| Expand submenu | 200 ms | `ease-in-out` |
| Animasi masuk section | 600–800 ms, sekali | AOS `fade-up` |

Prinsip:
- Animasi harus menjelaskan perubahan, bukan menghibur.
- Hormati `prefers-reduced-motion`: matikan animasi dekoratif.
- Animasi angka KPI boleh count-up singkat (≤ 800 ms), tapi angka akhir harus langsung benar.
- Skeleton lebih baik daripada spinner untuk konten berbentuk.
- `animate-float-subtle` hanya untuk elemen dekoratif.

---

## 12. Pola Halaman

### 12.1 Dashboard

Urutan yang sudah dipakai:
1. Header halaman + filter periode + tombol refresh.
2. Baris 4 KPI.
3. Grafik utama (omset/HPP/profit).
4. Dua kolom: peringatan stok (kiri) + ringkasan finansial/waste (kanan).
5. Tabel performa menu + live transaksi.
6. Shortcut ke modul lain.

### 12.2 Halaman Daftar (Master Data, Laporan)

1. Judul + deskripsi singkat.
2. Baris aksi: pencarian, filter, export, tombol tambah.
3. Kartu ringkasan (opsional).
4. Tabel + pagination.
5. Modal form/detail.

### 12.3 Halaman Detail/Transaksi

- Header dengan status + aksi utama.
- Ringkasan angka di atas.
- Tabel item.
- Panel samping untuk metadata (kasir, outlet, waktu, metode bayar).
- Aksi destruktif dipisah dan diberi konfirmasi.

### 12.4 Halaman Form Panjang (Produk + Resep)

- Dua kolom: form utama (kiri) + ringkasan HPP/margin sticky (kanan).
- Ringkasan live update saat qty/harga berubah.
- Baris resep bisa ditambah/hapus.
- Validasi inline, bukan hanya saat submit.

### 12.5 Empty State

```text
[ikon 48px abu]
Judul singkat
Penjelasan 1 baris
[CTA primary]
```

Contoh: "Belum ada produk. Tambahkan menu pertama Anda agar bisa berjualan di POS."

### 12.6 Loading State

- Halaman: skeleton layout (bukan spinner penuh) bila memungkinkan.
- Tabel: 5–8 baris skeleton.
- Kartu KPI: blok abu dengan animasi pulse.
- Tombol submit: spinner + label tetap.

### 12.7 Error State

- Banner inline di area konten: ikon, pesan manusiawi, tombol "Coba lagi".
- Jangan tampilkan stack trace / kode mentah.
- Bila data gagal tapi ada cache, tampilkan data lama + label "Data mungkin tidak terbaru".

---

## 13. Aksesibilitas

Target: **WCAG 2.1 AA**.

- Kontras teks ≥ 4,5:1; teks besar ≥ 3:1.
- Semua field punya `<label>` terhubung (`htmlFor`/`id`) atau `aria-label`.
- Urutan fokus mengikuti urutan visual.
- Fokus terlihat: outline 2 px `#84C163` + offset 2 px.
- Jangan menghapus outline tanpa pengganti.
- Modal: focus trap, ESC menutup, fokus kembali ke pemicu.
- Ikon dekoratif `aria-hidden="true"`; ikon aksi punya label.
- Status tidak boleh hanya dibedakan warna — tambahkan teks/ikon.
- Tabel punya `<caption>` atau judul yang terhubung.
- Bahasa dokumen `lang="id"`.
- Gambar punya `alt` bermakna; gambar dekoratif `alt=""`.
- Hindari `div` yang bisa diklik tanpa `role`/`tabIndex`.

---

## 14. SEO & Metadata

- Komponen `Seo` mengatur: title, description, canonical, robots, OG, Twitter Card.
- Format title: `{Halaman} | Teratur.Id` (otomatis).
- Halaman publik: `index, follow`; auth & dashboard: `noIndex`.
- Canonical memakai `https://teratur.id`.
- `index.html` memuat structured data `SoftwareApplication`.
- OG image default `/og-image.png`, 1200×630.
- Satu H1 per halaman.
- URL deskriptif dalam bahasa Indonesia (`/layanan/pos`, `/kebijakan-privasi`).

---

## 15. Checklist Sebelum Merge

- [ ] Warna brand memakai `#84C163` (bukan `bg-primary` Tailwind).
- [ ] Tidak ada teks di bawah 10 px.
- [ ] Semua state: loading, kosong, error, sukses.
- [ ] Mobile 360 px tidak overflow.
- [ ] Tombol ikon punya `aria-label`/tooltip.
- [ ] Form punya label dan pesan error spesifik.
- [ ] Angka uang memakai format Rupiah.
- [ ] Tidak ada mock data yang menyamar sebagai data produksi.
- [ ] Tidak ada `any` baru tanpa alasan.
- [ ] Konsisten memakai wrapper `Button`, `Card`, `Input`, `Select`.
- [ ] Tidak menambah warna baru di luar palet tanpa persetujuan.

---

## 16. Utang Desain (Design Debt)

| Isu | Dampak | Rekomendasi |
|---|---|---|
| Dua sistem warna (AntD vs Tailwind) | CTA bisa salah warna | Satukan token; jadikan `#84C163` sumber tunggal |
| `primary` Tailwind = cyan | Membingungkan developer | Rename `primary` → `cyan` atau samakan ke hijau |
| Campuran Sonner & AntD message | Feedback tidak konsisten | Standarkan ke Sonner |
| Toggle dark mode belum berfungsi | Janji UI tidak terpenuhi | Implementasi atau hapus |
| Notifikasi mock | Pengguna salah paham | Sambungkan API atau tandai "demo" |
| Tabel belum seragam | Pengalaman berbeda per halaman | Buat komponen `DataTable` bersama |
| Belum ada design token untuk spacing | Nilai acak | Definisikan skala spacing di `@theme` |
| Belum ada Storybook | Sulit review komponen | Tambahkan katalog komponen |
| Ikon kadang bercampur gaya | Visual kurang rapi | Standarkan Lucide + ukuran |

---

## 17. Referensi Cepat

| Kebutuhan | Lokasi |
|---|---|
| Token AntD | `src/components/ui/ThemeConfig.tsx` |
| Token Tailwind & base CSS | `src/index.css`, `tailwind.config.ts` |
| Wrapper komponen | `src/components/ui/` |
| Layout publik | `src/layouts/users/default/index.tsx` |
| Layout auth | `src/layouts/auth/index.tsx` |
| Layout dashboard | `src/layouts/dashboard/default/index.tsx` |
| Layout master data | `src/layouts/master-data/default/index.tsx` |
| Navbar | `src/components/shared/Navbar/default/` |
| Sidebar | `src/components/shared/Sidebar/` |
| Header dashboard | `src/components/shared/SidebarHeader/default/` |
| Footer | `src/components/shared/Footer/` |
| SEO | `src/components/shared/Seo/index.tsx` |
| Format uang/tanggal | `src/utils/formatCurrency.ts`, `src/utils/formatDate.ts` |
| Utility class merge | `src/utils/cn.ts` |

---

*Dokumen ini dibuat berdasarkan audit frontend pada 25 November 2026. Perbarui saat token, komponen, atau pola layout berubah.*
