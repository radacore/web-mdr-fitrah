"""
Pelatihan Model Klasifikasi Keberhasilan Pengobatan MDR-TB

Mengikuti Bab III.C.3 dan III.C.4 proposal:
1. Pembagian data latih dan data uji (80:20), dilakukan SEBELUM SMOTE
   untuk mencegah kebocoran data (data leakage)
2. Normalisasi fitur numerik agar perhitungan jarak k-nearest neighbors
   pada SMOTE berjalan optimal
3. Penerapan SMOTE hanya pada data latih
4. Hyperparameter tuning Random Forest dengan grid search
   (n_estimators, max_depth, min_samples_split, random_state)
5. K-Fold Cross Validation sebagai validasi pendukung

Normalisasi dan SMOTE disusun sebagai tahapan pipeline, bukan dijalankan
terpisah. Dengan demikian keduanya hanya mempelajari data pada lipatan latih
setiap kali cross validation berjalan, sehingga estimasi performa tidak
dipengaruhi kebocoran data dari lipatan validasi.
"""

import os
from typing import Any, Dict, Optional, Tuple, cast

import joblib
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    cross_val_score,
    train_test_split,
)
from sklearn.preprocessing import StandardScaler

MODEL_NAME = "Random Forest"

# Grid hyperparameter sesuai Bab III.C.4 proposal
PARAM_GRID = {
    "classifier__n_estimators": [50, 100, 200, 300],
    "classifier__max_depth": [3, 5, 7, 10, None],
    "classifier__min_samples_split": [2, 5, 10],
}


class ModelTrainer:
    """Pelatihan model Random Forest dengan penyeimbangan data SMOTE."""

    def __init__(self, n_folds: int = 5, random_state: int = 42):
        self.n_folds = n_folds
        self.random_state = random_state
        self.model: Optional[Pipeline] = None
        self.cv_results: Dict[str, Dict[str, Any]] = {}
        self.best_params: Dict[str, Any] = {}
        self.best_cv_score: float = 0.0
        self.feature_names: list = []
        self.model_name = MODEL_NAME
        # Rekam informasi pelatihan agar tetap tersedia saat model dimuat ulang
        self.smote_info: Dict[str, Any] = {}
        self.split_info: Dict[str, Any] = {}

    def _build_pipeline(self, use_smote: bool = True) -> Pipeline:
        """
        Menyusun pipeline: normalisasi -> SMOTE -> klasifikasi Random Forest.

        Urutan mengikuti Bab III.C.4: normalisasi dilakukan lebih dahulu agar
        skala antar fitur seragam, sehingga perhitungan jarak k-nearest
        neighbors pada SMOTE tidak didominasi fitur berskala besar seperti
        tinggi badan.

        SMOTE menjadi bagian pipeline agar hanya mempelajari data pada lipatan
        latih ketika cross validation dan grid search berjalan.
        """
        tahapan: list = [("scaler", StandardScaler())]

        if use_smote:
            tahapan.append(("smote", SMOTE(random_state=self.random_state)))

        tahapan.append(
            ("classifier", RandomForestClassifier(random_state=self.random_state))
        )

        return Pipeline(tahapan)

    def split_data(
        self, X: pd.DataFrame, y: pd.Series, test_size: float = 0.2
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Membagi data menjadi data latih dan data uji dengan proporsi 80:20.
        Pembagian bersifat stratified agar proporsi kelas terjaga.
        """
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=self.random_state,
            stratify=y,
        )
        return (
            cast(pd.DataFrame, X_train),
            cast(pd.DataFrame, X_test),
            cast(pd.Series, y_train),
            cast(pd.Series, y_test),
        )

    def ringkas_penyeimbangan(
        self, X_train: pd.DataFrame, y_train: pd.Series
    ) -> Tuple[Dict[str, int], bool]:
        """
        Menghitung distribusi kelas data latih setelah penyeimbangan SMOTE
        untuk keperluan pelaporan.

        SMOTE yang sebenarnya dijalankan di dalam pipeline pelatihan. Fungsi ini
        hanya menormalkan dan meresample salinan data latih agar jumlah sampel
        sintetis yang dihasilkan dapat ditampilkan kepada pengguna.

        SMOTE membangkitkan sampel sintetis melalui interpolasi k-nearest
        neighbors, bukan duplikasi sampel (Bab II.A.4).
        """
        try:
            X_ternormalisasi = StandardScaler().fit_transform(X_train)
            smote = SMOTE(random_state=self.random_state)
            hasil = smote.fit_resample(X_ternormalisasi, y_train)
            y_seimbang = cast(pd.Series, hasil[1])

            distribusi = {
                str(kelas): int(jumlah)
                for kelas, jumlah in y_seimbang.value_counts().items()
            }
            return distribusi, True
        except Exception as exc:
            print(f"Peringatan: penyeimbangan SMOTE gagal ({exc}).")
            return {}, False

    def hyperparameter_tuning(
        self, X_train: pd.DataFrame, y_train: pd.Series, use_smote: bool = True
    ) -> Dict[str, Any]:
        """
        Hyperparameter tuning Random Forest menggunakan grid search.

        Kombinasi dievaluasi dengan Stratified K-Fold dan dipilih berdasarkan
        F1-score, karena fokus penelitian adalah deteksi kelas minoritas.

        Data latih dimasukkan dalam keadaan belum diseimbangkan. Normalisasi dan
        SMOTE dijalankan sebagai tahapan pipeline pada setiap lipatan, sehingga
        lipatan validasi tidak memuat sampel sintetis dari lipatan latih.
        """
        cv = StratifiedKFold(
            n_splits=self.n_folds, shuffle=True, random_state=self.random_state
        )

        grid = GridSearchCV(
            estimator=self._build_pipeline(use_smote=use_smote),
            param_grid=PARAM_GRID,
            cv=cv,
            scoring="f1",
            n_jobs=-1,
            refit=True,
        )
        grid.fit(X_train, y_train)

        self.model = cast(Pipeline, grid.best_estimator_)
        self.best_params = {
            k.replace("classifier__", ""): v for k, v in grid.best_params_.items()
        }
        # random_state disertakan agar hasil pelatihan dapat direproduksi
        self.best_params["random_state"] = self.random_state
        self.best_cv_score = float(grid.best_score_)

        print(f"Parameter terbaik : {self.best_params}")
        print(f"F1-score CV terbaik: {self.best_cv_score:.4f}")

        return self.best_params

    def cross_validate(
        self, X_train: pd.DataFrame, y_train: pd.Series
    ) -> Dict[str, Dict[str, Any]]:
        """
        K-Fold Cross Validation pada model hasil tuning.

        Metrik: accuracy, precision, recall, dan F1-score (Bab II.A.6).

        Data latih yang diberikan belum diseimbangkan. Karena normalisasi dan
        SMOTE merupakan tahapan pipeline, keduanya dipasang ulang pada setiap
        lipatan latih sehingga skor yang dihasilkan mencerminkan performa pada
        data yang benar-benar belum pernah dilihat model.
        """
        if self.model is None:
            raise RuntimeError("Model belum dilatih.")

        cv = StratifiedKFold(
            n_splits=self.n_folds, shuffle=True, random_state=self.random_state
        )

        hasil: Dict[str, Dict[str, Any]] = {}
        for metrik in ["accuracy", "precision", "recall", "f1"]:
            skor = cross_val_score(
                self.model, X_train, y_train, cv=cv, scoring=metrik
            )
            hasil[metrik] = {
                "mean": float(np.mean(skor)),
                "std": float(np.std(skor)),
                "scores": [float(s) for s in skor],
            }
            print(f"  {metrik:<10}: {hasil[metrik]['mean']:.4f} (+/- {hasil[metrik]['std']:.4f})")

        self.cv_results = hasil
        return hasil

    def get_feature_importance(self) -> list:
        """
        Feature importance Random Forest (Bab II.A.13).

        Nilai diperoleh dari rata-rata penurunan impurity (Gini) yang
        disebabkan setiap variabel pada seluruh pohon dalam hutan.
        """
        if self.model is None or not self.feature_names:
            return []

        classifier = self.model.named_steps["classifier"]
        importances = classifier.feature_importances_

        pasangan = [
            {"feature": nama, "importance": float(nilai)}
            for nama, nilai in zip(self.feature_names, importances)
        ]
        return sorted(pasangan, key=lambda d: d["importance"], reverse=True)

    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        use_smote: bool = True,
        test_size: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Pipeline pelatihan lengkap sesuai alur Gambar 9 proposal.

        Data dibagi terlebih dahulu, kemudian normalisasi, SMOTE, dan Random
        Forest dilatih sebagai satu pipeline pada data latih. Data uji tidak
        pernah disentuh SMOTE maupun dipakai memasang penormal.

        Args:
            X: matriks fitur
            y: vektor target
            use_smote: penerapan SMOTE pada data latih
            test_size: proporsi data uji (0.2 berarti 80:20)
        """
        self.feature_names = list(X.columns)

        print("\n=== Pembagian Data Latih dan Data Uji ===")
        X_train, X_test, y_train, y_test = self.split_data(X, y, test_size=test_size)
        rasio = f"{int((1 - test_size) * 100)}:{int(test_size * 100)}"
        print(f"Proporsi        : {rasio}")
        print(f"Data latih      : {len(X_train)} sampel")
        print(f"Data uji        : {len(X_test)} sampel")

        distribusi_awal = y.value_counts().to_dict()
        distribusi_latih = y_train.value_counts().to_dict()
        print(f"Distribusi kelas keseluruhan: {distribusi_awal}")
        print(f"Distribusi kelas data latih : {distribusi_latih}")

        ukuran_latih = len(X_train)
        distribusi_setelah_smote = None
        smote_applied = False

        if use_smote:
            print("\n=== Penerapan SMOTE pada Data Latih ===")
            distribusi_setelah_smote, smote_applied = self.ringkas_penyeimbangan(
                X_train, y_train
            )
            if smote_applied:
                jumlah_setelah = sum(distribusi_setelah_smote.values())
                print(f"Data latih setelah SMOTE: {jumlah_setelah} sampel")
                print(f"Distribusi kelas        : {distribusi_setelah_smote}")

        print("\n=== Hyperparameter Tuning Random Forest ===")
        best_params = self.hyperparameter_tuning(X_train, y_train, use_smote=use_smote)

        print("\n=== K-Fold Cross Validation ===")
        cv_results = self.cross_validate(X_train, y_train)

        jumlah_latih_akhir = (
            sum(distribusi_setelah_smote.values())
            if distribusi_setelah_smote
            else ukuran_latih
        )

        self.split_info = {
            "ratio": rasio,
            "test_size": test_size,
            "total": int(len(y)),
            "train_size": int(jumlah_latih_akhir),
            "test_size_count": int(len(X_test)),
            "train_size_before_smote": int(ukuran_latih),
        }
        self.smote_info = {
            "applied": smote_applied,
            "class_distribution": {
                "keseluruhan": {str(k): int(v) for k, v in distribusi_awal.items()},
                "latih_sebelum_smote": {
                    str(k): int(v) for k, v in distribusi_latih.items()
                },
                "latih_setelah_smote": distribusi_setelah_smote or None,
            },
        }

        return {
            "X_train": X_train,
            "X_test": X_test,
            "y_train": y_train,
            "y_test": y_test,
            "cv_results": cv_results,
            "best_params": best_params,
            "best_cv_score": self.best_cv_score,
            "feature_importance": self.get_feature_importance(),
            "split_info": self.split_info,
            "class_distribution": self.smote_info["class_distribution"],
            "smote_applied": smote_applied,
        }

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("Model belum dilatih atau dimuat.")
        return self.model.predict(X)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("Model belum dilatih atau dimuat.")
        return self.model.predict_proba(X)

    def save_model(self, directory: str) -> None:
        """Menyimpan model dan metadata pelatihan."""
        os.makedirs(directory, exist_ok=True)

        joblib.dump(self.model, os.path.join(directory, "random_forest.pkl"))
        joblib.dump(
            {
                "model_name": self.model_name,
                "cv_results": self.cv_results,
                "best_params": self.best_params,
                "best_cv_score": self.best_cv_score,
                "feature_names": self.feature_names,
                "feature_importance": self.get_feature_importance(),
                "smote_info": self.smote_info,
                "split_info": self.split_info,
            },
            os.path.join(directory, "model_info.pkl"),
        )
        print(f"Model disimpan di {directory}")

    def load_model(self, directory: str) -> bool:
        """Memuat model dan metadata pelatihan dari direktori."""
        model_path = os.path.join(directory, "random_forest.pkl")
        if not os.path.exists(model_path):
            return False

        self.model = joblib.load(model_path)

        info_path = os.path.join(directory, "model_info.pkl")
        if os.path.exists(info_path):
            info = joblib.load(info_path)
            self.cv_results = info.get("cv_results", {})
            self.best_params = info.get("best_params", {})
            self.best_cv_score = info.get("best_cv_score", 0.0)
            self.feature_names = info.get("feature_names", [])
            self.smote_info = info.get("smote_info", {})
            self.split_info = info.get("split_info", {})

        print(f"Model dimuat dari {directory}")
        return True


if __name__ == "__main__":
    from preprocessing import DataPreprocessor

    preprocessor = DataPreprocessor()
    df = preprocessor.load_data("../data/data_uji_ml.csv")
    processed = preprocessor.preprocess(df)
    X, y = preprocessor.get_features_and_target(processed)

    trainer = ModelTrainer(n_folds=5)
    hasil = trainer.train(X, y, use_smote=True)

    trainer.save_model("../models")
    preprocessor.save("../models/preprocessor.pkl")

    print("\n=== Pelatihan Selesai ===")
    print(f"Parameter terbaik: {hasil['best_params']}")
