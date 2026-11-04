# Sistem Klasifikasi Keberhasilan Pengobatan Pasien MDR-TB

Implementasi sistem klasifikasi keberhasilan pengobatan pasien *Multidrug-Resistant Tuberculosis* (MDR-TB) menggunakan teknik **SMOTE** untuk penanganan ketidakseimbangan kelas dan algoritma **Random Forest** sebagai model klasifikasi.

Data penelitian berasal dari rekam medis pasien MDR-TB RSUD Labuang Baji, berjumlah 175 data dengan 17 variabel prediktor.

## Arsitektur

Sistem terdiri atas dua bagian yang berkomunikasi melalui REST API:

| Direktori | Peran | Teknologi |
| :-- | :-- | :-- |
| `mdr-tb-prediction/` | Aplikasi web dan antarmuka pengguna | Laravel 12, Inertia.js, React, TypeScript, Tailwind CSS |
| `ml-service/` | Layanan pemrosesan data dan klasifikasi | Flask, scikit-learn, imbalanced-learn, pandas |

## Aktor Sistem

| Aktor | Kewenangan |
| :-- | :-- |
| Admin | Mengelola akun pengguna dan data rekam medis, melakukan pembersihan data, melatih ulang model, serta menjalankan skenario pengujian |
| Tenaga medis | Menginput data pasien, memperoleh hasil klasifikasi, melihat riwayat klasifikasinya sendiri, dan melihat hasil evaluasi model |

Sistem tidak menyediakan akses publik maupun pendaftaran mandiri. Seluruh akun dibuat oleh admin karena data yang diproses merupakan data rekam medis yang dilindungi Undang-Undang Nomor 27 Tahun 2022.

## Variabel Penelitian

**Variabel numerik (4):** `Ket.Usia` (usia dalam tahun), `BB` (berat badan), `TB` (tinggi badan), `IMT` (indeks massa tubuh).

**Variabel kategorikal (13):** `Usia` (kategori usia), `Jenis Kelamin`, `Status Bekerja`, `Status Gizi`, `Status Merokok`, `Pemeriksaan Kontak`, `Riwayat_DM`, `Riwayat_HIV`, `Komorbiditas`, `Kepatuhan Minum Obat`, `Efek Samping Obat`, `Riwayat Pengobatan Sebelumnya`, `Panduan Pengobatan`.

**Variabel target:** `Keberhasilan Pengobatan` dengan nilai `Berhasil` (kode 0) dan `Tidak Berhasil` (kode 1).

Dua variabel di antaranya bersifat **turunan** dan dihitung sistem, bukan diisi operator:

| Variabel turunan | Dihitung dari | Aturan |
| :-- | :-- | :-- |
| Indeks massa tubuh (`IMT`) | Berat dan tinggi badan | BB / (TB dalam meter)² |
| Kategori usia (`Usia`) | Usia dalam tahun | Kurang dari 45 tahun tergolong usia produktif, selebihnya usia lanjut |

Perhitungan otomatis ini menjaga kedua variabel selalu selaras dengan data pasien, sehingga tidak dapat terjadi pencatatan yang bertentangan seperti pasien berusia 48 tahun yang tercatat sebagai usia produktif.

### Informasi Pengobatan

Formulir klasifikasi juga meminta **tanggal awal pengobatan**. Tanggal ini bukan variabel model — model tetap memakai 17 variabel penelitian — melainkan metadata yang disimpan bersama hasil klasifikasi untuk menurunkan dua informasi tampilan:

| Informasi turunan | Dihitung dari | Aturan |
| :-- | :-- | :-- |
| Durasi pengobatan | Tanggal awal pengobatan sampai hari ini | Bulan kalender tanpa *overflow* (31 Januari + 1 bulan = 28/29 Februari), ditambah sisa hari |
| Status pengobatan | Durasi pengobatan | Kurang dari 6 bulan tergolong pengobatan baru, 6 bulan atau lebih tergolong pengobatan lama |

Nilai durasi dan status disimpan sebagai potret saat klasifikasi dilakukan, sehingga riwayat tidak berubah seiring berjalannya waktu. Tanggal wajib diisi pada klasifikasi baru, tetapi opsional pada data rekam medis lama agar 175 baris dataset tetap dapat disunting tanpa melengkapi tanggal yang tidak tercatat. Perhitungan di server (`TrainingData::durasiPengobatan`) dan pratinjau di peramban (`resources/js/lib/variabel.ts`) memakai algoritma yang sama, dan zona waktu acuan adalah `Asia/Makassar`.

Kelas `Tidak Berhasil` merupakan kelas minoritas sekaligus kelas positif pada perhitungan metrik, sehingga *recall* menjadi metrik utama: kesalahan yang paling dihindari adalah pasien berisiko gagal yang tidak terdeteksi (*false negative*).

## Alur Pemodelan

1. **Pembersihan data** — penghapusan data duplikat dan data dengan nilai kosong.
2. **Rekayasa fitur** — perhitungan IMT dan penentuan kategori usia.
3. **Label encoding** — konversi variabel kategorikal menjadi numerik dengan pemetaan tetap.
4. **Pembagian data** — 80% data latih dan 20% data uji secara *stratified*.
5. **Normalisasi** — `StandardScaler` diterapkan sebelum SMOTE agar perhitungan jarak antartetangga pada SMOTE tidak didominasi variabel berskala besar seperti tinggi badan.
6. **Penerapan SMOTE** — hanya pada data latih, agar data uji tetap merepresentasikan distribusi asli.
7. **Hyperparameter tuning** — pencarian *grid* pada `n_estimators`, `max_depth`, `min_samples_split`, dan `random_state`.
8. **Evaluasi** — *confusion matrix*, *accuracy*, *precision*, *recall*, *F1-score*, dan *feature importance*.

Tahap 5 sampai 7 dirangkai dalam satu `imblearn.pipeline.Pipeline` dengan urutan `scaler → smote → classifier`. Perangkaian ini diperlukan agar normalisasi dan SMOTE hanya dipelajari dari data latih pada setiap lipatan *cross validation*, sehingga metrik yang dilaporkan tidak terpengaruh kebocoran data (*data leakage*).

## Prasyarat

- PHP 8.2 atau lebih baru beserta Composer
- Node.js 18 atau lebih baru beserta npm
- Python 3.10 atau lebih baru
- MySQL 8.0 atau MariaDB

## Instalasi

### 1. Aplikasi web

```bash
cd mdr-tb-prediction
composer install
npm install
cp .env.example .env
php artisan key:generate
```

Buat basis data kosong bernama `laravel_mdr`, lalu sesuaikan berkas `.env`:

```env
APP_NAME="Klasifikasi MDR-TB"
APP_LOCALE=id

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel_mdr
DB_USERNAME=root
DB_PASSWORD=

ML_SERVICE_URL=http://localhost:5000
```

Jalankan migrasi beserta data awal:

```bash
php artisan migrate --seed
```

Perintah ini memuat 175 data rekam medis dari `ml-service/data/data_uji_ml.csv` serta membuat dua akun:

| Peran | Email | Kata sandi |
| :-- | :-- | :-- |
| Admin | `admin@mdrtb.test` | `password` |
| Tenaga medis | `tenagamedis@mdrtb.test` | `password` |

### 2. Layanan klasifikasi

```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Menjalankan Sistem

Cara termudah, dari direktori utama:

```bash
./start-all.sh
```

Skrip tersebut menjalankan layanan klasifikasi (port 5000), aplikasi web (port 8000), dan server aset (port 5173) sekaligus. Tekan `Ctrl+C` untuk menghentikan semuanya.

Untuk menjalankan secara manual, gunakan tiga terminal terpisah:

```bash
# Terminal 1 — layanan klasifikasi
cd ml-service && source venv/bin/activate && python app.py

# Terminal 2 — aplikasi web
cd mdr-tb-prediction && php artisan serve

# Terminal 3 — server aset
cd mdr-tb-prediction && npm run dev
```

Aplikasi dapat diakses pada `http://localhost:8000`.

## Fitur Aplikasi

| Menu | Keterangan | Akses |
| :-- | :-- | :-- |
| Dashboard | Ringkasan menu yang tersedia sesuai peran pengguna | Semua |
| Klasifikasi | Formulir masukan 17 variabel dan tanggal awal pengobatan, hasil klasifikasi, dan rekomendasi tindakan klinis | Semua |
| Riwayat | Daftar hasil klasifikasi beserta detail masukan | Semua |
| Evaluasi Model | *Confusion matrix*, metrik evaluasi, dan *feature importance* | Semua |
| Pengujian SMOTE | Perbandingan performa model dengan dan tanpa SMOTE | Admin |
| Skenario Pengujian | Variasi proporsi pembagian data dan jumlah pohon | Admin |
| Data Rekam Medis | Pengelolaan dataset dan pelatihan ulang model | Admin |
| Pembersihan Data | Ringkasan hasil pemeriksaan duplikat dan nilai kosong | Admin |
| Manajemen Akun | Pengelolaan akun admin dan tenaga medis | Admin |

### Rekomendasi Tindakan Klinis

Halaman hasil klasifikasi tidak berhenti pada label `Berhasil` atau `Tidak Berhasil`. Sistem juga menampilkan rekomendasi tindakan penanganan agar intervensi medis dapat dilakukan lebih awal, sesuai peran sistem pendukung keputusan yang diuraikan pada Bab II.

Rekomendasi disusun berbasis aturan (*rule based*) oleh `app/Services/RekomendasiKlinis.php` atas nilai variabel yang dimasukkan tenaga medis, bukan dihasilkan oleh model Random Forest. Model hanya menghasilkan label dan probabilitas, sedangkan penalaran tindakan mengikuti faktor risiko yang teramati pada dataset penelitian.

Setiap aturan divalidasi terhadap 175 data rekam medis: sebuah faktor hanya dipertahankan bila kelompok pasien yang memenuhi kondisi memiliki tingkat kegagalan pengobatan lebih tinggi dibanding kelompok pembanding (baseline 30,9%). Prioritas ditentukan dari besarnya selisih:

| Faktor risiko | Selisih tingkat kegagalan | Prioritas |
| :-- | --: | :-- |
| Tidak patuh minum obat | +85,0 poin | Tinggi |
| Regimen jangka panjang | +69,2 poin | Tinggi |
| Riwayat pengobatan ulang | +51,7 poin | Tinggi |
| Masih merokok | +39,5 poin | Sedang |
| Riwayat diabetes melitus | +26,0 poin | Sedang |
| Komorbiditas lain | +25,6 poin | Sedang |
| Usia lanjut | +16,0 poin | Sedang |
| Riwayat HIV | +7,0 poin | Sedang |

Aturan yang arah kegagalannya bertentangan dengan data tidak dimasukkan; sebagai contoh, "pemeriksaan kontak belum dilakukan" pada dataset ini justru berkorelasi dengan keberhasilan, sehingga tidak dijadikan penanda risiko.

Sistem juga menyimpulkan tingkat risiko pasien:

| Tingkat risiko | Kondisi |
| :-- | :-- |
| Tinggi | Model mengklasifikasikan pasien `Tidak Berhasil` |
| Sedang | Pasien diklasifikasikan `Berhasil` namun memiliki faktor risiko berprioritas tinggi, atau tiga faktor risiko atau lebih |
| Rendah | Pasien diklasifikasikan `Berhasil` dengan paling banyak dua faktor risiko berprioritas sedang |

Pemisahan ini membuat pasien yang diklasifikasikan berhasil tetapi tidak patuh minum obat tidak lolos dari perhatian tenaga medis. Keputusan klinis akhir tetap berada pada tenaga medis.

## Pengujian

```bash
cd mdr-tb-prediction
php artisan test
```

## Pemecahan Masalah

**Port 5000 sudah terpakai.** Hentikan proses lama:

```bash
lsof -ti:5000 | xargs kill -9
```

**Tampilan tidak muncul dengan benar.** Pastikan `npm run dev` berjalan, atau jalankan `npm run build` untuk mode produksi.

**Model belum dilatih.** Buka menu Data Rekam Medis sebagai admin, lalu tekan tombol *Latih Ulang Model*.

**Koneksi basis data gagal.** Periksa kredensial pada `.env` dan pastikan layanan MySQL sudah berjalan.

**Layanan klasifikasi tidak dapat dihubungi.** Pastikan `ML_SERVICE_URL` pada `.env` sesuai dan layanan Flask sudah berjalan.
