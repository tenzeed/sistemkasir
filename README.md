# Warung Manager

Aplikasi manajemen warung: produk, stok, batch & EXP (FEFO), transaksi/POS,
struk, keuangan, dan laporan — sesuai PRD.

## Arsitektur

```
┌────────────────┐      ┌──────────────────────┐      ┌────────────────┐
│  Google Sheets │◄────►│ Google Apps Script    │◄────►│ Frontend       │
│  (database)    │      │ (backend / API)       │HTTPS │ React + Vite   │
└────────────────┘      └──────────────────────┘      │ (hosting: Anda │
                                                         │  pilih sendiri,│
                                                         │  mis. Vercel)  │
                                                         └────────────────┘
```

- **`backend/Code.gs`** — seluruh logika bisnis (FEFO, status EXP, validasi
  stok, nomor transaksi, dll) berjalan di sini, membaca/menulis ke Google
  Sheets. Lihat **`backend/SETUP.md`** untuk cara deploy — ini bagian yang
  perlu Anda kerjakan sendiri di akun Google Anda.
- **`frontend/`** — aplikasi React (Vite + Tailwind) yang memanggil Apps
  Script sebagai API. Deploy ke Vercel, Netlify, atau hosting statis apa pun.
- **`dev-mock-server/`** — server Node kecil yang meniru kontrak API yang
  sama persis, dipakai untuk pengembangan lokal **tanpa** perlu Apps Script
  sudah ter-deploy. Tidak untuk produksi.

## Menjalankan secara lokal

### Opsi cepat (pakai mock server, tanpa Google Sheets dulu)

```bash
# Terminal 1 — backend palsu untuk pengembangan
cd dev-mock-server
node server.mjs            # jalan di http://localhost:8787

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env
echo "VITE_API_URL=http://localhost:8787" > .env
npm run dev
```

### Produksi (Google Sheets + Apps Script sungguhan)

1. Ikuti **`backend/SETUP.md`** untuk membuat Sheet dan men-deploy `Code.gs`
   sebagai Web App. Anda akan mendapat sebuah URL.
2. Di `frontend/.env` (atau environment variable di Vercel), isi:
   ```
   VITE_API_URL=https://script.google.com/macros/s/XXXXXXXX/exec
   ```
3. Deploy folder `frontend/` ke Vercel (atau `npm run build` lalu upload
   folder `dist/` ke hosting statis mana pun).

## Fitur yang sudah diimplementasikan (MVP sesuai PRD §21)

- Setup awal & kunci PIN aplikasi
- Dashboard: pendapatan/transaksi/laba hari ini, peringatan stok & EXP,
  grafik penjualan, produk terlaris
- Manajemen Produk & Kategori (CRUD, nonaktifkan, hapus jika belum ada
  riwayat transaksi)
- Manajemen Stok: stok saat ini per batch, restock (otomatis membuat batch +
  mencatat pengeluaran), riwayat pergerakan stok, koreksi stok manual
- Manajemen EXP: status Aman / Mendekati / Hari ini / Sudah EXP per batch,
  ambang waktu bisa diatur, tombol "buang" untuk stok kedaluwarsa
- **FEFO** diterapkan otomatis saat transaksi (batch dengan EXP terdekat
  dipakai duluan; batch tanpa tanggal EXP dijual paling akhir)
- Transaksi/POS: keranjang, berbagai metode bayar, hitung kembalian otomatis,
  validasi stok di server (bukan cuma di frontend)
- Struk bergaya kertas thermal (58/80mm), cetak lewat dialog print browser
- Riwayat transaksi + **void** (pembatalan yang mengembalikan stok, riwayat
  tetap tersimpan sesuai aturan bisnis PRD §19)
- Keuangan: pendapatan, pengeluaran, HPP, laba kotor, arus kas bersih
- Laporan: penjualan, stok, EXP, keuangan — semua bisa difilter per periode

Fitur Phase 2/3 di PRD (barcode scanner, multi-user/role, piutang, dsb)
belum termasuk di build ini — arsitektur `action`-based di `Code.gs`
dirancang supaya mudah ditambah endpoint baru tanpa mengubah struktur yang
ada.

## Pengujian

```bash
cd frontend
npm test          # vitest — unit test helper + integration test alur app
```

Test mencakup: alur setup toko, login PIN, penanganan saat backend belum
terhubung, navigasi antar halaman, dan **modal pembayaran POS** (termasuk
kasus tombol "Selesaikan" nonaktif/aktif sesuai metode & nominal — ini
menutup bug yang sebelumnya dilaporkan).

Logika `backend/Code.gs` juga sudah diverifikasi lewat simulasi runtime Apps
Script (FEFO, validasi stok, void, write-off, dll) sebelum diserahkan —
lihat catatan di riwayat pengembangan proyek ini bila perlu menelusuri.

## Struktur folder

```
warung-app/
├── backend/
│   ├── Code.gs        ← tempel ke Apps Script editor
│   └── SETUP.md        ← panduan deploy + skema spreadsheet
├── dev-mock-server/
│   └── server.mjs       ← backend palsu untuk dev lokal (opsional)
└── frontend/
    ├── src/
    │   ├── lib/          (api client, helpers, constants, context)
    │   ├── components/   (ui primitives, navigasi, struk)
    │   └── views/         (dashboard, produk, stok, exp, pos, dst.)
    ├── .env.example
    └── package.json
```
