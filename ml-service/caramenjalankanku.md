# Layanan Klasifikasi MDR-TB

Layanan Flask yang menangani pemrosesan data, pelatihan model **Random Forest** dengan penyeimbangan data **SMOTE**, serta klasifikasi keberhasilan pengobatan pasien MDR-TB.

Layanan ini dipanggil oleh aplikasi web Laravel dan tidak dimaksudkan untuk diakses langsung oleh pengguna akhir.

## Prasyarat

- Python 3.10 atau lebih baru
- pip

## Instalasi

```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Pustaka yang digunakan:

| Pustaka | Kegunaan |
| :-- | :-- |
| `flask`, `flask-cors` | Kerangka kerja web dan izin lintas asal |
| `pandas`, `numpy` | Pengolahan dan komputasi data |
| `scikit-learn` | Random Forest, pembagian data, pencarian *grid*, metrik evaluasi |
| `imbalanced-learn` | Teknik SMOTE untuk penyeimbangan kelas |
| `joblib` | Penyimpanan dan pemuatan model |
| `gunicorn` | Server WSGI untuk mode produksi |

## Menjalankan Layanan

Mode pengembangan:

```bash
python3 app.py
```

Mode produksi:

```bash
gunicorn --bind 0.0.0.0:5000 app:app
```

Layanan berjalan pada `http://localhost:5000`. Tekan `Ctrl+C` untuk menghentikan.

Model yang tersimpan pada direktori `models/` dimuat otomatis saat layanan dijalankan.

## Struktur Direktori

```
ml-service/
├── app.py                  Endpoint REST API
├── requirements.txt        Daftar pustaka
├── caramenjalankanku.md    Panduan ini
├── data/
│   └── data_uji_ml.csv     Data rekam medis penelitian (175 data)
├── models/
│   ├── preprocessor.pkl    Objek pemroses data beserta pemetaan label
│   ├── random_forest.pkl   Model hasil pelatihan
│   └── model_info.pkl      Parameter terbaik, hasil evaluasi, dan informasi SMOTE
└── src/
    ├── preprocessing.py    Pembersihan data, rekayasa fitur, label encoding
    ├── training.py         Pembagian data, SMOTE, hyperparameter tuning
    └── evaluation.py       Confusion matrix dan metrik evaluasi
```

## Daftar Endpoint

| Metode | Endpoint | Keterangan |
| :-- | :-- | :-- |
| `GET` | `/health` | Status layanan dan ketersediaan model |
| `GET` | `/features` | Daftar variabel beserta pemetaan label |
| `GET` | `/statistics` | Hasil evaluasi model yang sedang digunakan |
| `POST` | `/predict` | Klasifikasi satu data pasien |
| `POST` | `/retrain` | Pelatihan ulang model menggunakan data yang dikirim |
| `POST` | `/compare-smote` | Perbandingan performa model dengan dan tanpa SMOTE |
| `POST` | `/test-scenarios` | Variasi proporsi pembagian data dan jumlah pohon |

Endpoint `/retrain`, `/compare-smote`, dan `/test-scenarios` menerima data pada kunci `data` berupa senarai objek. Pelatihan pada `/compare-smote` dan `/test-scenarios` bersifat sementara dan tidak mengubah model yang sedang digunakan.

## Contoh Penggunaan

Memeriksa status layanan:

```bash
curl http://localhost:5000/health
```

```json
{
  "status": "healthy",
  "is_trained": true,
  "model": "Random Forest"
}
```

Klasifikasi satu data pasien:

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "ket_usia": 35,
    "jenis_kelamin": "Laki-Laki",
    "status_bekerja": "Bekerja",
    "bb": 65,
    "tb": 170,
    "status_gizi": "Gizi Normal",
    "status_merokok": "Tidak Merokok",
    "pemeriksaan_kontak": "Ya",
    "riwayat_dm": "Tidak",
    "riwayat_hiv": "Tidak",
    "komorbiditas": "Tidak Ada",
    "kepatuhan_minum_obat": "Patuh",
    "efek_samping_obat": "Tidak Ada Keluhan",
    "riwayat_pengobatan": "Baru",
    "panduan_pengobatan": "Jangka Pendek"
  }'
```

Kategori usia (`usia`) dan IMT tidak perlu dikirim karena dihitung dari `ket_usia`, `bb`, dan `tb`. Bila dikirim, nilainya diabaikan.

```json
{
  "prediction": "Berhasil",
  "prediction_code": 0,
  "confidence": 94.5,
  "model_used": "Random Forest",
  "probabilities": {
    "Berhasil": 94.5,
    "Tidak Berhasil": 5.5
  }
}
```

## Variabel Masukan

Dari 17 variabel, dua di antaranya merupakan **variabel turunan** yang selalu dihitung ulang oleh layanan, bukan diisi pengguna:

| Variabel turunan | Dihitung dari | Aturan |
| :-- | :-- | :-- |
| `IMT` | `BB` dan `TB` | BB / (TB dalam meter)² |
| `Usia` | `Ket.Usia` | Kurang dari 45 tahun tergolong Usia Produktif, selebihnya Usia Lanjut |

Perhitungan otomatis ini menjaga kedua variabel selalu selaras dengan data pasien, sehingga nilai yang bertentangan tidak dapat masuk ke dalam model.

### Variabel numerik (4)

| Variabel | Keterangan |
| :-- | :-- |
| `Ket.Usia` | Usia pasien dalam tahun |
| `BB` | Berat badan dalam kilogram |
| `TB` | Tinggi badan dalam sentimeter |
| `IMT` | Indeks massa tubuh, variabel turunan dari BB dan TB |

### Variabel kategorikal (13)

| Variabel | Nilai yang diterima |
| :-- | :-- |
| `Usia` | Usia Produktif, Usia Lanjut (variabel turunan dari Ket.Usia) |
| `Jenis Kelamin` | Laki-Laki, Perempuan |
| `Status Bekerja` | Bekerja, Tidak Bekerja |
| `Status Gizi` | Gizi Kurang, Gizi Normal, Gizi Lebih |
| `Status Merokok` | Merokok, Tidak Merokok |
| `Pemeriksaan Kontak` | Ya, Tidak |
| `Riwayat_DM` | Ada, Tidak |
| `Riwayat_HIV` | Ada, Tidak |
| `Komorbiditas` | Ada, Tidak Ada |
| `Kepatuhan Minum Obat` | Patuh, Tidak Patuh |
| `Efek Samping Obat` | Ada Keluhan, Tidak Ada Keluhan |
| `Riwayat Pengobatan Sebelumnya` | Baru, Pengobatan Ulang |
| `Panduan Pengobatan` | Jangka Pendek, Jangka Panjang |

Pemetaan label yang berlaku dapat diperiksa melalui endpoint `/features`. Nilai yang dikirim aplikasi web harus sesuai dengan pemetaan tersebut.

### Variabel target

| Variabel | Nilai |
| :-- | :-- |
| `Keberhasilan Pengobatan` | Berhasil (0), Tidak Berhasil (1) |

Kelas `Tidak Berhasil` diperlakukan sebagai kelas positif pada perhitungan *precision*, *recall*, dan *F1-score*.

## Proses Pelatihan

1. Data dibersihkan dari duplikat dan nilai kosong.
2. Variabel turunan dihitung: IMT dari berat dan tinggi badan, kategori usia dari usia dalam tahun.
3. Variabel kategorikal dikonversi menjadi numerik dengan pemetaan tetap.
4. Data dibagi menjadi 80% data latih dan 20% data uji secara *stratified*.
5. Normalisasi `StandardScaler` diterapkan sebelum SMOTE, agar perhitungan jarak antartetangga pada SMOTE tidak didominasi variabel berskala besar seperti tinggi badan.
6. SMOTE diterapkan hanya pada data latih, sehingga data uji tetap merepresentasikan distribusi asli.
7. Pencarian *grid* dijalankan dengan validasi silang 5 lipatan, dinilai berdasarkan *F1-score*:

   | Parameter | Nilai yang diuji |
   | :-- | :-- |
   | `n_estimators` | 50, 100, 200, 300 |
   | `max_depth` | 3, 5, 7, 10, tanpa batas |
   | `min_samples_split` | 2, 5, 10 |
   | `random_state` | 42 |

8. Model dievaluasi pada data uji, kemudian disimpan ke direktori `models/`.

Tahap 5 sampai 7 dirangkai dalam satu `imblearn.pipeline.Pipeline` dengan urutan `scaler → smote → classifier`. Perangkaian ini penting: bila SMOTE dijalankan di luar *pipeline*, data sintetis akan ikut masuk ke lipatan validasi sehingga metrik *cross validation* menjadi terlalu optimistis (*data leakage*).

## Pemecahan Masalah

**`ModuleNotFoundError`.** Pustaka belum terpasang:

```bash
pip install -r requirements.txt
```

**`Address already in use`.** Port 5000 masih dipakai proses lain:

```bash
lsof -ti:5000 | xargs kill -9
```

**`Model belum dilatih`.** Direktori `models/` belum berisi berkas `.pkl`. Jalankan pelatihan melalui menu Data Rekam Medis pada aplikasi web, atau kirim permintaan ke endpoint `/retrain`.

**Data latih tidak memadai.** Endpoint pelatihan memerlukan minimal 10 data. Pastikan basis data aplikasi web sudah berisi data rekam medis.
