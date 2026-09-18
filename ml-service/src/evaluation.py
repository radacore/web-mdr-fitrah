"""
Evaluasi Model Klasifikasi Keberhasilan Pengobatan MDR-TB

Mengikuti Bab II.A.6 dan II.A.12 proposal. Evaluasi dilakukan melalui
confusion matrix yang terdiri atas True Positive (TP), True Negative (TN),
False Positive (FP), dan False Negative (FN), kemudian diturunkan menjadi
metrik accuracy, precision, recall, dan F1-score.

Kelas positif adalah pasien dengan status "Tidak Berhasil" (kelas minoritas),
sehingga False Negative merupakan kesalahan yang paling dihindari.
"""

from typing import Any, Dict, Optional, cast

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

# Kelas 0 = Berhasil, kelas 1 = Tidak Berhasil (kelas positif)
TARGET_NAMES = ["Berhasil", "Tidak Berhasil"]

# Metrik bernilai 0 bila pembaginya nol (mis. tidak ada prediksi positif)
ZERO_DIVISION: Any = 0


class ModelEvaluator:
    """Perhitungan metrik evaluasi berbasis confusion matrix."""

    def __init__(self):
        self.results: Dict[str, Any] = {}

    def get_confusion_matrix(self, y_true, y_pred) -> Dict[str, int]:
        """
        Menyusun confusion matrix dalam bentuk TP, TN, FP, dan FN.

        Kelas positif = 1 (Tidak Berhasil).
        """
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()

        return {
            "true_positive": int(tp),
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
        }

    def get_confusion_matrix_array(self, y_true, y_pred) -> list:
        """Confusion matrix sebagai matriks 2x2 untuk keperluan visualisasi."""
        return confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist()

    def evaluate(self, y_true, y_pred) -> Dict[str, float]:
        """
        Menghitung metrik evaluasi dari confusion matrix.

        Persamaan (6) accuracy, (7) precision, (8) recall, (9) F1-score.
        """
        return {
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "precision": float(
                precision_score(
                    y_true, y_pred, pos_label=1, zero_division=ZERO_DIVISION
                )
            ),
            "recall": float(
                recall_score(y_true, y_pred, pos_label=1, zero_division=ZERO_DIVISION)
            ),
            "f1_score": float(
                f1_score(y_true, y_pred, pos_label=1, zero_division=ZERO_DIVISION)
            ),
        }

    def get_classification_report(self, y_true, y_pred) -> str:
        """Laporan klasifikasi per kelas."""
        laporan = classification_report(
            y_true,
            y_pred,
            labels=[0, 1],
            target_names=TARGET_NAMES,
            zero_division=ZERO_DIVISION,
        )
        return cast(str, laporan)

    def evaluate_model(
        self,
        model,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        X_train: Optional[pd.DataFrame] = None,
        y_train: Optional[pd.Series] = None,
    ) -> Dict[str, Any]:
        """
        Evaluasi model pada data uji.

        Bila data latih disertakan, metrik data latih juga dihitung sebagai
        indikasi ada atau tidaknya overfitting.
        """
        y_pred = model.predict(X_test)

        metrics = self.evaluate(y_test, y_pred)
        cm = self.get_confusion_matrix(y_test, y_pred)

        hasil: Dict[str, Any] = {
            "metrics": metrics,
            "confusion_matrix": cm,
            "confusion_matrix_array": self.get_confusion_matrix_array(y_test, y_pred),
            "classification_report": self.get_classification_report(y_test, y_pred),
            "test_size": int(len(y_test)),
        }

        if X_train is not None and y_train is not None:
            y_train_pred = model.predict(X_train)
            hasil["train_metrics"] = self.evaluate(y_train, y_train_pred)
            hasil["train_size"] = int(len(y_train))

        print("\n=== Hasil Evaluasi Data Uji ===")
        print(f"Accuracy : {metrics['accuracy']:.4f}")
        print(f"Precision: {metrics['precision']:.4f}")
        print(f"Recall   : {metrics['recall']:.4f}")
        print(f"F1-Score : {metrics['f1_score']:.4f}")
        print(
            f"Confusion Matrix: TP={cm['true_positive']}, TN={cm['true_negative']}, "
            f"FP={cm['false_positive']}, FN={cm['false_negative']}"
        )

        self.results = hasil
        return hasil

    def get_class_distribution(self, y: pd.Series) -> Dict[str, Any]:
        """Distribusi kelas beserta rasio ketidakseimbangan (Bab II.A.3)."""
        counts = pd.Series(y).value_counts().to_dict()
        berhasil = int(counts.get(0, 0))
        tidak_berhasil = int(counts.get(1, 0))
        total = berhasil + tidak_berhasil

        mayoritas = max(berhasil, tidak_berhasil)
        minoritas = min(berhasil, tidak_berhasil)

        return {
            "Berhasil": berhasil,
            "Tidak Berhasil": tidak_berhasil,
            "total": total,
            "persen_berhasil": round(berhasil / total * 100, 2) if total else 0.0,
            "persen_tidak_berhasil": (
                round(tidak_berhasil / total * 100, 2) if total else 0.0
            ),
            "rasio_ketidakseimbangan": (
                round(mayoritas / minoritas, 2) if minoritas else 0.0
            ),
            "kelas_minoritas": "Tidak Berhasil"
            if tidak_berhasil < berhasil
            else "Berhasil",
        }


if __name__ == "__main__":
    from preprocessing import DataPreprocessor
    from training import ModelTrainer

    preprocessor = DataPreprocessor()
    df = preprocessor.load_data("../data/data_uji_ml.csv")
    processed = preprocessor.preprocess(df)
    X, y = preprocessor.get_features_and_target(processed)

    trainer = ModelTrainer(n_folds=5)
    hasil_latih = trainer.train(X, y, use_smote=True)

    evaluator = ModelEvaluator()
    evaluator.evaluate_model(
        trainer.model,
        hasil_latih["X_test"],
        hasil_latih["y_test"],
        hasil_latih["X_train"],
        hasil_latih["y_train"],
    )

    print("\n" + evaluator.get_classification_report(
        hasil_latih["y_test"], trainer.predict(hasil_latih["X_test"])
    ))
