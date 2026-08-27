# Sumber Ikon Aplikasi

`icon-master.svg` adalah sumber desain ikon PWA (toko/warung dengan tenda
garis-garis, di atas gradasi hijau khas aplikasi ini).

Kalau suatu saat ingin mengganti dengan logo warung Anda sendiri, edit file
ini lalu jalankan (butuh `librsvg2-bin`: `apt-get install librsvg2-bin` di
Linux, atau tools serupa di macOS/Windows):

```bash
rsvg-convert -w 512 -h 512 icon-master.svg -o ../frontend/public/icon-512.png
rsvg-convert -w 192 -h 192 icon-master.svg -o ../frontend/public/icon-192.png
rsvg-convert -w 180 -h 180 icon-master.svg -o ../frontend/public/apple-touch-icon.png
rsvg-convert -w 32  -h 32  icon-master.svg -o ../frontend/public/favicon-32.png
rsvg-convert -w 16  -h 16  icon-master.svg -o ../frontend/public/favicon-16.png
```

Catatan desain: jaga elemen penting tetap berada dalam lingkaran 80% di
tengah kanvas (safe zone), karena ikon "maskable" akan dipotong ke berbagai
bentuk (lingkaran, persegi rounded, dsb) oleh masing-masing perangkat.
