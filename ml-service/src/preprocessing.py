"""
Preprocessing Data untuk Klasifikasi Keberhasilan Pengobatan MDR-TB

Tahapan mengikuti Bab III.C.4 (Teknik Analisis Data) proposal:
1. Data cleaning  : penanganan missing values, data duplikat, data tidak konsisten
2. Feature eng.   : perhitungan IMT dari BB dan TB, penentuan kategori usia
3. Encoding       : label encoding untuk seluruh variabel kategorikal
(Normalisasi dilakukan di tahap training, setelah pembagian data, agar tidak
terjadi kebocoran data. Lihat src/training.py)

Seluruh 17 variabel pada Ruang Lingkup Penelitian (Bab I.E) digunakan sebagai fitur.
"""

from typing import Dict, List, Tuple, cast

import joblib
import pandas as pd

# Batas usia yang memisahkan kategori usia produktif dan usia lanjut.
# Kategori usia merupakan turunan dari usia dalam tahun, sehingga nilainya
# dihitung ulang pada tahap feature engineering. Penurunan otomatis ini
# menghilangkan data tidak konsisten antara kedua variabel tersebut.
BATAS_USIA_LANJUT = 45

USIA_PRODUKTIF = "Usia Produktif"
USIA_LANJUT = "Usia Lanjut"


def tentukan_kategori_usia(usia_tahun: float) -> str:
    """Menentukan kategori usia berdasarkan usia pasien dalam tahun."""
    return USIA_LANJUT if usia_tahun >= BATAS_USIA_LANJUT else USIA_PRODUKTIF


# Label encoding manual agar pemetaan kategori konsisten antara pelatihan dan prediksi
LABEL_ENCODINGS = {
    "Usia": {USIA_PRODUKTIF: 0, USIA_LANJUT: 1},
    "Jenis Kelamin": {"Laki-Laki": 0, "Laki-laki": 0, "Perempuan": 1},
    "Status Bekerja": {"Tidak Bekerja": 0, "Bekerja": 1},
    "Status Gizi": {"Gizi Kurang": 0, "Gizi Normal": 1, "Gizi Lebih": 2},
    "Status Merokok": {"Tidak Merokok": 0, "Merokok": 1},
    "Pemeriksaan Kontak": {"Tidak": 0, "Ya": 1, "Ada": 1},
    "Riwayat_DM": {"Tidak": 0, "Ada": 1, "Ya": 1},
    "Riwayat_HIV": {"Tidak": 0, "Ada": 1, "Ya": 1},
    "Komorbiditas": {"Tidak Ada": 0, "Tidak": 0, "Ada": 1, "Ya": 1},
    "Kepatuhan Minum Obat": {"Patuh": 0, "Tidak Patuh": 1, "Kurang Patuh": 1},
    "Efek Samping Obat": {"Tidak Ada Keluhan": 0, "Ada Keluhan": 1},
    "Riwayat Pengobatan Sebelumnya": {
        "Baru": 0,
        "Kasus Baru": 0,
        "Pengobatan Ulang": 1,
        "Kasus Lama": 1,
    },
    "Panduan Pengobatan": {"Jangka Pendek": 0, "Jangka Panjang": 1},
    "Keberhasilan Pengobatan": {"Berhasil": 0, "Tidak Berhasil": 1},
}

LABEL_DECODINGS = {
    col: {v: k for k, v in mappings.items()}
    for col, mappings in LABEL_ENCODINGS.items()
}

# Mapping nama field snake_case (Laravel) ke nama kolom dataset
FIELD_MAPPING = {
    "usia": "Usia",
    "ket_usia": "Ket.Usia",
    "jenis_kelamin": "Jenis Kelamin",
    "status_bekerja": "Status Bekerja",
    "bb": "BB",
    "tb": "TB",
    "imt": "IMT",
    "status_gizi": "Status Gizi",
    "status_merokok": "Status Merokok",
    "pemeriksaan_kontak": "Pemeriksaan Kontak",
    "riwayat_dm": "Riwayat_DM",
    "riwayat_hiv": "Riwayat_HIV",
    "komorbiditas": "Komorbiditas",
    "kepatuhan_minum_obat": "Kepatuhan Minum Obat",
    "efek_samping_obat": "Efek Samping Obat",
    "keterangan_efek_samping": "Keterangan Efek Samping",
    "riwayat_pengobatan": "Riwayat Pengobatan Sebelumnya",
    "panduan_pengobatan": "Panduan Pengobatan",
    "keberhasilan_pengobatan": "Keberhasilan Pengobatan",
}

# Kolom teks bebas yang tidak dipakai sebagai fitur model
NON_FEATURE_COLS = ["Efek_Samping_Obat", "Keterangan Efek Samping"]


class DataPreprocessor:
    """Preprocessing dataset rekam medis pasien MDR-TB."""

    def __init__(self):
        self.label_encoders = LABEL_ENCODINGS
        self.label_decoders = LABEL_DECODINGS

        # 4 variabel numerik
        self.numerical_cols = ["Ket.Usia", "BB", "TB", "IMT"]

        # 13 variabel kategorikal
        self.categorical_cols = [
            "Usia",
            "Jenis Kelamin",
            "Status Bekerja",
            "Status Gizi",
            "Status Merokok",
            "Pemeriksaan Kontak",
            "Riwayat_DM",
            "Riwayat_HIV",
            "Komorbiditas",
            "Kepatuhan Minum Obat",
            "Efek Samping Obat",
            "Riwayat Pengobatan Sebelumnya",
            "Panduan Pengobatan",
        ]

        self.target_col = "Keberhasilan Pengobatan"
        # Total 17 fitur sesuai Ruang Lingkup Penelitian
        self.feature_cols = self.numerical_cols + self.categorical_cols
        self.cleaning_report: Dict[str, int] = {}

    def load_data(self, filepath: str) -> pd.DataFrame:
        """Membaca dataset dari file CSV."""
        return pd.read_csv(filepath)

    def rename_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Menyesuaikan nama kolom snake_case dari basis data ke nama kolom dataset."""
        return df.rename(columns=FIELD_MAPPING)

    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Data cleaning:
        - Membuang kolom teks bebas yang tidak menjadi fitur model
        - Membuang baris duplikat
        - Membuang baris dengan missing value pada kolom fitur atau target
        """
        df_clean = df.copy()
        total_awal = len(df_clean)

        for col in NON_FEATURE_COLS:
            if col in df_clean.columns:
                df_clean = df_clean.drop(columns=[col])

        # Data duplikat
        df_clean = df_clean.drop_duplicates()
        dibuang_duplikat = total_awal - len(df_clean)

        # Missing value pada kolom fitur/target yang tersedia
        cek_kolom = [
            c
            for c in self.feature_cols + [self.target_col]
            if c in df_clean.columns and c != "IMT"
        ]
        sebelum_dropna = len(df_clean)
        df_clean = df_clean.dropna(subset=cek_kolom)
        dibuang_missing = sebelum_dropna - len(df_clean)

        df_clean = df_clean.reset_index(drop=True)

        self.cleaning_report = {
            "total_awal": int(total_awal),
            "dibuang_duplikat": int(dibuang_duplikat),
            "dibuang_missing": int(dibuang_missing),
            "total_akhir": int(len(df_clean)),
        }
        print(
            f"Data cleaning: {total_awal} baris -> {len(df_clean)} baris "
            f"(duplikat: {dibuang_duplikat}, missing value: {dibuang_missing})"
        )

        return df_clean

    def feature_engineering(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Menghitung variabel turunan:
        - IMT dari BB dan TB: IMT = BB / (TB dalam meter)^2
        - Kategori usia dari usia dalam tahun

        Kolom numerik dikonversi secara eksplisit karena data yang berasal dari
        basis data maupun berkas CSV dapat terbaca sebagai teks.
        """
        df_fe = df.copy()

        if "Ket.Usia" in df_fe.columns:
            df_fe["Ket.Usia"] = pd.to_numeric(df_fe["Ket.Usia"], errors="coerce")
            df_fe = df_fe.dropna(subset=["Ket.Usia"]).reset_index(drop=True)
            df_fe["Ket.Usia"] = df_fe["Ket.Usia"].astype(int)

            # Kategori usia ditentukan ulang agar selalu selaras dengan usia
            # dalam tahun, sekaligus memperbaiki data yang tidak konsisten.
            df_fe["Usia"] = df_fe["Ket.Usia"].apply(tentukan_kategori_usia)

        if "BB" in df_fe.columns and "TB" in df_fe.columns:
            df_fe["BB"] = pd.to_numeric(df_fe["BB"], errors="coerce")
            df_fe["TB"] = pd.to_numeric(df_fe["TB"], errors="coerce")
            df_fe = df_fe.dropna(subset=["BB", "TB"]).reset_index(drop=True)

            # BB dan TB pada rekam medis selalu bilangan bulat (kg dan cm)
            df_fe["BB"] = df_fe["BB"].astype(int)
            df_fe["TB"] = df_fe["TB"].astype(int)

            tb_meter = df_fe["TB"] / 100
            df_fe["IMT"] = (df_fe["BB"] / (tb_meter**2)).round(2)

        return df_fe

    def encode_value(self, column: str, value) -> int:
        """Melakukan encoding satu nilai kategorikal."""
        if column not in self.label_encoders:
            return -1

        mapping = self.label_encoders[column]
        if value in mapping:
            return mapping[value]

        value_lower = str(value).lower().strip()
        for key, encoded in mapping.items():
            if key.lower().strip() == value_lower:
                return encoded

        print(f"Peringatan: nilai '{value}' tidak dikenali pada kolom '{column}'")
        return -1

    def decode_value(self, column: str, encoded: int) -> str:
        """Mengembalikan label asli dari nilai hasil encoding."""
        if column in self.label_decoders:
            return self.label_decoders[column].get(encoded, "Tidak Diketahui")
        return "Tidak Diketahui"

    def encode_categorical(self, df: pd.DataFrame) -> pd.DataFrame:
        """Label encoding pada seluruh kolom kategorikal dan kolom target."""
        df_encoded = df.copy()

        for col in self.categorical_cols + [self.target_col]:
            if col in df_encoded.columns:
                df_encoded[col] = df_encoded[col].apply(
                    lambda x: self.encode_value(col, str(x))
                )

        return df_encoded

    def preprocess(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Pipeline preprocessing:
        1. Penyesuaian nama kolom
        2. Data cleaning
        3. Feature engineering (IMT)
        4. Label encoding
        """
        df_processed = self.rename_columns(df)
        df_processed = self.clean_data(df_processed)
        df_processed = self.feature_engineering(df_processed)
        df_processed = self.encode_categorical(df_processed)
        return df_processed

    def get_features_and_target(
        self, df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """Memisahkan matriks fitur (X) dan vektor target (y)."""
        available: List[str] = [c for c in self.feature_cols if c in df.columns]
        X = cast(pd.DataFrame, df[available])
        y = cast(pd.Series, df[self.target_col])
        return X, y

    def preprocess_single_input(self, input_data: Dict) -> pd.DataFrame:
        """Preprocessing satu baris data pasien untuk keperluan prediksi."""
        encoded: Dict[str, float] = {}

        for key, value in input_data.items():
            col = FIELD_MAPPING.get(key, key)

            if col in NON_FEATURE_COLS or col == self.target_col:
                continue

            if col in ("Ket.Usia", "BB", "TB"):
                try:
                    encoded[col] = float(value)
                except (TypeError, ValueError):
                    encoded[col] = 0.0
            elif col in self.label_encoders:
                # Nilai bisa datang sebagai label teks atau kode numerik
                if isinstance(value, int) or (
                    isinstance(value, str) and value.isdigit()
                ):
                    kode = int(value)
                    encoded[col] = (
                        kode
                        if kode in self.label_encoders[col].values()
                        else self.encode_value(col, str(value))
                    )
                else:
                    encoded[col] = self.encode_value(col, str(value))

        # Variabel turunan dihitung ulang agar konsisten dengan data latih
        bb = encoded.get("BB", 0)
        tb = encoded.get("TB", 0)
        encoded["IMT"] = round(bb / ((tb / 100) ** 2), 2) if tb > 0 else 0.0

        if "Ket.Usia" in encoded:
            encoded["Usia"] = self.encode_value(
                "Usia", tentukan_kategori_usia(encoded["Ket.Usia"])
            )

        df = pd.DataFrame([encoded])
        available = [c for c in self.feature_cols if c in df.columns]
        return cast(pd.DataFrame, df[available])

    def save(self, filepath: str) -> None:
        joblib.dump(self, filepath)

    @staticmethod
    def load(filepath: str) -> "DataPreprocessor":
        return joblib.load(filepath)


if __name__ == "__main__":
    preprocessor = DataPreprocessor()
    df = preprocessor.load_data("../data/data_uji_ml.csv")
    processed = preprocessor.preprocess(df)
    X, y = preprocessor.get_features_and_target(processed)

    print(f"\nJumlah fitur : {X.shape[1]}")
    print(f"Jumlah sampel: {X.shape[0]}")
    print(f"Daftar fitur : {list(X.columns)}")
    print(f"\nDistribusi kelas:\n{y.value_counts().rename(index=LABEL_DECODINGS[preprocessor.target_col])}")
