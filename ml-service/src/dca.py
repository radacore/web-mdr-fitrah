"""
Decision Curve Analysis (DCA) Module

Implementasi DCA (Vickers & Elkin, 2006):
    Net Benefit = (TP/n) - (FP/n) * (pt/(1-pt))

- Kurva Net Benefit model vs Treat-All vs Treat-None terhadap threshold pt.
- Kontribusi per variabel: rata-rata |SHAP| per fitur dari model SVM (KernelExplainer exact).

Konsistensi web <> notebook:
- f(x) = P(Berhasil) (positive_class=0), sama dengan notebook & interpretability per-pasien.
- Background: 50 sampel acak dari data latih bersih (seed=42), sama dengan notebook.
"""

import os
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from external_validation import _load_internal, _load_gowa, _impute_mode, EXTERNAL_FEATURES


def dca_curve(y_true: np.ndarray, y_proba: np.ndarray,
              thresholds: Optional[np.ndarray] = None) -> Dict[str, object]:
    """
    Hitung net benefit untuk threshold probabilitas.

    Args:
        y_true: label biner (0/1)
        y_proba: probabilitas kelas positif (1)
        thresholds: array threshold pt (default: grid 0.01..0.99)

    Returns:
        {thresholds, net_benefit_model, net_benefit_all, net_benefit_none}
    """
    y_true = np.asarray(y_true)
    y_proba = np.asarray(y_proba)
    n = len(y_true)
    prevalence = float(y_true.mean())

    if thresholds is None:
        thresholds = np.arange(0.01, 1.0, 0.01)

    nb_model = []
    nb_all = []
    nb_none = []

    for pt in thresholds:
        # Model: predict positif jika proba >= pt
        pred = (y_proba >= pt).astype(int)
        tp = int(((pred == 1) & (y_true == 1)).sum())
        fp = int(((pred == 1) & (y_true == 0)).sum())
        nb_m = (tp / n) - (fp / n) * (pt / (1 - pt))

        # Treat All: semua positif
        tp_all = int((y_true == 1).sum())
        fp_all = int((y_true == 0).sum())
        nb_a = (tp_all / n) - (fp_all / n) * (pt / (1 - pt))

        # Treat None
        nb_n = 0.0

        nb_model.append(float(nb_m))
        nb_all.append(float(nb_a))
        nb_none.append(float(nb_n))

    return {
        "thresholds": [float(x) for x in thresholds],
        "net_benefit_model": nb_model,
        "net_benefit_all": nb_all,
        "net_benefit_none": nb_none,
        "prevalence": prevalence,
        "n": int(n),
    }


def variable_contribution(shap_mean_abs: Dict[str, float]) -> List[Dict[str, float]]:
    """
    Rangkum kontribusi per variabel dari SHAP SVM (mean |SHAP| per fitur).

    Args:
        shap_mean_abs: {feature: mean_abs_shap}

    Returns:
        [{feature, contribution}] sorted descending
    """
    rows = [{"feature": f, "contribution": float(v)} for f, v in shap_mean_abs.items()]
    rows.sort(key=lambda r: r["contribution"], reverse=True)
    return rows


def run_dca(verbose: bool = True) -> Dict[str, object]:
    """
    Jalankan DCA untuk model SVM 9-fitur internal + kontribusi per variabel.

    Menggunakan data internal (X_test) dengan model SVM yang dilatih ulang
    pada 9 fitur (konsisten dengan external validation). f(x) = P(Berhasil).

    Mengembalikan detail SHAP (values, base_value, X_test_scaled, y_test)
    agar notebook & web memakai sumber komputasi yang sama persis.
    """
    from external_validation import _build_pipeline, _tune_svm, RANDOM_STATE
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import roc_auc_score
    from shap_exact import exact_shap_svm, _background_sample, SHAP_BACKGROUND_NAME

    internal = _load_internal()
    X_int = internal[EXTERNAL_FEATURES]
    y_int = internal["Keberhasilan Pengobatan"].astype(int).values

    # Split 70/15/15 stratify (konsisten external validation)
    X_rest, X_test, y_rest, y_test = train_test_split(
        X_int, y_int, test_size=0.15, random_state=RANDOM_STATE, stratify=y_int
    )
    X_train, _, y_train, _ = train_test_split(
        X_rest, y_rest, test_size=0.15 / 0.85, random_state=RANDOM_STATE, stratify=y_rest
    )

    try:
        from imblearn.over_sampling import SMOTE
        X_train, y_train = SMOTE(random_state=RANDOM_STATE).fit_resample(X_train, y_train)
        smote_applied = True
    except Exception:
        smote_applied = False

    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_test_s = scaler.transform(X_test)

    clf = _tune_svm(X_train_s, y_train)
    y_proba = clf.predict_proba(X_test_s)[:, 1]

    curve = dca_curve(y_test, y_proba)

    # Kontribusi per variabel: SHAP exact (KernelExplainer-style) untuk SVM.
    # Background: 50 sampel acak dari data latih bersih (seed=42) — konsisten
    # dengan notebook & interpretability per-pasien di web.
    bg = _background_sample(X_train_s)
    shap_result = exact_shap_svm(
        scaler=scaler, clf=clf, X_test=X_test_s, background=bg,
        feature_names=EXTERNAL_FEATURES,
        positive_class=0,  # P(Berhasil) — konsisten dgn notebook & web
    )
    contributions = variable_contribution(shap_result["mean_abs"])

    result = {
        "status": "success",
        "model": {
            "name": "Support Vector Machine (DCA)",
            "best_params": {k: str(v) for k, v in clf.get_params().items() if k in ("C", "gamma", "kernel")},
            "smote_applied": smote_applied,
            "features": EXTERNAL_FEATURES,
        },
        "curve": curve,
        "contributions": contributions,
        "auc_roc": float(roc_auc_score(y_test, y_proba)) if len(np.unique(y_test)) > 1 else None,
        # Detail SHAP untuk reproduksi plot yang identik di notebook:
        "shap": {
            "method": shap_result["method"],
            "background": shap_result["background"],
            "base_value": float(shap_result["base_value"]),
            "feature_names": list(EXTERNAL_FEATURES),
            "mean_abs": {k: float(v) for k, v in shap_result["mean_abs"].items()},
            "values": shap_result["values"],
            "X_test_scaled": np.asarray(X_test_s, dtype=float).tolist(),
            "y_test": [int(v) for v in y_test],
        },
    }

    if verbose:
        print("=== Decision Curve Analysis ===")
        print(f"Prevalence: {curve['prevalence']:.3f} (n={curve['n']})")
        print(f"AUC-ROC (test): {result['auc_roc']:.3f}" if result['auc_roc'] else "AUC: n/a")
        print("Kontribusi per variabel:", contributions)

    return result


if __name__ == "__main__":
    res = run_dca(verbose=True)