"""
Flask API Klasifikasi Keberhasilan Pengobatan MDR-TB
Teknik SMOTE dan Algoritma Random Forest

Endpoint:
- GET  /health          Pemeriksaan status layanan
- GET  /features        Daftar variabel yang dibutuhkan untuk prediksi
- POST /predict         Klasifikasi satu data pasien
- POST /retrain         Pelatihan ulang model dari data pada basis data
- GET  /statistics      Hasil evaluasi model dan feature importance
- POST /compare-smote   Skenario pengujian tanpa SMOTE vs dengan SMOTE
- POST /test-scenarios  Skenario variasi proporsi data dan jumlah pohon
"""

import os
import sys
import traceback
from typing import Any, Dict, Optional

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from src.evaluation import ModelEvaluator
from src.preprocessing import DataPreprocessor
from src.training import ModelTrainer

app = Flask(__name__)
CORS(app)

MODEL_LABEL = "Random Forest"

# Jumlah data minimum agar pelatihan dapat dilakukan
MIN_TRAINING_RECORDS = 10

preprocessor: Optional[DataPreprocessor] = None
trainer: Optional[ModelTrainer] = None
evaluator: Optional[ModelEvaluator] = None
is_trained = False

evaluation_results: Optional[Dict[str, Any]] = None
class_distribution: Optional[Dict[str, Any]] = None
feature_importance: Optional[list] = None
cleaning_report: Optional[Dict[str, Any]] = None


def get_project_root() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def get_models_dir() -> str:
    return os.path.join(get_project_root(), "models")


def get_dataset_path() -> str:
    """Dataset rekam medis RSUD Labuang Baji (Bab III.A)."""
    return os.path.join(get_project_root(), "data", "data_uji_ml.csv")


def run_training_pipeline(
    df: pd.DataFrame, use_smote: bool = True, test_size: float = 0.2
) -> Dict[str, Any]:
    """
    Menjalankan pipeline lengkap: preprocessing, SMOTE, pelatihan, evaluasi.
    Hasil disimpan pada state global agar dapat diakses endpoint statistik.
    """
    global preprocessor, trainer, evaluator, is_trained
    global evaluation_results, class_distribution
    global feature_importance, cleaning_report

    preprocessor = DataPreprocessor()
    trainer = ModelTrainer(n_folds=5)
    evaluator = ModelEvaluator()

    df_processed = preprocessor.preprocess(df)
    X, y = preprocessor.get_features_and_target(df_processed)
    cleaning_report = dict(preprocessor.cleaning_report)

    hasil = trainer.train(X, y, use_smote=use_smote, test_size=test_size)

    evaluation_results = evaluator.evaluate_model(
        trainer.model,
        hasil["X_test"],
        hasil["y_test"],
        hasil["X_train"],
        hasil["y_train"],
    )
    class_distribution = evaluator.get_class_distribution(y)
    feature_importance = hasil["feature_importance"]

    models_dir = get_models_dir()
    trainer.save_model(models_dir)
    preprocessor.save(os.path.join(models_dir, "preprocessor.pkl"))

    is_trained = True

    return {
        "data_count": int(len(df)),
        "cleaned_data_count": int(len(y)),
        "cv_results": hasil["cv_results"],
        "best_params": hasil["best_params"],
        "test_metrics": evaluation_results["metrics"],
        "confusion_matrix": evaluation_results["confusion_matrix"],
        "smote_applied": hasil["smote_applied"],
        "class_distribution": hasil["class_distribution"],
        "split_info": hasil["split_info"],
        "feature_importance": hasil["feature_importance"],
    }


def initialize() -> None:
    """
    Memuat model tersimpan bila tersedia, atau melatih model baru dari
    dataset rekam medis RSUD Labuang Baji.
    """
    global preprocessor, trainer, evaluator, is_trained
    global evaluation_results, class_distribution
    global feature_importance, cleaning_report

    models_dir = get_models_dir()
    preprocessor_path = os.path.join(models_dir, "preprocessor.pkl")

    preprocessor = DataPreprocessor()
    trainer = ModelTrainer(n_folds=5)
    evaluator = ModelEvaluator()

    if os.path.exists(preprocessor_path) and trainer.load_model(models_dir):
        try:
            preprocessor = DataPreprocessor.load(preprocessor_path)
            is_trained = True
            feature_importance = trainer.get_feature_importance()

            # Evaluasi ulang pada pembagian data yang sama agar statistik tersedia
            dataset_path = get_dataset_path()
            if os.path.exists(dataset_path):
                df = preprocessor.load_data(dataset_path)
                df_processed = preprocessor.preprocess(df)
                X, y = preprocessor.get_features_and_target(df_processed)
                cleaning_report = dict(preprocessor.cleaning_report)

                test_size = trainer.split_info.get("test_size", 0.2)
                X_train, X_test, y_train, y_test = trainer.split_data(
                    X, y, test_size=test_size
                )
                evaluation_results = evaluator.evaluate_model(
                    trainer.model, X_test, y_test, X_train, y_train
                )
                class_distribution = evaluator.get_class_distribution(y)

            print("Model berhasil dimuat dari penyimpanan.")
            return
        except Exception as exc:
            print(f"Gagal memuat model: {exc}")
            is_trained = False

    dataset_path = get_dataset_path()
    if os.path.exists(dataset_path):
        print("Melatih model baru dari dataset rekam medis...")
        df = DataPreprocessor().load_data(dataset_path)
        run_training_pipeline(df, use_smote=True)
        print("Pelatihan model selesai.")
    else:
        print(f"Dataset tidak ditemukan di {dataset_path}. Layanan berjalan tanpa model.")


initialize()


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "healthy",
            "is_trained": is_trained,
            "model": trainer.model_name if trainer else None,
        }
    )


@app.route("/features", methods=["GET"])
def features():
    """Daftar variabel penelitian sesuai Ruang Lingkup Penelitian."""
    if preprocessor is None:
        return jsonify({"error": "Preprocessor belum diinisialisasi."}), 400

    return jsonify(
        {
            "numerical_features": preprocessor.numerical_cols,
            "categorical_features": preprocessor.categorical_cols,
            "all_features": preprocessor.feature_cols,
            "total_features": len(preprocessor.feature_cols),
            "target": preprocessor.target_col,
            "label_encodings": preprocessor.label_encoders,
        }
    )


@app.route("/predict", methods=["POST"])
def predict():
    """Klasifikasi keberhasilan pengobatan untuk satu data pasien."""
    if not is_trained or preprocessor is None or trainer is None:
        return jsonify({"error": "Model belum dilatih."}), 400

    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Data masukan tidak ditemukan."}), 400

        input_processed = preprocessor.preprocess_single_input(data)

        prediksi = trainer.predict(input_processed)
        probabilitas = trainer.predict_proba(input_processed)

        kode = int(prediksi[0])
        label = preprocessor.decode_value("Keberhasilan Pengobatan", kode)

        return jsonify(
            {
                "prediction": label,
                "prediction_code": kode,
                "confidence": float(max(probabilitas[0])) * 100,
                "model_used": trainer.model_name,
                "probabilities": {
                    "Berhasil": float(probabilitas[0][0]) * 100,
                    "Tidak Berhasil": float(probabilitas[0][1]) * 100,
                },
                "feature_importance": trainer.get_feature_importance(),
                "input_encoded": input_processed.iloc[0].to_dict(),
            }
        )

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/retrain", methods=["POST"])
def retrain():
    """
    Pelatihan ulang model menggunakan data rekam medis dari basis data.

    Body: {"data": [...], "use_smote": true}
    """
    try:
        payload = request.get_json(silent=True) or {}
        records = payload.get("data", [])

        if len(records) < MIN_TRAINING_RECORDS:
            return jsonify(
                {
                    "error": f"Data pelatihan tidak memadai. "
                    f"Minimal {MIN_TRAINING_RECORDS} data diperlukan."
                }
            ), 400

        use_smote = bool(payload.get("use_smote", True))
        df = pd.DataFrame(records)

        hasil = run_training_pipeline(df, use_smote=use_smote)

        return jsonify(
            {
                "status": "success",
                "message": f"Model berhasil dilatih ulang dengan {hasil['data_count']} data.",
                **hasil,
            }
        )

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc), "traceback": traceback.format_exc()}), 500


@app.route("/statistics", methods=["GET"])
def statistics():
    """Hasil evaluasi model, cross validation, dan feature importance."""
    if not is_trained or evaluation_results is None or trainer is None:
        return jsonify({"error": "Model belum dievaluasi."}), 400

    return jsonify(
        {
            "model": trainer.model_name,
            "metrics": evaluation_results["metrics"],
            "train_metrics": evaluation_results.get("train_metrics"),
            "confusion_matrix": evaluation_results["confusion_matrix"],
            "confusion_matrix_array": evaluation_results["confusion_matrix_array"],
            "classification_report": evaluation_results["classification_report"],
            "cv_results": trainer.cv_results,
            "best_params": trainer.best_params,
            "best_cv_score": trainer.best_cv_score,
            "feature_importance": feature_importance,
            "class_distribution": class_distribution,
            "split_info": trainer.split_info,
            "smote_info": trainer.smote_info,
            "cleaning_report": cleaning_report,
        }
    )


@app.route("/compare-smote", methods=["POST"])
def compare_smote():
    """
    Skenario pengujian Bab III.C.5: model dilatih pada dataset asli yang tidak
    seimbang, kemudian pada dataset yang telah diseimbangkan dengan SMOTE.
    Kedua hasil dibandingkan berdasarkan accuracy, precision, recall, F1-score.

    Pelatihan bersifat sementara dan tidak mengubah model produksi.
    """
    try:
        payload = request.get_json(silent=True) or {}
        records = payload.get("data", [])

        if len(records) < MIN_TRAINING_RECORDS:
            return jsonify(
                {
                    "error": f"Data pelatihan tidak memadai. "
                    f"Minimal {MIN_TRAINING_RECORDS} data diperlukan."
                }
            ), 400

        df = pd.DataFrame(records)

        local_pre = DataPreprocessor()
        df_processed = local_pre.preprocess(df)
        X, y = local_pre.get_features_and_target(df_processed)

        def jalankan_skenario(use_smote: bool) -> Dict[str, Any]:
            tr = ModelTrainer(n_folds=5)
            ev = ModelEvaluator()
            res = tr.train(X, y, use_smote=use_smote)
            eval_res = ev.evaluate_model(
                tr.model, res["X_test"], res["y_test"], res["X_train"], res["y_train"]
            )
            return {
                "cv_results": res["cv_results"],
                "best_params": res["best_params"],
                "test_metrics": eval_res["metrics"],
                "train_metrics": eval_res.get("train_metrics"),
                "confusion_matrix": eval_res["confusion_matrix"],
                "confusion_matrix_array": eval_res["confusion_matrix_array"],
                "feature_importance": res["feature_importance"],
                "class_distribution": res["class_distribution"],
                "split_info": res["split_info"],
                "smote_applied": res["smote_applied"],
            }

        print("\n########## Skenario 1: Tanpa SMOTE ##########")
        tanpa_smote = jalankan_skenario(False)
        print("\n########## Skenario 2: Dengan SMOTE ##########")
        dengan_smote = jalankan_skenario(True)

        def selisih_metrik(kunci: str) -> Dict[str, float]:
            """Selisih metrik antara skenario dengan SMOTE dan tanpa SMOTE."""
            return {
                metrik: round(
                    dengan_smote[kunci][metrik] - tanpa_smote[kunci][metrik], 4
                )
                for metrik in ["accuracy", "precision", "recall", "f1_score"]
            }

        selisih_uji = selisih_metrik("test_metrics")
        selisih_cv = {
            metrik: round(
                dengan_smote["cv_results"][kunci_cv]["mean"]
                - tanpa_smote["cv_results"][kunci_cv]["mean"],
                4,
            )
            for metrik, kunci_cv in [
                ("accuracy", "accuracy"),
                ("precision", "precision"),
                ("recall", "recall"),
                ("f1_score", "f1"),
            ]
        }

        # Kesimpulan mengacu pada recall data uji sesuai Bab III.C.5, yaitu
        # selisih recall antara kedua skenario pada data yang belum pernah
        # dilihat model. Berkurangnya false negative menjadi bukti pendukung
        # karena pasien berisiko gagal yang tidak terdeteksi merupakan
        # kesalahan yang paling dihindari.
        selisih_recall = selisih_uji["recall"]
        fn_tanpa = tanpa_smote["confusion_matrix"]["false_negative"]
        fn_dengan = dengan_smote["confusion_matrix"]["false_negative"]

        if selisih_recall > 0:
            kesimpulan = (
                "Penerapan SMOTE meningkatkan recall kelas minoritas sebesar "
                f"{selisih_recall * 100:.2f} poin persen pada data uji, "
                f"dengan jumlah pasien berisiko gagal yang tidak terdeteksi "
                f"berkurang dari {fn_tanpa} menjadi {fn_dengan}. "
                "Model menjadi lebih sensitif dalam mendeteksi pasien "
                "yang berisiko gagal pengobatan."
            )
        elif selisih_recall < 0:
            kesimpulan = (
                "Penerapan SMOTE menurunkan recall kelas minoritas sebesar "
                f"{abs(selisih_recall) * 100:.2f} poin persen pada data uji, "
                f"dengan jumlah pasien berisiko gagal yang tidak terdeteksi "
                f"berubah dari {fn_tanpa} menjadi {fn_dengan}."
            )
        else:
            kesimpulan = (
                "Penerapan SMOTE menghasilkan recall kelas minoritas yang sama "
                "pada data uji, sehingga kontribusinya tidak terlihat pada "
                "dataset ini."
            )

        return jsonify(
            {
                "status": "success",
                "model": MODEL_LABEL,
                "data_count": int(len(df)),
                "cleaned_data_count": int(len(y)),
                "no_smote": tanpa_smote,
                "with_smote": dengan_smote,
                "selisih_data_uji": selisih_uji,
                "selisih_cross_validation": selisih_cv,
                "kesimpulan": kesimpulan,
            }
        )

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc), "traceback": traceback.format_exc()}), 500


@app.route("/test-scenarios", methods=["POST"])
def test_scenarios():
    """
    Skenario pengujian tambahan Bab III.C.5:
    - Variasi proporsi pembagian data (80:20 dan 70:30) untuk menilai
      stabilitas performa model
    - Variasi jumlah pohon (n_estimators) untuk menemukan konfigurasi terbaik
      sekaligus menghindari overfitting
    """
    try:
        payload = request.get_json(silent=True) or {}
        records = payload.get("data", [])

        if len(records) < MIN_TRAINING_RECORDS:
            return jsonify(
                {
                    "error": f"Data pelatihan tidak memadai. "
                    f"Minimal {MIN_TRAINING_RECORDS} data diperlukan."
                }
            ), 400

        df = pd.DataFrame(records)
        local_pre = DataPreprocessor()
        df_processed = local_pre.preprocess(df)
        X, y = local_pre.get_features_and_target(df_processed)

        # Skenario A: variasi proporsi pembagian data
        hasil_proporsi = []
        for test_size in [0.2, 0.3]:
            tr = ModelTrainer(n_folds=5)
            ev = ModelEvaluator()
            res = tr.train(X, y, use_smote=True, test_size=test_size)
            eval_res = ev.evaluate_model(
                tr.model, res["X_test"], res["y_test"], res["X_train"], res["y_train"]
            )
            hasil_proporsi.append(
                {
                    "ratio": res["split_info"]["ratio"],
                    "train_size": res["split_info"]["train_size"],
                    "test_size": res["split_info"]["test_size_count"],
                    "test_metrics": eval_res["metrics"],
                    "train_metrics": eval_res.get("train_metrics"),
                    "confusion_matrix": eval_res["confusion_matrix"],
                    "cv_f1": res["cv_results"]["f1"]["mean"],
                    "best_params": res["best_params"],
                }
            )

        # Skenario B: variasi jumlah pohon pada pembagian 80:20
        hasil_pohon = []
        X_train, X_test, y_train, y_test = ModelTrainer(n_folds=5).split_data(X, y)

        for n_estimators in [50, 100, 200, 300, 500]:
            # Pipeline mengikuti urutan Bab III.C.4: normalisasi, SMOTE,
            # kemudian klasifikasi. SMOTE hanya melihat data latih.
            pipeline = Pipeline(
                [
                    ("scaler", StandardScaler()),
                    ("smote", SMOTE(random_state=42)),
                    (
                        "classifier",
                        RandomForestClassifier(
                            n_estimators=n_estimators, random_state=42
                        ),
                    ),
                ]
            )
            pipeline.fit(X_train, y_train)

            ev = ModelEvaluator()
            hasil_pohon.append(
                {
                    "n_estimators": n_estimators,
                    "test_metrics": ev.evaluate(y_test, pipeline.predict(X_test)),
                    "train_metrics": ev.evaluate(
                        y_train, pipeline.predict(X_train)
                    ),
                    "confusion_matrix": ev.get_confusion_matrix(
                        y_test, pipeline.predict(X_test)
                    ),
                }
            )

        terbaik_proporsi = max(
            hasil_proporsi, key=lambda d: d["test_metrics"]["f1_score"]
        )
        terbaik_pohon = max(hasil_pohon, key=lambda d: d["test_metrics"]["f1_score"])

        return jsonify(
            {
                "status": "success",
                "model": MODEL_LABEL,
                "data_count": int(len(df)),
                "cleaned_data_count": int(len(y)),
                "variasi_proporsi": hasil_proporsi,
                "variasi_n_estimators": hasil_pohon,
                "proporsi_terbaik": terbaik_proporsi["ratio"],
                "n_estimators_terbaik": terbaik_pohon["n_estimators"],
            }
        )

    except Exception as exc:
        traceback.print_exc()
        return jsonify({"error": str(exc), "traceback": traceback.format_exc()}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
