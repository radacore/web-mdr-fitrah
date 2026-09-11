"""
Flask API untuk Prediksi Keberhasilan Pengobatan MDR-TB

Endpoints:
- GET /health - Health check
- POST /train - Train model dengan data dari database
- POST /retrain - Retrain model dengan data dari database
- POST /predict - Prediksi single input
- GET /models - Info semua model
- GET /statistics - Statistik model
"""

import math
import os
import sys
from typing import List, Optional

import numpy as np
import pandas as pd
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from src.evaluation import ModelEvaluator
from src.interpretability import get_all_interpretability, get_class_distribution
from src.preprocessing import DataPreprocessor
from src.training import ModelTrainer

try:
    from src.external_validation import run_external_validation
    from src.dca import run_dca
    from src.shap_exact import exact_shap_svm, _background_sample, SHAP_BACKGROUND_NAME
    EXTERNAL_VALIDATION_AVAILABLE = True
except Exception as e:
    print(f"External validation/DCA modules not available: {e}")
    EXTERNAL_VALIDATION_AVAILABLE = False
    run_external_validation = None
    run_dca = None
    exact_shap_svm = None
    _background_sample = None
    SHAP_BACKGROUND_NAME = None

app = Flask(__name__)
CORS(app)

# Configuration
LARAVEL_API_URL = os.environ.get("LARAVEL_API_URL", "http://localhost:8000/api")


# Global variables
preprocessor: Optional[DataPreprocessor] = None
trainer: Optional[ModelTrainer] = None
evaluator: Optional[ModelEvaluator] = None
is_trained = False
training_results = None
evaluation_results = None
comparison_table = None
curves_data = None
bootstrap_ci_data = None
interpretability_data = None
class_distribution_data = None


def get_project_root():
    return os.path.dirname(os.path.abspath(__file__))


def fetch_training_data_from_database():
    """Fetch training data from Laravel API"""
    try:
        response = requests.get(f"{LARAVEL_API_URL}/training-data", timeout=10)
        if response.status_code == 200:
            result = response.json()
            data = result.get("data", [])
            if len(data) > 0:
                df = pd.DataFrame(data)
                print(f"Fetched {len(df)} records from database")
                return df
            else:
                print("No training data in database")
                return None
        else:
            print(f"Failed to fetch training data: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching training data from database: {e}")
        return None


def load_or_train_models():
    """Load model dari file atau train dari database"""
    global preprocessor, trainer, evaluator, is_trained
    global training_results, evaluation_results, comparison_table
    global \
        curves_data, \
        bootstrap_ci_data, \
        interpretability_data, \
        class_distribution_data

    models_dir = os.path.join(get_project_root(), "models")
    preprocessor_path = os.path.join(models_dir, "preprocessor.pkl")

    preprocessor = DataPreprocessor()
    trainer = ModelTrainer(n_folds=5)
    evaluator = ModelEvaluator()

    # Cek apakah model sudah ada
    if os.path.exists(preprocessor_path):
        try:
            preprocessor = DataPreprocessor.load(preprocessor_path)
            trainer.load_models(models_dir)
            # Sync selected_features dari best_model_info ke preprocessor (cold-load)
            if trainer.selected_features:
                preprocessor.set_selected_features(trainer.selected_features)
            is_trained = True
            print("Models loaded from disk")

            # Coba fetch data dari database untuk evaluasi
            df = fetch_training_data_from_database()
            if df is not None and len(df) > 0:
                try:
                    df_processed = preprocessor.preprocess(df, fit=False)
                    X, y = preprocessor.get_features_and_target(df_processed)

                    # Split data untuk evaluasi menggunakan 3-way split yang sama
                    X_train, X_val, X_test, y_train, y_val, y_test = (
                        trainer.split_data_3way(X, y)
                    )

                    # Evaluate
                    evaluation_results = evaluator.evaluate_all_models(
                        trainer.models, X_test, y_test
                    )
                    # Compute train/test comparison table
                    comparison_table = evaluator.evaluate_train_test(
                        trainer.models, X_train, y_train, X_test, y_test
                    )
                    # Compute curves, CI, interpretability
                    curves_data = evaluator.get_all_curves(
                        trainer.models, X_test, y_test
                    )
                    bootstrap_ci_data = evaluator.get_all_bootstrap_ci(
                        trainer.models, X_test, y_test
                    )
                    feature_names = list(X_test.columns)
                    interpretability_data = get_all_interpretability(
                        trainer.models, X_test, y_test, feature_names,
                        feature_selection_result=trainer.feature_selection_result,
                    )
                    class_distribution_data = get_class_distribution(y)
                    print("Evaluation completed for loaded models")
                except Exception as e:
                    print(f"Evaluation skipped: {e}")

        except Exception as e:
            print(f"Error loading models: {e}")
            is_trained = False

    # Jika belum ada model, coba train dari database
    if not is_trained:
        print("No saved models found. Attempting to train from database...")
        df = fetch_training_data_from_database()

        if df is not None and len(df) >= 10:  # Minimal 10 data untuk training
            print(f"Training new models with {len(df)} records from database...")
            df_processed = preprocessor.preprocess(df)
            X, y = preprocessor.get_features_and_target(df_processed)

            training_results = trainer.train(X, y)

            # Evaluate
            evaluation_results = evaluator.evaluate_all_models(
                trainer.models, training_results["X_test"], training_results["y_test"]
            )
            # Compute train/test comparison table
            comparison_table = evaluator.evaluate_train_test(
                trainer.models,
                training_results["X_train"],
                training_results["y_train"],
                training_results["X_test"],
                training_results["y_test"],
            )
            # Compute curves, CI, interpretability
            curves_data = evaluator.get_all_curves(
                trainer.models, training_results["X_test"], training_results["y_test"]
            )
            bootstrap_ci_data = evaluator.get_all_bootstrap_ci(
                trainer.models, training_results["X_test"], training_results["y_test"]
            )
            feature_names = list(training_results["X_test"].columns)
            interpretability_data = get_all_interpretability(
                trainer.models,
                training_results["X_test"],
                training_results["y_test"],
                feature_names,
                feature_selection_result=trainer.feature_selection_result,
            )
            class_distribution_data = training_results.get(
                "class_distribution", get_class_distribution(y)
            )

            # Save models + sync selected_features ke preprocessor
            trainer.save_models(models_dir)
            if trainer.selected_features:
                preprocessor.set_selected_features(trainer.selected_features)
            preprocessor.save(preprocessor_path)

            is_trained = True
            print("Models trained and saved successfully")
        else:
            print(
                "Not enough training data in database. ML Service is running but not trained."
            )
            print(
                "Please add training data via Laravel app and call /retrain endpoint."
            )


# Initialize on startup
load_or_train_models()


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify(
        {
            "status": "healthy",
            "is_trained": is_trained,
            "models_available": list(trainer.models.keys()) if trainer else [],
        }
    )


@app.route("/train", methods=["POST"])
def train_models():
    """Train ulang semua model dengan data dari database"""
    global training_results, evaluation_results, is_trained

    try:
        # Fetch data from database
        df = fetch_training_data_from_database()

        if df is None or len(df) < 10:
            return jsonify(
                {
                    "error": "Not enough training data in database. Minimum 10 records required."
                }
            ), 400

        # Reinitialize
        global preprocessor, trainer, evaluator
        preprocessor = DataPreprocessor()
        trainer = ModelTrainer(n_folds=5)
        evaluator = ModelEvaluator()

        # Preprocess
        df_processed = preprocessor.preprocess(df)
        X, y = preprocessor.get_features_and_target(df_processed)

        # Train (3-way split 70/15/15 + GridSearchCV + CV, signature: X, y, use_smote)
        training_results = trainer.train(X, y)

        # Evaluate
        evaluation_results = evaluator.evaluate_all_models(
            trainer.models, training_results["X_test"], training_results["y_test"]
        )

        # Save + sync selected_features ke preprocessor
        models_dir = os.path.join(get_project_root(), "models")
        trainer.save_models(models_dir)
        if trainer.selected_features:
            preprocessor.set_selected_features(trainer.selected_features)
        preprocessor.save(os.path.join(models_dir, "preprocessor.pkl"))

        is_trained = True

        return jsonify(
            {
                "status": "success",
                "message": f"Models trained successfully with {len(df)} records",
                "data_count": len(df),
                "best_model": training_results["best_model_name"],
                "cv_results": training_results["cv_results"],
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/retrain", methods=["POST"])
def retrain_models():
    """Retrain model dengan data yang dikirim langsung dari Laravel"""
    global \
        training_results, \
        evaluation_results, \
        is_trained, \
        preprocessor, \
        trainer, \
        evaluator, \
        comparison_table
    global \
        curves_data, \
        bootstrap_ci_data, \
        interpretability_data, \
        class_distribution_data

    try:
        # Get data from request body
        request_data = request.get_json()

        if not request_data or "data" not in request_data:
            return jsonify(
                {"error": 'No training data provided. Send {"data": [...]}'}
            ), 400

        training_data = request_data["data"]

        if len(training_data) == 0:
            return jsonify({"error": "No training data available"}), 400

        # Convert to DataFrame
        df = pd.DataFrame(training_data)

        # Map column names from Laravel database format to ML service format
        column_mapping = {
            "usia": "Usia",
            "ket_usia": "Ket.Usia",
            "jenis_kelamin": "Jenis Kelamin",
            "status_bekerja": "Status Bekerja",
            "bb": "BB",
            "tb": "TB",
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

        df = df.rename(columns=column_mapping)

        print(f"Received {len(df)} training records")
        print(f"Columns after mapping: {df.columns.tolist()}")

        # Reinitialize
        preprocessor = DataPreprocessor()
        trainer = ModelTrainer(n_folds=5)
        evaluator = ModelEvaluator()

        # Preprocess
        df_processed = preprocessor.preprocess(df)
        X, y = preprocessor.get_features_and_target(df_processed)

        # Check if SMOTE requested
        use_smote = request_data.get("use_smote", False)

        # Train (includes 3-way split, hyperparameter tuning, CV)
        training_results = trainer.train(X, y, use_smote=use_smote)

        # Evaluate
        evaluation_results = evaluator.evaluate_all_models(
            trainer.models, training_results["X_test"], training_results["y_test"]
        )
        # Compute train/test comparison table
        comparison_table = evaluator.evaluate_train_test(
            trainer.models,
            training_results["X_train"],
            training_results["y_train"],
            training_results["X_test"],
            training_results["y_test"],
        )
        # Compute curves, CI, interpretability
        curves_data = evaluator.get_all_curves(
            trainer.models, training_results["X_test"], training_results["y_test"]
        )
        bootstrap_ci_data = evaluator.get_all_bootstrap_ci(
            trainer.models, training_results["X_test"], training_results["y_test"]
        )
        feature_names = list(training_results["X_test"].columns)
        interpretability_data = get_all_interpretability(
            trainer.models,
            training_results["X_test"],
            training_results["y_test"],
            feature_names,
            feature_selection_result=trainer.feature_selection_result,
        )
        class_distribution_data = training_results.get(
            "class_distribution", get_class_distribution(y)
        )

        # Save + sync selected_features ke preprocessor
        models_dir = os.path.join(get_project_root(), "models")
        trainer.save_models(models_dir)
        if trainer.selected_features:
            preprocessor.set_selected_features(trainer.selected_features)
        preprocessor.save(os.path.join(models_dir, "preprocessor.pkl"))

        is_trained = True

        return jsonify(
            {
                "status": "success",
                "message": f"Models retrained successfully with {len(df)} records",
                "data_count": len(df),
                "best_model": training_results["best_model_name"],
                "cv_results": training_results["cv_results"],
                "smote_applied": training_results.get("smote_applied", False),
                "class_distribution": training_results.get("class_distribution", None),
            }
        )

    except Exception as e:
        import traceback

        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500


def _sigmoid(z):
    """Fungsi sigmoid yang stabil secara numerik."""
    z = np.clip(z, -700, 700)
    return 1.0 / (1.0 + np.exp(-z))


def compute_lr_factor_contributions(
    input_processed: pd.DataFrame, model_name: str
) -> dict:
    """
    Attribusi SHAP eksak untuk Logistic Regression (model linear).

    Untuk LR dengan StandardScaler: φᵢ = βᵢ·(x_scaledᵢ − E[x_scaledᵢ]) dengan
    E[x_scaledᵢ] = 0, sehingga φᵢ = βᵢ·x_scaledᵢ dan logit z = intercept + Σ φᵢ.
    Probabilitas berdasar 'pengaruh terhadap probabilitas' (pp) dihitung dengan
    alokasi kumulatif terurut |φᵢ| menurun (urutan pengaruh terbesar dulu).

    Returns dict {intercept, probability, base_probability, z_raw, z_final, features:[...]}
    atau dict {'error': ...} bila model bukan Logistic Regression / gagal.
    """
    try:
        if trainer is None or preprocessor is None:
            return {"error": "Models not trained yet"}
        lr_pipeline = trainer.models.get("Logistic Regression")
        if lr_pipeline is None:
            return {"error": "Logistic Regression model not available"}

        classifier = lr_pipeline.named_steps["classifier"]
        scaler = lr_pipeline.named_steps.get("scaler")

        coefs = np.asarray(classifier.coef_[0])
        intercept = float(classifier.intercept_[0])

        X_scaled = scaler.transform(input_processed.values) if scaler else input_processed.values
        x0 = X_scaled[0]
        x_raw = np.asarray(input_processed.values)[0]

        feature_names = list(input_processed.columns)
        n = len(feature_names)

        # φᵢ_raw = βᵢ * x_scaledᵢ  (E[x_scaled]=0), dalam ruang logit mentah sklearn.
        # Kelas "Berhasil" berada di sisi NEGATIF logit mentah, jadi untuk
        # orientasi tampilan "Berhasil" kita pakai zB = −z = (−intercept) + Σ(−φᵢ_raw).
        ms = []
        ss = []
        if scaler is not None:
            ms = list(np.asarray(scaler.mean_).ravel()) if hasattr(scaler, "mean_") else []
            ss = list(np.asarray(scaler.scale_).ravel()) if hasattr(scaler, "scale_") else []
            if len(ms) == 0 or len(ss) == 0:
                ms, ss = [], []

        phi_raw = [float(coefs[i]) * float(x0[i]) for i in range(n)]
        contributions = [-phi_raw[i] for i in range(n)]  # sisi Berhasil
        base_logit = -intercept

        z_raw = intercept + sum(phi_raw)
        z_final = -z_raw  # logit dalam orientasi "Berhasil"
        pB_final = _sigmoid(z_final)
        pB_base = _sigmoid(base_logit)

        # Alokasi umulatif terurut |φᵢ| menurun -> delta_pp per faktor (sisi Berhasil)
        ordered = sorted(
            zip(feature_names, phi_raw, contributions),
            key=lambda t: -abs(t[2]),
        )
        zB_cur = base_logit
        features = []
        for name, raw, contrib in ordered:
            i = feature_names.index(name)
            zB_new = zB_cur + contrib
            delta_pp = (_sigmoid(zB_new) - _sigmoid(zB_cur)) * 100
            feat = {
                "feature": name,
                "raw_value": float(x_raw[i]),
                "scaled_value": float(x0[i]),
                "coefficient": float(coefs[i]),
                "contribution_raw": float(raw),
                "contribution_logit": float(contrib),
                "delta_pp": float(delta_pp),
            }
            if ms and ss:
                feat["scaled_mean"] = float(ms[i])
                feat["scaled_std"] = float(ss[i])
            features.append(feat)
            zB_cur = zB_new

        return {
            "intercept": intercept,
            "base_probability": float(pB_base * 100),
            "probability": float(pB_final * 100),
            "z_raw": float(z_raw),
            "z_final": float(z_final),
            "features": features,
        }
    except Exception as e:
        print(f"Error computing LR factor contributions: {e}")
        return {"error": str(e)}


def compute_dt_calculation(
    input_processed: pd.DataFrame, model_name: str
) -> dict:
    """
    Rincian perhitungan Decision Tree: telusuri jalur percabangan pasien ini
    dari root ke leaf, tampilkan aturan split (fitur, ambang, nilai z-skor),
    gini, jumlah sampel, dan proporsi kelas tiap simpul. Probabilitas prediksi
    diambil dari distribusi kelas di simpul daun.

    Returns dict {type, model, path:[...]} atau {'error': ...}.
    """
    try:
        if trainer is None or preprocessor is None:
            return {"error": "Models not trained yet"}
        pipe = trainer.models.get("Decision Tree")
        if pipe is None:
            return {"error": "Decision Tree model not available"}

        clf = pipe.named_steps["classifier"]
        scaler = pipe.named_steps.get("scaler")
        X_scaled = scaler.transform(input_processed.values) if scaler else input_processed.values
        x0 = X_scaled[0]
        names = list(input_processed.columns)

        tree = clf.tree_
        path: List[dict] = []
        node = 0
        while True:
            is_leaf = int(tree.children_left[node]) == int(tree.children_right[node])
            frac = [round(float(v), 4) for v in tree.value[node][0]]
            samples = int(tree.n_node_samples[node])
            rec = {
                "node": int(node),
                "leaf": is_leaf,
                "samples": samples,
                "class_fraction": frac,
                "class_count": [round(f * samples) for f in frac],
                "gini": round(float(tree.impurity[node]), 4),
            }
            if is_leaf:
                path.append(rec)
                break
            f = int(tree.feature[node])
            thr = float(tree.threshold[node])
            go_left = bool(x0[f] <= thr)
            rec["feature"] = names[f]
            rec["threshold"] = thr
            rec["scaled_value"] = float(x0[f])
            rec["go_left"] = go_left
            path.append(rec)
            node = int(tree.children_left[node]) if go_left else int(tree.children_right[node])

        proba = pipe.predict_proba(input_processed)[0] if hasattr(pipe, "predict_proba") else None
        probability = float(proba[0]) * 100 if proba is not None else (path[-1]["class_fraction"][0] * 100)

        return {
            "type": "dt",
            "model": "Decision Tree",
            "probability": round(probability, 4),
            "path": path,
        }
    except Exception as e:
        print(f"Error computing DT calculation: {e}")
        return {"error": str(e)}


def compute_svm_calculation(
    input_processed: pd.DataFrame, model_name: str
) -> dict:
    """
    Rincian perhitungan SVM RBF:
    - nilai fungsi keputusan f(x) = Σᵢ αᵢ·yᵢ·K(x, xᵢ) + ρ;
    - kernel RBF K = exp(−γ·‖x−xᵢ‖²) dengan γ = 1/(n_fitur) pada data terstandarisasi;
    - probabilitas via Platt scaling P(Berhasil) = 1/(1 + e^{B − A·f});
    - top support vector yang paling berpengaruh (|α·K| terbesar).
    Returns dict {"type":"svm", ...} atau dict {'error': ...}.
    """
    try:
        if trainer is None or preprocessor is None:
            return {"error": "Models not trained yet"}
        pipe = trainer.models.get("Support Vector Machine")
        if pipe is None:
            return {"error": "Support Vector Machine model not available"}

        clf = pipe.named_steps["classifier"]
        scaler = pipe.named_steps.get("scaler")
        X_scaled = scaler.transform(input_processed.values) if scaler else input_processed.values
        x0 = X_scaled[0]

        f = float(clf.decision_function(X_scaled)[0])
        proba = clf.predict_proba(X_scaled)[0]
        probability = float(proba[0]) * 100
        gamma = float(getattr(clf, "_gamma", 0.0))
        rho = float(clf.intercept_[0])
        n_support = int(clf.n_support_.sum())

        A = None
        B = None
        if hasattr(clf, "probA_") and len(clf.probA_) > 0:
            A = float(clf.probA_[0])
            B = float(clf.probB_[0])

        # Kontribusi tiap support vector: αᵢ · K(x, xᵢ)
        sv = clf.support_vectors_
        dual = clf.dual_coef_[0]
        support_idx = clf.support_

        def _rbf(a, b):
            return float(np.exp(-gamma * np.sum((a - b) ** 2)))

        top = []
        for i in range(len(sv)):
            k = _rbf(x0, sv[i])
            c = float(dual[i]) * k
            top.append(
                {
                    "index": int(i),
                    "support_index": int(support_idx[i]),
                    "kernel": round(k, 4),
                    "dual": round(float(dual[i]), 4),
                    "contribution": round(c, 6),
                }
            )
        top.sort(key=lambda t: -abs(t["contribution"]))
        top = top[:5]

        # --- Atribusi SHAP exact per-fitur (KernelExplainer-equivalent) ---
        # Background: 50 sampel acak dari data latih bersih (diberi nama, seed=42).
        shap_features = None
        shap_base = None
        shap_method = None
        shap_background = None
        try:
            if exact_shap_svm is not None:
                from src.shap_exact import build_background_from_training_file
                bg = None
                if build_background_from_training_file is not None:
                    bg = build_background_from_training_file(
                        preprocessor, scaler, list(input_processed.columns)
                    )
                if bg is None or len(bg) < 2:
                    raise RuntimeError("background dataset unavailable")
                res = exact_shap_svm(
                    scaler=scaler, clf=clf, X_test=X_scaled, background=bg,
                    feature_names=list(input_processed.columns),
                    positive_class=0,  # P(Berhasil) — konsisten dgn probability di UI
                )
                if res and res.get("values"):
                    vals = res["values"][0]
                    shap_features = [
                        {
                            "feature": name,
                            "shap_value": float(v),
                            "shap_mean_abs": float(abs(v)),
                            "raw_value": float(input_processed.iloc[0][name]),
                            "scaled_value": float(x0[i]),
                        }
                        for i, (name, v) in enumerate(zip(list(input_processed.columns), vals))
                    ]
                    shap_features.sort(key=lambda r: -r["shap_mean_abs"])
                    shap_base = res.get("base_value")
                    shap_method = res.get("method")
                    shap_background = res.get("background")
        except Exception as e:
            print(f"Error computing SVM SHAP attribution: {e}")
            shap_features = None

        return {
            "type": "svm",
            "model": "Support Vector Machine",
            "f": round(f, 6),
            "rho": round(rho, 6),
            "gamma": round(gamma, 6),
            "n_support": n_support,
            "A": A,
            "B": B,
            "probability": round(probability, 4),
            "top_sv": top,
            "shap": {
                "method": shap_method,
                "background": shap_background,
                "base_value": shap_base,
                "features": shap_features,
            } if shap_features is not None else None,
        }
    except Exception as e:
        print(f"Error computing SVM calculation: {e}")
        return {"error": str(e)}


def compute_model_calculation(
    input_processed: pd.DataFrame, model_name: str
):
    """Membuat rincian angka perhitungan sesuai model aktif."""
    if input_processed is None:
        return None
    if model_name == "Logistic Regression":
        return compute_lr_factor_contributions(input_processed, model_name)
    if model_name == "Decision Tree":
        return compute_dt_calculation(input_processed, model_name)
    if model_name == "Support Vector Machine":
        return compute_svm_calculation(input_processed, model_name)
    return None


def run_prediction(data):
    """Run preprocess + prediksi + proba secara terpusat untuk /predict dan /explain."""
    global preprocessor, trainer

    if preprocessor is None or trainer is None:
        raise RuntimeError("Models not trained yet")

    model_name = data.pop("model_name", None)

    input_processed = preprocessor.preprocess_single_input(data)

    prediction = trainer.predict(input_processed, model_name)
    probabilities = trainer.predict_proba(input_processed, model_name)

    if "Keberhasilan Pengobatan" in preprocessor.label_decoders:
        prediction_label = preprocessor.decode_value(
            "Keberhasilan Pengobatan", int(prediction[0])
        )
    else:
        prediction_label = "Berhasil" if prediction[0] == 0 else "Tidak Berhasil"

    confidence = float(max(probabilities[0])) * 100
    effective_model = model_name if model_name else trainer.best_model_name

    return {
        "prediction": prediction_label,
        "prediction_code": int(prediction[0]),
        "confidence": confidence,
        "model_used": effective_model,
        "probabilities": {
            "Berhasil": float(probabilities[0][0]) * 100,
            "Tidak Berhasil": float(probabilities[0][1]) * 100
            if len(probabilities[0]) > 1
            else 0,
        },
        "input_processed": input_processed,
        "model_name": effective_model,
    }


@app.route("/predict", methods=["POST"])
def predict():
    """Prediksi untuk single input"""
    global preprocessor, trainer

    if not is_trained or preprocessor is None or trainer is None:
        return jsonify({"error": "Models not trained yet"}), 400

    try:
        data = request.json

        if not data:
            return jsonify({"error": "No input data provided"}), 400

        result = run_prediction(data)
        input_processed = result.pop("input_processed", None)
        effective_model = result["model_used"]

        contribution = compute_model_calculation(input_processed, effective_model)

        result["factor_contributions"] = contribution

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/explain", methods=["POST"])
def explain():
    """POST — prediksi + attribusi per-fitur (SHAP linear utk Logistic Regression)."""
    global preprocessor, trainer

    if not is_trained or preprocessor is None or trainer is None:
        return jsonify({"error": "Models not trained yet"}), 400

    try:
        data = request.json

        if not data:
            return jsonify({"error": "No input data provided"}), 400

        result = run_prediction(data)
        input_processed = result.pop("input_processed", None)
        effective_model = result["model_name"]

        contribution = compute_model_calculation(input_processed, effective_model)

        result["factor_contributions"] = contribution

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/models", methods=["GET"])
def get_models_info():
    """Get info semua model"""
    if not is_trained or not trainer:
        return jsonify({"error": "Models not trained yet"}), 400

    return jsonify(
        {
            "models": list(trainer.models.keys()),
            "best_model": trainer.best_model_name,
            "cv_results": trainer.cv_results,
        }
    )


@app.route("/statistics", methods=["GET"])
def get_statistics():
    """Get statistik lengkap semua model"""
    if not is_trained or evaluation_results is None:
        return jsonify({"error": "Models not evaluated yet"}), 400

    return jsonify(
        {
            "evaluation_results": evaluation_results,
            "best_model": trainer.best_model_name if trainer else None,
            "cv_results": trainer.cv_results if trainer else None,
            "comparison_table": comparison_table,
            "best_params": trainer.best_params if trainer else None,
            "class_distribution": class_distribution_data,
            "bootstrap_ci": bootstrap_ci_data,
        }
    )


@app.route("/features", methods=["GET"])
def get_features():
    """Get daftar fitur yang dibutuhkan untuk prediksi"""
    if not preprocessor:
        return jsonify({"error": "Preprocessor not initialized"}), 400

    return jsonify(
        {
            "numerical_features": preprocessor.numerical_cols,
            "categorical_features": preprocessor.categorical_cols,
            "target": preprocessor.target_col,
            "all_features": preprocessor.feature_cols,
            "selected_features": getattr(preprocessor, "selected_features", preprocessor.feature_cols),
        }
    )


@app.route("/feature-selection", methods=["GET"])
def get_feature_selection():
    """Hasil hybrid feature selection: summary, per-feature verdict, stability, correlation matrix."""
    if not is_trained or trainer is None or not trainer.feature_selection_result:
        return jsonify(
            {"error": "Feature selection belum tersedia. Jalankan retrain pada ML Service."}
        ), 400
    return jsonify(trainer.feature_selection_result)


@app.route("/curves", methods=["GET"])
def get_curves():
    """Get ROC, PR, dan Calibration curve data untuk semua model"""
    if not is_trained or curves_data is None:
        return jsonify({"error": "Models not evaluated yet"}), 400

    return jsonify(curves_data)


@app.route("/calibration", methods=["GET"])
def get_calibration():
    """Get Calibration curve + Brier Score untuk semua model"""
    if not is_trained or curves_data is None:
        return jsonify({"error": "Models not evaluated yet"}), 400

    calibration_results = {}
    for name, data in curves_data.items():
        calibration_results[name] = data.get("calibration", {})

    return jsonify(calibration_results)


@app.route("/interpretability", methods=["GET"])
def get_interpretability():
    """Get interpretability data: OR (LR), feature importance (DT), permutation importance (SVM)"""
    if not is_trained or interpretability_data is None:
        return jsonify({"error": "Models not evaluated yet"}), 400

    return jsonify(interpretability_data)


# Cache untuk external validation & DCA (dihitung sekali, tidak menyentuh model produksi)
_external_validation_cache = None
_external_validation_computing = False
_dca_cache = None
_dca_computing = False


def _json_safe(obj):
    """Ganti nilai Infinity/NaN/-Infinity dengan None (JSON murni tidak mengizinkannya,
    dan json_decode PHP/Node menolak). Juga konversi numpy scalar ke float/int."""
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, (np.floating,)):
        obj = float(obj)
    elif isinstance(obj, (np.integer,)):
        obj = int(obj)
    if isinstance(obj, float):
        return None if not np.isfinite(obj) else obj
    return obj


@app.route("/external-validation", methods=["GET"])
def external_validation():
    """External validation menggunakan kohort Gowa (Register TBC.03)."""
    global _external_validation_cache, _external_validation_computing
    if not EXTERNAL_VALIDATION_AVAILABLE or run_external_validation is None:
        return jsonify({"error": "External validation module tidak tersedia"}), 500
    if _external_validation_cache is not None:
        return jsonify(_external_validation_cache)
    if _external_validation_computing:
        return jsonify({"error": "External validation sedang dihitung, coba lagi nanti"}), 503
    _external_validation_computing = True
    try:
        result = run_external_validation(verbose=True)
        result = _json_safe(result)
        _external_validation_cache = result
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500
    finally:
        _external_validation_computing = False


@app.route("/dca", methods=["GET"])
def dca_endpoint():
    """Decision Curve Analysis (DCA) + kontribusi per variabel (SVM)."""
    global _dca_cache, _dca_computing
    if not EXTERNAL_VALIDATION_AVAILABLE or run_dca is None:
        return jsonify({"error": "DCA module tidak tersedia"}), 500
    if _dca_cache is not None:
        return jsonify(_dca_cache)
    if _dca_computing:
        return jsonify({"error": "DCA sedang dihitung, coba lagi nanti"}), 503
    _dca_computing = True
    try:
        result = run_dca(verbose=True)
        result = _json_safe(result)
        _dca_cache = result
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500
    finally:
        _dca_computing = False


@app.route("/compare-smote", methods=["POST"])
def compare_smote():
    """
    Latih dua skenario (Tanpa SMOTE vs Dengan SMOTE) pada data yang sama,
    lalu kembalikan hasil komparasi lengkap (CV metrics, test metrics, best model).

    Tidak menyentuh model produksi (.pkl) — hanya untuk halaman komparasi.

    Request body (JSON):
        { "data": [...records...] }
    """
    try:
        request_data = request.get_json() or {}
        training_data = request_data.get("data", [])

        if len(training_data) < 10:
            return jsonify(
                {"error": "Not enough training data. Minimum 10 records required."}
            ), 400

        # Convert to DataFrame & rename columns (sama dengan /retrain)
        df = pd.DataFrame(training_data)
        column_mapping = {
            "usia": "Usia",
            "ket_usia": "Ket.Usia",
            "jenis_kelamin": "Jenis Kelamin",
            "status_bekerja": "Status Bekerja",
            "bb": "BB",
            "tb": "TB",
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
        df = df.rename(columns=column_mapping)

        # Preprocess (BB/TB cast int sudah ter-apply di feature_engineering)
        local_pre = DataPreprocessor()
        df_processed = local_pre.preprocess(df)
        X, y = local_pre.get_features_and_target(df_processed)

        def run_scenario(use_smote_flag):
            tr = ModelTrainer(n_folds=5)
            ev = ModelEvaluator()
            res = tr.train(X, y, use_smote=use_smote_flag)
            eval_res = ev.evaluate_all_models(tr.models, res["X_test"], res["y_test"])
            split_info = res.get("split_info", {})
            smote_info = res.get("smote_info", {})
            return {
                "best_model": res["best_model_name"],
                "cv_results": tr.cv_results,
                "best_params": tr.best_params,
                "test_metrics": {name: r["metrics"] for name, r in eval_res.items()},
                "confusion_matrix": {
                    name: r["confusion_matrix"] for name, r in eval_res.items()
                },
                "smote_applied": res.get("smote_applied", False),
                "class_distribution": res.get("class_distribution", {}),
                "split_info": split_info,
                "smote_info": smote_info,
                "train_size": int(split_info.get("train_size", len(res["X_train"]))),
                "val_size": int(split_info.get("validation_size", len(res["X_val"]))),
                "test_size": int(split_info.get("test_size", len(res["X_test"]))),
                "smote_train_size": int(smote_info.get("train_size_after", len(res["X_train"]))),
            }

        print("=== /compare-smote: running TANPA SMOTE ===")
        no_smote = run_scenario(False)
        print("=== /compare-smote: running DENGAN SMOTE ===")
        with_smote = run_scenario(True)

        # Tentukan winner overall berdasarkan F1 CV
        f1_no = no_smote["cv_results"][no_smote["best_model"]]["f1"]["mean"]
        f1_yes = with_smote["cv_results"][with_smote["best_model"]]["f1"]["mean"]
        if f1_yes > f1_no:
            winner = {
                "scenario": "with_smote",
                "model": with_smote["best_model"],
                "f1_cv": float(f1_yes),
            }
        else:
            winner = {
                "scenario": "no_smote",
                "model": no_smote["best_model"],
                "f1_cv": float(f1_no),
            }

        return jsonify(
            {
                "status": "success",
                "data_count": int(len(df)),
                "cleaned_data_count": int(len(y)),
                "models": list(no_smote["cv_results"].keys()),
                "no_smote": no_smote,
                "with_smote": with_smote,
                "winner": winner,
            }
        )

    except Exception as e:
        import traceback

        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
