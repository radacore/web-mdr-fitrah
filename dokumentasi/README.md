# Dokumentasi Presentasi Aplikasi

Dokumentasi satu halaman A4 per fitur, dipakai mahasiswa saat mempresentasikan
aplikasi kepada dosen pembimbing. Isi ditulis sebagai data di `konten.mjs`,
screenshot diambil otomatis, lalu dirender menjadi satu berkas HTML yang siap
dicetak atau disimpan sebagai PDF.

## Struktur

```
dokumentasi/
├── konten.mjs             ISI DOKUMENTASI — satu objek = satu halaman
├── template.html          kerangka dokumen (token {{STYLE}}, {{PAGES}}, …)
├── style.css              tata letak A4 dan aturan cetak
├── build.mjs              konten.mjs → dokumentasi.html
├── capture.mjs            screenshot otomatis dari aplikasi berjalan
├── periksa.mjs            pemeriksa luberan halaman dan gambar rusak
├── package.json           perintah build / watch / capture / check / pdf
├── pages/00-sampul.html   sampul + daftar isi otomatis (satu-satunya HTML manual)
├── assets/                screenshot hasil capture (login.png, dashboard.png, …)
└── dokumentasi.html       hasil build — jangan disunting manual
```

## Perintah

```bash
cd dokumentasi
npm run build     # render konten.mjs → dokumentasi.html
npm run watch     # bangun ulang otomatis saat konten/aset berubah
npm run capture   # ambil ulang semua screenshot (butuh Laravel + Flask aktif)
npm run check     # build + periksa halaman tidak terpotong dan gambar dimuat
npm run pdf       # build lalu cetak ke dokumentasi.pdf (Chrome headless)
```

Buka `dokumentasi.html` di peramban, lalu tekan tombol **Cetak / Simpan PDF**
atau `Cmd/Ctrl + P` → *Save as PDF* → ukuran A4 → margin *Default* →
aktifkan *Background graphics*.

## Menambah atau merevisi satu halaman

Cukup sunting `konten.mjs`. Setiap objek menghasilkan satu halaman:

| Properti | Isi |
| :-- | :-- |
| `slug` | nama berkas screenshot di `assets/` tanpa ekstensi |
| `judul` | judul halaman dan daftar isi |
| `modul` | nama modul di kepala halaman dan daftar isi |
| `shot` | nama gambar; kosongkan untuk halaman tanpa gambar |
| `rasio` | rasio bingkai gambar, mis. `16 / 9`, `16 / 10`, `4 / 3` |
| `caption` | keterangan di bawah gambar |
| `subjudul` | ringkasan satu paragraf di bawah judul |
| `fungsi` | isi kolom kiri panel penjelasan |
| `inti` | kalimat kunci pada kotak sorotan |
| `poin` | daftar poin pada kolom kanan |

Markah teks yang didukung:

| Tulis | Hasil |
| :-- | :-- |
| `**tebal**` | **tebal** |
| `*miring*` | *miring* |
| `` `kode` `` | `kode` bergaya monospace |

Nomor halaman, nomor gambar, dan daftar isi dihitung otomatis. Halaman sampul
tetap berupa HTML manual karena memuat tabel identitas dan tata letak khusus.

## Mengganti screenshot

Jalankan aplikasi (Laravel port 8000 dan Flask port 5000), lalu:

```bash
node capture.mjs            # semua halaman
node capture.mjs hasil      # satu halaman saja
```

`capture.mjs` masuk sebagai admin, mengisi formulir contoh, menjalankan
pengujian SMOTE/skenario, dan menyimpan hasil ke `assets/`. Tanggal awal
pengobatan contoh dihitung tepat **8 bulan 12 hari** sebelum hari ini agar
durasi dan status pengobatan pada tangkapan layar konsisten dengan narasi.

Ukuran viewport: lebar 1440 px dengan `deviceScaleFactor` 2, tinggi mengikuti
`rasio` halaman — 810 px (16:9), 900 px (16:10), atau 1080 px (4:3). Screenshot
yang lebih panjang dari viewport akan terpotong di bawah; karena itu halaman
panjang dipotret pada bagian yang paling penting (formulir klasifikasi dan
formulir rekam medis otomatis menggulir ke bagian tanggal pengobatan).

## Pemeriksaan sebelum mencetak

```bash
npm run check
```

Perintah ini membuka `dokumentasi.html` di Chrome headless dan memastikan isi
setiap halaman tidak melewati area A4 serta semua gambar berhasil dimuat. Bila
ada halaman meluber, ringkas `poin` atau `fungsi` di `konten.mjs` — jangan
mengecilkan font di bawah 7,5pt.

## Catatan tata letak

Lembar memakai tinggi tetap: `210mm × 297mm` di layar, dan `257mm` saat
dicetak (297mm dikurangi margin 20mm atas-bawah). Bingkai gambar memakai
`aspect-ratio` sesuai properti `rasio`, sehingga screenshot tidak terdistorsi.
Isi satu halaman: kepala → judul fitur → gambar → panel penjelasan (dua kolom)
→ kaki halaman.
