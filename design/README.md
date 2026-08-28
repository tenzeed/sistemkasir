# Ikon Aplikasi

Ikon aplikasi saat ini adalah **logo yang diunggah sendiri oleh pemilik toko**
(bukan lagi `icon-master.svg` di folder ini). File aslinya diproses jadi:

- `frontend/public/icon-512.png` (512×512)
- `frontend/public/icon-192.png` (192×192)
- `frontend/public/apple-touch-icon.png` (180×180, latar transparan diratakan ke putih untuk iOS)
- `frontend/public/favicon-32.png` dan `favicon-16.png`

`icon-master.svg` di folder ini adalah desain **bawaan/lama** (toko indigo
bergaya flat) — disimpan sebagai cadangan kalau suatu saat ingin kembali ke
ikon default, atau sebagai referensi ukuran/safe-zone kalau membuat ikon
baru lagi nanti.

Catatan: karena logo custom ini adalah ilustrasi detail (bukan bentuk
sederhana), ikon ini didaftarkan dengan `purpose: "any"` saja di
`manifest.webmanifest` (bukan `"maskable"`). Ikon "maskable" dipotong paksa
oleh Android jadi berbagai bentuk (lingkaran, dsb.) berdasarkan area aman di
tengah — untuk ilustrasi serapat ini, itu berisiko memotong detail penting
(keranjang, mesin kasir). Kalau nanti ingin versi maskable yang proper,
perlu dibuat versi ikon dengan padding ekstra di sekelilingnya.
