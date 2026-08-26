# Backend Setup — Google Apps Script + Google Sheets

Arsitektur mengikuti PRD: **Google Sheets** sebagai database, **Google Apps
Script** sebagai backend/API, diakses lewat HTTPS oleh frontend yang di-hosting
terpisah (misalnya di Vercel).

```
Frontend (Vercel)  --HTTPS-->  Apps Script Web App (Code.gs)  -->  Google Sheets
```

## 1. Buat Google Sheet baru

1. Buka [sheets.google.com](https://sheets.google.com) → buat spreadsheet baru.
2. Beri nama, misalnya **"Database Warung Berkah Jaya"**.
3. Anda **tidak perlu** membuat sheet/tab apa pun secara manual — setiap tab
   (Products, Stock_Batches, dll) otomatis dibuat oleh skrip saat pertama kali
   diakses, lengkap dengan header kolom.

## 2. Pasang Code.gs

1. Di spreadsheet tadi, buka **Extensions → Apps Script**.
2. Hapus isi default `Code.gs`, lalu tempel seluruh isi file
   [`Code.gs`](./Code.gs) dari folder ini.
3. Simpan (Ctrl/Cmd+S). Beri nama proyek, misalnya "Warung API".
4. *(Opsional)* Pilih fungsi `setupSheets` di dropdown toolbar lalu klik
   **Run** sekali — ini akan langsung membuat semua tab dengan header kolom
   supaya Anda bisa melihat skemanya. Saat run pertama, Google akan meminta
   izin akses ke spreadsheet Anda — klik **Allow**.

## 3. Deploy sebagai Web App

1. Klik **Deploy → New deployment**.
2. Klik ikon gear di "Select type" → pilih **Web app**.
3. Isi:
   - **Execute as**: `Me` (akun Google Anda)
   - **Who has access**: `Anyone`
4. Klik **Deploy**, lalu **Authorize access** dan pilih akun Google Anda.
5. Salin **Web app URL** yang muncul — bentuknya seperti:
   `https://script.google.com/macros/s/AKfycbx.../exec`

⚠️ **Setiap kali Anda mengubah isi Code.gs**, Anda harus membuat deployment
baru (**Deploy → Manage deployments → Edit (pensil) → New version → Deploy**)
agar perubahan aktif di URL yang sama. Ini perilaku standar Apps Script, bukan
bug.

## 4. Hubungkan ke frontend

Di folder `frontend/`, salin `.env.example` menjadi `.env` lalu isi:

```
VITE_API_URL=https://script.google.com/macros/s/AKfycbx.../exec
```

Jalankan `npm run dev` atau deploy ke Vercel dengan environment variable yang
sama (`VITE_API_URL`) di pengaturan project Vercel.

## Skema Spreadsheet

Setiap sheet berikut dibuat otomatis dengan header ini (sesuai PRD §18):

| Sheet | Kolom |
|---|---|
| **Settings** | `store_name, address, phone, admin_name, pin, exp_warning_days, receipt_width` (1 baris data) |
| **Categories** | `category_id, name, status` |
| **Products** | `product_id, name, category_id, unit, purchase_price, selling_price, minimum_stock, status, created_at, updated_at` |
| **Stock_Batches** | `batch_id, product_id, quantity, remaining_quantity, purchase_price, purchase_date, expiry_date, status, created_at` |
| **Stock_Movements** | `movement_id, product_id, batch_id, type, quantity, reference_id, note, created_at` — `type`: `RESTOCK / SALE / ADJUSTMENT / EXPIRED / RETURN` |
| **Transactions** | `transaction_id, transaction_number, transaction_date, total_amount, payment_method, paid_amount, change_amount, status, created_at` |
| **Transaction_Items** | `item_id, transaction_id, product_id, product_name, batch_id, quantity, purchase_price, selling_price, subtotal` — satu baris per **batch** yang terpakai (FEFO bisa memecah satu baris keranjang menjadi beberapa baris di sini) |
| **Expenses** | `expense_id, date, category, amount, description, auto, created_at` |

Anda bisa membuka sheet-sheet ini kapan saja untuk audit manual, backup
(File → Download), atau membuat laporan tambahan langsung dengan formula
Spreadsheet jika PRD Phase 2/3 (export Excel, dsb) diperlukan nanti.

## Cara kerja API

- **Satu endpoint** (Web App URL) menangani semuanya lewat parameter `action`.
- `GET  ?action=bootstrap` → mengembalikan seluruh data (settings, produk,
  stok, transaksi, dll) sudah dihitung (stok tersedia, status EXP, dst).
- `POST` dengan body JSON `{ "action": "...", "payload": {...} }` untuk semua
  operasi tulis (tambah produk, restock, transaksi, dll). Lihat daftar
  lengkap `action` di `ACTIONS` pada `Code.gs`.
- Setiap `POST` yang berhasil mengembalikan **seluruh dataset terbaru**
  (bentuknya sama seperti `bootstrap`), jadi frontend cukup satu kali
  request per aksi.
- Body POST dikirim dengan `Content-Type: text/plain` (bukan
  `application/json`) **dengan sengaja** — ini membuatnya jadi "simple
  request" di mata browser sehingga tidak memicu CORS preflight (`OPTIONS`),
  yang tidak didukung baik oleh Apps Script Web App. Endpoint tetap mem-parse
  body sebagai JSON di sisi server.

## Keamanan — mohon dibaca

- Deployment `Anyone` berarti **siapa pun yang tahu URL Web App** bisa
  memanggil API ini. PIN di aplikasi hanyalah kunci layar (UI lock), **bukan**
  otentikasi API sungguhan.
- Untuk pemakaian pribadi/internal warung, risiko ini umumnya wajar selama
  URL tidak disebar publik — tapi jangan cantumkan URL ini di kode frontend
  yang repository-nya publik tanpa menyadari risikonya.
- Jika butuh keamanan lebih, opsi lanjutan (di luar cakupan build ini):
  menambah header `X-API-Key` custom yang divalidasi di awal `doPost`, atau
  membatasi `Who has access` ke domain Google Workspace Anda jika warung
  memakai akun Workspace.

## Batasan yang perlu diketahui

- **Concurrency**: setiap `POST` dikunci dengan `LockService` (maks. tunggu
  10 detik) supaya dua transaksi yang masuk bersamaan tidak saling menimpa
  data. Untuk satu warung dengan satu kasir, ini lebih dari cukup.
- **Kapasitas**: Google Sheets nyaman untuk puluhan ribu baris. Untuk warung
  dengan volume transaksi sangat tinggi selama bertahun-tahun tanpa
  pernah diarsipkan, pertimbangkan migrasi ke database sungguhan di masa
  depan — arsitektur `action`-based ini membuat penggantian backend relatif
  mudah tanpa mengubah frontend.
- **Cetak struk thermal**: tombol "Cetak" memakai dialog print bawaan
  browser (bisa pilih printer thermal atau "Save as PDF"). Integrasi
  langsung ke printer thermal via ESC/POS di luar cakupan aplikasi web ini.
