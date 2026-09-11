# 🚀 Cara Menjalankan ML Service

Panduan lengkap untuk menjalankan **Flask API - Prediksi Keberhasilan Pengobatan MDR-TB** di macOS.

---

## 📋 Prerequisites

Pastikan sudah terinstall:

- **Python 3.10+** (project ini menggunakan Python 3.14.3)
- **pip** (Python package manager)

Cek versi Python:

```bash
python3 --version
```

---

## 🔧 Instalasi

### 1. Masuk ke folder project

```bash
cd "/Users/rada/Downloads/kak sri/ml-service"
```

### 2. Install dependencies

```bash
pip3 install -r requirements.txt
```

**Dependencies yang diinstall:**

- `flask==3.0.0` - Web framework
- `flask-cors==4.0.0` - CORS support
- `pandas>=2.2.0` - Data manipulation
- `numpy>=2.0.0` - Numerical computing
- `scikit-learn>=1.5.0` - Machine learning
- `joblib==1.3.2` - Model serialization
- `gunicorn==21.2.0` - WSGI server
- `python-dotenv==1.0.0` - Environment variables
- `requests>=2.31.0` - HTTP client
- `imbalanced-learn>=0.12.0` - SMOTE oversampling
- `shap>=0.45.0` - SHAP interpretability (notebook)
- `matplotlib>=3.8.0` - Plotting (notebook)
- `seaborn>=0.13.0` - Statistical plots (notebook)
- `scipy>=1.11.0` - Statistical functions
- `jupyter>=1.0.0` - Jupyter notebook

---

## ▶️ Menjalankan Server

### Mode Development (Debug)

```bash
python3 app.py
```

Server akan berjalan di:

- **Local:** `http://127.0.0.1:5000`
- **Network:** `http://0.0.0.0:5000`

### Mode Production (dengan Gunicorn)

```bash
gunicorn --bind 0.0.0.0:5000 app:app
```

---

## 🛑 Menghentikan Server

Tekan **`Ctrl + C`** di terminal tempat server berjalan.

---

## 🧪 Testing API

### 1. Health Check

```bash
curl http://localhost:5000/health
```

**Response:**

```json
{
  "status": "healthy",
  "is_trained": true,
  "models_available": [
    "Logistic Regression",
    "Decision Tree",
    "Support Vector Machine"
  ]
}
```

### 2. Lihat Fitur yang Dibutuhkan

```bash
curl http://localhost:5000/features
```

### 3. Lihat Info Model

```bash
curl http://localhost:5000/models
```

### 4. Lihat Statistik Evaluasi

```bash
curl http://localhost:5000/statistics
```

### 5. Prediksi Single Input

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "usia": "Usia Produktif",
    "ket_usia": 35,
    "jenis_kelamin": "Laki-Laki",
    "status_bekerja": "Bekerja",
    "bb": 65,
    "tb": 170,
    "imt": 22.5,
    "status_gizi": "Gizi Normal",
    "status_merokok": "Tidak Merokok",
    "pemeriksaan_kontak": "Ya",
    "riwayat_dm": "Tidak",
    "riwayat_hiv": "Tidak",
    "komorbiditas": "Tidak Ada",
    "kepatuhan_minum_obat": "Patuh",
    "efek_samping_obat": "Tidak Ada Keluhan",
    "riwayat_pengobatan": "Kasus Baru",
    "panduan_pengobatan": "Jangka Pendek"
  }'
```

**Response:**

```json
{
  "prediction": "Berhasil",
  "prediction_code": 0,
  "confidence": 95.5,
  "model_used": "Support Vector Machine",
  "probabilities": {
    "Berhasil": 95.5,
    "Tidak Berhasil": 4.5
  }
}
```

---

## 📡 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/health` | Cek status server dan model |
| `GET` | `/features` | Daftar fitur yang dibutuhkan untuk prediksi |
| `GET` | `/models` | Info semua model yang tersedia |
| `GET` | `/statistics` | Statistik evaluasi lengkap + bootstrap CI + class distribution |
| `GET` | `/curves` | Data ROC, Precision-Recall, dan Calibration curve per model |
| `GET` | `/calibration` | Data Calibration curve + Brier Score per model |
| `GET` | `/interpretability` | Odds Ratio (LR), Feature Importance (DT), Permutation Importance (SVM) |
| `POST` | `/predict` | Prediksi untuk single input |
| `POST` | `/train` | Train model dengan data dari database Laravel |
| `POST` | `/retrain` | Retrain model dengan data JSON (opsional: `use_smote: true`) |
| `POST` | `/compare-smote` | Komparasi SMOTE vs Non-SMOTE (tidak menyentuh model produksi) |

---

## 📁 Struktur Project

```
ml-service/
├── app.py                 # Flask API server
├── requirements.txt       # Python dependencies
├── caramenjalankanku.md   # Panduan ini
├── data/
│   └── data_uji_ml.csv    # Data training (177 records)
├── models/
│   ├── preprocessor.pkl           # Data preprocessor
│   ├── logistic_regression.pkl    # Model Logistic Regression
│   ├── decision_tree.pkl          # Model Decision Tree
│   ├── support_vector_machine.pkl # Model SVM
│   └── best_model_info.pkl        # Info model terbaik
├── src/
│   ├── __init__.py
│   ├── preprocessing.py   # Data preprocessing module
│   ├── training.py        # Model training module (+ SMOTE support)
│   ├── evaluation.py      # Model evaluation module (+ ROC, PR, Calibration, Bootstrap CI)
│   └── interpretability.py # Odds Ratio, Feature Importance, Permutation Importance
├── notebooks/
│   ├── analysis_for_dissertation.ipynb  # Notebook figur disertasi
│   └── figures/                         # Output figur PNG/PDF
└── tests/                 # Test files
```

---

## 🤖 Model Machine Learning

Project ini memiliki **3 model** yang dilatih:

| Model | Deskripsi |
|-------|-----------|
| **Logistic Regression** | Model linear untuk klasifikasi biner |
| **Decision Tree** | Model tree-based dengan max_depth=10 |
| **Support Vector Machine** | Model SVM dengan kernel RBF |

**Best Model:** Support Vector Machine (F1 Score: ~0.85)

---

## 📊 Fitur untuk Prediksi

### Numerical Features (4)

| Fitur | Deskripsi | Tipe |
|-------|-----------|------|
| `Ket.Usia` | Keterangan Usia | Integer |
| `BB` | Berat Badan (kg) | Float |
| `TB` | Tinggi Badan (cm) | Float |
| `IMT` | Indeks Massa Tubuh | Float |

### Categorical Features (13)

| Fitur | Nilai Valid |
|-------|-------------|
| `Usia` | "Usia Produktif", "Usia Lanjut" |
| `Jenis Kelamin` | "Laki-Laki", "Perempuan" |
| `Status Bekerja` | "Bekerja", "Tidak Bekerja" |
| `Status Gizi` | "Gizi Kurang", "Gizi Normal", "Gizi Lebih" |
| `Status Merokok` | "Merokok", "Tidak Merokok" |
| `Pemeriksaan Kontak` | "Ya", "Tidak" |
| `Riwayat_DM` | "Ada", "Tidak" |
| `Riwayat_HIV` | "Ada", "Tidak" |
| `Komorbiditas` | "Ada", "Tidak Ada" |
| `Kepatuhan Minum Obat` | "Patuh", "Tidak Patuh" |
| `Efek Samping Obat` | "Ada Keluhan", "Tidak Ada Keluhan" |
| `Riwayat Pengobatan Sebelumnya` | "Kasus Baru", "Kasus Lama", "Pengobatan Ulang" |
| `Panduan Pengobatan` | "Jangka Pendek", "Jangka Panjang" |

### Target

| Fitur | Nilai |
|-------|-------|
| `Keberhasilan Pengobatan` | "Berhasil", "Tidak Berhasil" |

---

## ⚙️ Konfigurasi Environment

### LARAVEL_API_URL

Default: `http://localhost:8000/api`

Untuk mengubah URL Laravel API:

```bash
export LARAVEL_API_URL="http://your-laravel-api.com/api"
python3 app.py
```

---

## 🔍 Troubleshooting

### Error: `ModuleNotFoundError: No module named 'xxx'`

```bash
pip3 install -r requirements.txt
```

### Error: `Address already in use`

Server sudah berjalan di port 5000. Hentikan dengan:

```bash
pkill -f "python3 app.py"
```

### Error: `Models not trained yet`

Model belum dilatih. Pastikan folder `models/` berisi file `.pkl`.

### Port 5000 tidak bisa diakses

Cek firewall macOS atau gunakan port lain:

```bash
python3 app.py --port 5001
```

---

## 📓 Menjalankan Jupyter Notebook

Notebook `notebooks/analysis_for_dissertation.ipynb` menghasilkan semua figur publikasi untuk disertasi.

```bash
cd notebooks
jupyter notebook analysis_for_dissertation.ipynb
```

**Figur yang dihasilkan:**
- Correlation heatmap
- Class distribution (pie + bar)
- Bootstrap 95% CI
- ROC & Precision-Recall curves
- Confusion matrix heatmaps
- Calibration curves + Brier scores
- Feature importance (Decision Tree)
- Odds Ratio forest plot (Logistic Regression)
- Permutation importance (SVM)
- SHAP summary, bar, dan waterfall plots
- Nested cross-validation results
- Sensitivity analysis

Semua figur disimpan di `notebooks/figures/` dalam format PNG (300 DPI) dan PDF.

---

## 📝 Catatan Penting

1. **Model sudah pretrained** - File model `.pkl` sudah ada di folder `models/`, tidak perlu train ulang kecuali ada data baru.

2. **Auto-load on startup** - Saat server dijalankan, model akan otomatis dimuat dari file `.pkl`.

3. **Laravel Integration** - Endpoint `/train` dan `/retrain` terintegrasi dengan Laravel API untuk fetch data dari database.

4. **Debug Mode** - Server berjalan dengan `debug=True` untuk development. Untuk production, gunakan Gunicorn.

---

## 📞 Support

Jika ada masalah, cek log di terminal atau file `flask.log`.

---

**Last Updated:** Februari 2026  
**Python Version:** 3.14.3  
**Platform:** macOS Sonoma
