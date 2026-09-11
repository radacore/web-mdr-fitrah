"""
External Validation Module — Kohort Gowa

Validasi eksternal model SVM (9 fitur model produksi web yang tersedia di
kedua dataset):

    Ket.Usia, Status Bekerja, Status Merokok, Riwayat_DM, Riwayat_HIV,
    Kepatuhan Minum Obat, Efek Samping Obat,
    Riwayat Pengobatan Sebelumnya, Panduan Pengobatan

Alur (Skenario 3 — augmentasi data latih):
1. Gabungkan data latih internal (data_uji_ml.csv) + Gowa (data_gowa.csv)
   menjadi satu dataset latih (196 baris).
2. Latih model SVM 9-fitur + SMOTE + tuning pada data gabungan.
3. Evaluasi pada holdout 15% data gabungan (Table 6 kolom "Internal test").
4. Evaluasi eksternal pada seluruh Gowa (Table 6 kolom "External test") +
   ROC eksternal. Catatan: Gowa ikut dalam data latih (augmentasi),
   sehingga metrik eksternal di sini bukan validasi eksternal murni.
5. Kembalikan profil kohort, metrik, dan data ROC.
"""

import os
from typing import Dict, Optional

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, roc_curve, brier_score_loss,
)
from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from gowa_parser import cohort_profile, DEFAULT_OUTPUT

HERE = os.path.dirname(os.path.abspath(__file__))
INTERNAL_DATA = os.path.abspath(os.path.join(HERE, "..", "data", "data_uji_ml.csv"))
GOWA_DATA = os.path.abspath(os.path.join(HERE, "..", "data", "data_gowa.csv"))

# 9 fitur model produksi web yang tersedia di kedua dataset (internal & Gowa).
EXTERNAL_FEATURES = [
    "Ket.Usia",
    "Status Bekerja",
    "Status Merokok",
    "Riwayat_DM",
    "Riwayat_HIV",
    "Kepatuhan Minum Obat",
    "Efek Samping Obat",
    "Riwayat Pengobatan Sebelumnya",
    "Panduan Pengobatan",
]

EXTERNAL_MODEL_NAME = "Support Vector Machine (external 9-fiturs)"
RANDOM_STATE = 42


def _load_internal() -> pd.DataFrame:
    """Load data internal + preprocess (encode) konsisten pipeline produksi."""
    from preprocessing import DataPreprocessor

    df = pd.read_csv(INTERNAL_DATA)
    pre = DataPreprocessor()
    df_processed = pre.preprocess(df)

    # Target sudah di-encode oleh preprocessor (Berhasil=0, Tidak Berhasil=1)
    subset = [c for c in EXTERNAL_FEATURES if c in df_processed.columns]
    out = df_processed[subset + ["Keberhasilan Pengobatan"]].copy()
    # Drop baris dengan missing pada fitur eksternal
    out = out.dropna(subset=subset + ["Keberhasilan Pengobatan"]).reset_index(drop=True)
    return out


def _load_gowa(exclude_mono_inh: bool = True) -> pd.DataFrame:
    df = pd.read_csv(GOWA_DATA)
    df = df.drop(columns=["_hasil_raw", "_jk", "_nama"], errors="ignore")
    # Eksklusi pasien dengan paduan monoresistan INH (bukan TBC RO sejati)
    if exclude_mono_inh and "_paduan_oat" in df.columns:
        df = df[df["_paduan_oat"].fillna("") != "Paduan Monoresistan INH"].reset_index(drop=True)
    df = df.drop(columns=["_paduan_oat"], errors="ignore")
    return df


def _impute_mode(df: pd.DataFrame, cols: list) -> pd.DataFrame:
    """Imputasi mode per kolom (untuk Riwayat_DM 'Tidak Diketahui')."""
    out = df.copy()
    for col in cols:
        if out[col].isna().any():
            mode = out[col].mode().iloc[0]
            out[col] = out[col].fillna(mode)
    return out


def _build_pipeline() -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", SVC(random_state=RANDOM_STATE, probability=True, class_weight="balanced")),
    ])


def _tune_svm(X_train: pd.DataFrame, y_train: pd.Series) -> SVC:
    """Tuning grid SVM RBF (konsisten pipeline produksi)."""
    grid = {
        "C": [0.1, 1, 10, 100],
        "kernel": ["rbf", "linear"],
        "gamma": ["scale", "auto"],
    }
    base = SVC(random_state=RANDOM_STATE, probability=True, class_weight="balanced")
    gs = GridSearchCV(base, grid, cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
                      scoring="f1", n_jobs=-1)
    gs.fit(X_train, y_train)
    return gs.best_estimator_


def _evaluate(y_true, y_pred, y_proba) -> Dict[str, float]:
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = (cm.ravel().tolist() + [0, 0, 0, 0])[:4] if cm.size >= 4 else (0, 0, 0, 0)
    metrics = {
        "accuracy": round(float(accuracy_score(y_true, y_pred)) * 100, 2),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)) * 100, 2),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)) * 100, 2),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)) * 100, 2),
        "specificity": round(float(tn / (tn + fp) * 100), 2) if (tn + fp) > 0 else 0.0,
        "ppv": round(float(precision_score(y_true, y_pred, zero_division=0)) * 100, 2),
        "npv": round(float(tn / (tn + fn) * 100), 2) if (tn + fn) > 0 else 0.0,
        "n": int(len(y_true)),
        "confusion_matrix": {"tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn)},
    }
    if y_proba is not None and len(np.unique(y_true)) > 1:
        try:
            metrics["auc_roc"] = round(float(roc_auc_score(y_true, y_proba)) * 100, 2)
        except Exception:
            metrics["auc_roc"] = None
        try:
            metrics["brier"] = round(float(brier_score_loss(y_true, y_proba)), 4)
        except Exception:
            metrics["brier"] = None
    else:
        metrics["auc_roc"] = None
        metrics["brier"] = None
    return metrics


def _bootstrap_ci(y_true, y_pred, y_proba, n_iter: int = 1000,
                  seed: int = RANDOM_STATE) -> Dict[str, Dict[str, float]]:
    """95% CI bootstrap (percentile) untuk metrik pada satu dataset.

    Mengambil sampel dengan pengembalian (idxs) n_iter kali, menghitung
    metrik per sampel, lalu mengambil persentil 2.5 dan 97.5.
    """
    rng = np.random.RandomState(seed)
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    y_proba = np.asarray(y_proba)
    n = len(y_true)

    metric_names = ["accuracy", "recall", "specificity", "ppv", "npv", "f1", "auc_roc", "brier"]
    acc = {m: [] for m in metric_names}

    for _ in range(n_iter):
        idx = rng.randint(0, n, size=n)
        yt, yp, ypr = y_true[idx], y_pred[idx], y_proba[idx]
        cm = confusion_matrix(yt, yp)
        tn, fp, fn, tp = (cm.ravel().tolist() + [0, 0, 0, 0])[:4] if cm.size >= 4 else (0, 0, 0, 0)
        acc["accuracy"].append(accuracy_score(yt, yp))
        acc["recall"].append(tp / (tp + fn) if (tp + fn) > 0 else 0.0)
        acc["specificity"].append(tn / (tn + fp) if (tn + fp) > 0 else 0.0)
        acc["ppv"].append(tp / (tp + fp) if (tp + fp) > 0 else 0.0)
        acc["npv"].append(tn / (tn + fn) if (tn + fn) > 0 else 0.0)
        acc["f1"].append(f1_score(yt, yp, zero_division=0))
        if len(np.unique(yt)) > 1:
            acc["auc_roc"].append(roc_auc_score(yt, ypr))
            acc["brier"].append(brier_score_loss(yt, ypr))

    out = {}
    for m in metric_names:
        vals = np.asarray(acc[m])
        if len(vals) == 0:
            out[m] = None
            continue
        lo, hi = np.percentile(vals, [2.5, 97.5])
        out[m] = {
            "mean": float(np.mean(vals)),
            "ci_lower": float(lo),
            "ci_upper": float(hi),
        }
    return out


def run_external_validation(use_smote: bool = True, exclude_mono_inh: bool = True, verbose: bool = True) -> Dict[str, object]:
    """Jalankan pipeline external validation (Skenario 3); return dict hasil lengkap.

    Skenario 3: data latih = gabungan internal (Makassar) + Gowa, lalu
    dievaluasi eksternal pada seluruh Gowa. Karena Gowa ikut data latih,
    angka eksternal merefleksikan augmentasi data latih, bukan EV murni.
    """
    internal = _load_internal()
    gowa = _load_gowa(exclude_mono_inh=exclude_mono_inh)

    # Imputasi mode pada Gowa (Riwayat_DM 'Tidak Diketahui')
    gowa = _impute_mode(gowa, ["Riwayat_DM"])

    # Evaluasi eksternal hanya pada baris Gowa dengan outcome lengkap
    gowa_complete = gowa.dropna(subset=["Keberhasilan Pengobatan"]).reset_index(drop=True)

    # ---- Skenario 3: gabung data latih internal + Gowa ----
    merged = pd.concat(
        [
            internal[EXTERNAL_FEATURES + ["Keberhasilan Pengobatan"]],
            gowa_complete[EXTERNAL_FEATURES + ["Keberhasilan Pengobatan"]],
        ],
        ignore_index=True,
    )
    X_all = merged[EXTERNAL_FEATURES]
    y_all = merged["Keberhasilan Pengobatan"]

    # Split 70/15/15 pada data gabungan (untuk kolom Internal test)
    X_rest, X_test, y_rest, y_test = train_test_split(
        X_all, y_all, test_size=0.15, random_state=RANDOM_STATE, stratify=y_all
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_rest, y_rest, test_size=0.15 / 0.85, random_state=RANDOM_STATE, stratify=y_rest
    )

    if use_smote:
        try:
            from imblearn.over_sampling import SMOTE
            sm = SMOTE(random_state=RANDOM_STATE)
            X_train, y_train = sm.fit_resample(X_train, y_train)
            smote_applied = True
        except Exception as e:
            smote_applied = False
            print(f"  [warn] SMOTE gagal: {e}")
    else:
        smote_applied = False

    # Scaling fitur internal + Gowa dengan scaler yang sama
    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_val_s = scaler.transform(X_val)
    X_test_s = scaler.transform(X_test)
    X_gowa_s = scaler.transform(gowa_complete[EXTERNAL_FEATURES])

    clf = _tune_svm(X_train_s, y_train)

    # Evaluasi pada internal test (holdout dari data gabungan)
    y_test_pred = clf.predict(X_test_s)
    y_test_proba = clf.predict_proba(X_test_s)[:, 1]
    internal_metrics = _evaluate(y_test, y_test_pred, y_test_proba)
    internal_ci = _bootstrap_ci(y_test, y_test_pred, y_test_proba)

    # Evaluasi pada validation (untuk referensi internal val)
    y_val_pred = clf.predict(X_val_s)
    y_val_proba = clf.predict_proba(X_val_s)[:, 1]
    internal_val = _evaluate(y_val, y_val_pred, y_val_proba)

    # Evaluasi eksternal: seluruh Gowa (baris dengan outcome lengkap)
    y_gowa_true = gowa_complete["Keberhasilan Pengobatan"].astype(int).values

    y_gowa_pred = clf.predict(X_gowa_s)
    y_gowa_proba = clf.predict_proba(X_gowa_s)[:, 1]
    external_metrics = _evaluate(y_gowa_true, y_gowa_pred, y_gowa_proba)
    external_ci = _bootstrap_ci(y_gowa_true, y_gowa_pred, y_gowa_proba)

    # ROC eksternal — sanitasi inf/nan (roc_curve menaruh inf di thresholds pertama,
    # dan JSON tidak mengizinkan Infinity; PHP json_decode akan gagal)
    fpr, tpr, thr = roc_curve(y_gowa_true, y_gowa_proba)

    def _finite(x):
        return None if x is None or not np.isfinite(x) else float(x)

    external_roc = {
        "fpr": [_finite(x) for x in fpr],
        "tpr": [_finite(x) for x in tpr],
        "thresholds": [_finite(x) for x in thr],
        "auc": external_metrics.get("auc_roc"),
    }

    profile = cohort_profile(gowa, features=EXTERNAL_FEATURES)

    table6 = {
        "internal": {k: internal_metrics.get(k) for k in ["accuracy", "precision", "recall", "f1"]},
        "external": {k: external_metrics.get(k) for k in ["accuracy", "precision", "recall", "f1"]},
        "internal_test": {k: internal_metrics.get(k) for k in ["accuracy", "precision", "recall", "f1"]},
    }

    # Metrik yang direkomendasikan reviewer: Sensitivity(=Recall), Specificity,
    # PPV(=Precision), NPV, F1, AUC-ROC + 95% CI, Brier. CI dihitung bootstrap
    # (n_iter=1000). AUC/Brier juga dilaporkan untuk internal & eksternal.
    metric_cfg = [
        ("accuracy", "Accuracy", True),
        ("precision", "Precision", True),
        ("recall", "Recall", True),
        ("f1", "F1 score", True),
        ("specificity", "Specificity", True),
        ("npv", "NPV", True),
        ("auc_roc", "AUC-ROC", True),
        ("brier", "Brier score", False),
    ]

    def _pct(v):
        return round(float(v) * 100, 2) if v is not None else None

    def _ci_row(ci, key, is_pct):
        if not ci or ci.get(key) is None:
            return None, None, None
        c = ci[key]
        if is_pct:
            return _pct(c["ci_lower"]), _pct(c["ci_upper"]), _pct(c["mean"])
        return round(float(c["ci_lower"]), 4), round(float(c["ci_upper"]), 4), round(float(c["mean"]), 4)

    table6_rows = []
    for metric, label, is_pct in metric_cfg:
        ilo, ihi, imean = _ci_row(internal_ci, metric, is_pct)
        elo, ehi, emean = _ci_row(external_ci, metric, is_pct)
        row = {
            "metric": label,
            "internal_test": internal_metrics.get(metric),
            "external_test": external_metrics.get(metric),
        }
        if ilo is not None:
            row.update({"internal_ci_lower": ilo, "internal_ci_upper": ihi, "internal_ci_mean": imean})
        if elo is not None:
            row.update({"external_ci_lower": elo, "external_ci_upper": ehi, "external_ci_mean": emean})
        table6_rows.append(row)

    result = {
        "status": "success",
        "model": {
            "name": EXTERNAL_MODEL_NAME,
            "best_params": {k: str(v) for k, v in clf.get_params().items() if k in ("C", "gamma", "kernel")},
            "smote_applied": smote_applied,
            "features": EXTERNAL_FEATURES,
        },
        "cohort": profile,
        "table6": {
            "rows": table6_rows,
            "internal": table6["internal_test"],
            "external": table6["external"],
        },
        "internal_metrics": internal_metrics,
        "internal_val_metrics": internal_val,
        "external_metrics": external_metrics,
        "external_roc": external_roc,
        "split": {
            "internal_clean": int(len(merged)),
            "train": int(len(X_train_s)),
            "validation": int(len(X_val_s)),
            "test": int(len(X_test_s)),
            "gowa_total": int(len(gowa)),
            "gowa_valid": int(len(gowa_complete)),
        },
    }

    if verbose:
        print("=== External Validation (Kohort Gowa) — Skenario 3: data latih gabungan ===")
        print(f"Model: {result['model']['name']} | params={result['model']['best_params']} | SMOTE={smote_applied}")
        print(f"Internal test: {internal_metrics}")
        print(f"External test: {external_metrics}")
        print(f"ROC AUC eksternal: {external_metrics.get('auc_roc')}")

    return result


def save_metrics_csv(result: Dict, output: Optional[str] = None):
    """Simpan Table 6 + profil ke CSV (untuk lampiran disertasi)."""
    if output is None:
        output = os.path.abspath(os.path.join(HERE, "..", "notebooks", "figures", "external_validation_table.csv"))
    os.makedirs(os.path.dirname(output), exist_ok=True)
    rows = result["table6"]["rows"]
    df = pd.DataFrame(rows)
    df.to_csv(output, index=False)
    print(f"Table 6 tersimpan: {output}")


if __name__ == "__main__":
    res = run_external_validation(verbose=True)
    save_metrics_csv(res)
