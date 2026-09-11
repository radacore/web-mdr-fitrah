# 🏥 MDR-TB Prediction System

Sistem cerdas berbasis Machine Learning untuk memprediksi keberhasilan pengobatan pasien *Multi-Drug Resistant Tuberculosis* (MDR-TB). Proyek ini menggabungkan ekosistem **Laravel 12** yang modern dengan **Machine Learning Service** berbasis Python untuk memberikan prediksi medis yang akurat dan berbasis data.

---

## 🏗️ Arsitektur Proyek

Proyek ini terbagi menjadi dua sub-sistem utama yang saling berkomunikasi melalui REST API:

1.  **[`mdr-tb-prediction/`](./mdr-tb-prediction)**:
    - **Peran**: Web Application & User Interface.
    - **Tech Stack**: Laravel 12, React (Inertia.js), Tailwind CSS, Shadcn UI.
    - **Fitur**: Dashboard, CRUD Data Training, Riwayat Prediksi, Autentikasi.

2.  **[`ml-service/`](./ml-service)**:
    - **Peran**: Machine Learning Engine.
    - **Tech Stack**: Flask, Scikit-learn, Pandas, Joblib.
    - **Fitur**: Preprocessing data medis, Training Model, Prediksi Real-time.

---

## 🚀 Panduan Instalasi & Setup (Lengkap)

Lakukan langkah-langkah berikut secara berurutan:

### 1. Prasyarat Sistem
- **PHP**: ^8.2 (dengan extension `bcmath`, `ctype`, `fileinfo`, `json`, `mbstring`, `openssl`, `pdo`, `tokenizer`, `xml`)
- **Node.js**: ^18.x atau versi terbaru
- **Python**: ^3.13 (disarankan menggunakan `venv`)
- **Database**: MySQL 8.0+ atau MariaDB
- **Web Server**: Apache / Nginx (opsional untuk lokal)

### 2. Konfigurasi Web Application (Laravel)
```bash
cd mdr-tb-prediction

# Instalasi Dependensi
composer install
npm install

# Environment && Key
cp .env.example .env
php artisan key:generate
```

**Konfigurasi Database `.env`:**
Buat database kosong di MySQL bernama `mdr_prediction`, lalu masukkan kredensialnya:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mdr_prediction
DB_USERNAME=root
DB_PASSWORD=YOUR_PASSWORD

# URL integrasi dengan ML Service
ML_SERVICE_URL=http://localhost:5000
```

**Migration & Initialization:**
Aplikasi ini sudah menyertakan data riset awal (175 data pasien) yang akan langsung masuk ke database:
```bash
php artisan migrate --seed
```

---

### 3. Konfigurasi Machine Learning Service (Python)
Gunakan terminal baru untuk menjalankan Python service:
```bash
cd ml-service

# Membuat Virtual Environment (Rekomendasi)
python3 -m venv venv

# Aktivasi
source venv/bin/activate  # Untuk Linux/macOS
# venv\Scripts\activate   # Untuk Windows

# Instalasi Library ML
pip install -r requirements.txt
```

---

## 🏃 Cara Menjalankan Aplikasi (Step-by-Step)

Untuk menjalankan seluruh sistem, pastikan Anda mengikuti urutan berikut di terminal terpisah:

### Langkah 1: Jalankan Laravel Backend
Buka terminal dan masuk ke folder Laravel:
```bash
cd mdr-tb-prediction && php artisan serve
```
*Pastikan backend berjalan di http://localhost:8000. Laravel harus aktif lebih dulu karena Machine Learning Service memerlukan akses ke API Laravel saat startup.*

### Langkah 2: Jalankan Frontend Watcher (Vite)
Buka terminal baru dan jalankan compiler asset:
```bash
cd mdr-tb-prediction && npm run dev
```
*Ini diperlukan agar tampilan UI (React & Tailwind) muncul dengan benar.*

### Langkah 3: Jalankan Machine Learning Service (Flask)
Buka terminal baru lagi dan jalankan Python service:
```bash
cd ml-service && source venv/bin/activate && python app.py
```
*Service akan berjalan di http://localhost:5000 dan akan mencoba mengambil data training dari Laravel API.*

---

**Akses Aplikasi**: Buka browser Anda di **`http://localhost:8000`**

---

## 🧠 Detail Machine Learning & Data

### Algoritma yang Diimplementasikan:
Sistem melatih 4 model secara bersamaan dan memilih yang terbaik berdasarkan skor F1:
- **Logistic Regression**: Untuk baseline statistik.
- **Decision Tree**: Visualisasi logika keputusan.
- **K-Nearest Neighbor (KNN)**: Pengelompokan pasien berdasarkan kedekatan profil medis.
- **Support Vector Machine (SVM)** (**BEST MODEL** - memberikan akurasi tertinggi pada dataset MDR-TB).

### Manual Label Encoding Mappings (Single Source of Truth):
Untuk menjamin hasil prediksi yang konsisten, mapping kategorikal telah di-hardcode di `ml-service/src/preprocessing.py`:

| Fitur | Mapping Nilai (Encoded) |
| :--- | :--- |
| **Usia** | Produktif (0), Lanjut (1) |
| **Gender** | Laki-Laki (0), Perempuan (1) |
| **Status Gizi** | Kurang (0), Normal (1), Lebih (2) |
| **DM / HIV** | Tidak (0), Ada/Ya (1) |
| **Kepatuhan Obat** | Patuh (0), Tidak Patuh (1) |
| **Efek Samping** | Tidak Ada Keluhan (0), Ada Keluhan (1) |
| **Pengobatan** | Jangka Pendek (0), Jangka Panjang (1) |
| **Hasil** | Berhasil (0), Tidak Berhasil (1) |

---

## 🛠️ Pemecahan Masalah (Troubleshooting)

- **Port 5000 Digunakan**: Jika ML Service gagal dijalankan karena port 5000 sibuk, gunakan perintah `lsof -ti:5000 | xargs kill -9` di Linux untuk membersihkan port tersebut.
- **Vite Error**: Pastikan Anda menjalankan `npm run dev` agar CSS dan JavaScript (React) terkompilasi dengan benar.
- **Database Connection Refused**: Cek kredensial di `.env` dan pastikan server MySQL/XAMPP Anda sudah menyala.
- **Python Externally Managed**: Jika `pip` error, pastikan Anda sudah masuk ke `venv` (virtual environment) sesuai langkah di atas.

---

## 📜 Lisensi
Proyek ini dikembangkan untuk tujuan medis dan riset. Lisensi terbuka [MIT](LICENSE).
