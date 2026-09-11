"""
Exact Kernel SHAP — implementasi native tanpa package shap/numba.

Package `shap` membutuhkan `numba`, yang tidak kompatibel dengan Python 3.14
(env VPS & dev). Untuk model kecil (M=7 fitur) kita menghitung **Shapley values
secara eksak** dengan semua 2^M koalisi — hasil matematis identik dengan
`shap.KernelExplainer` (Lundberg & Lee, 2017) pada model klasifikasi biner.

Fungsi model: f(x) = P(kelas positif = 1) — probabilitas "Tidak Berhasil".

Algorithm (KernelExplainer equivalence):
    - Koalisi: semua subset fitur (mask biner), 2^M koalisi.
    - Bobot SHAP kernel:  w(z) = (M-1) / (C(M,z) * z * (M-z)), z = |S|.
    - v(S) = E_b[f(x_S)] dihitung di atas dataset background (b).
    - Solusi WLS: phi = argmin sum_S w(S) * (v(S) - base - sum_{j in S} phi_j)^2
      dengan base = E_b[f(background)].

Background dataset diberi nama eksplisit (revisi #4 client):
    SHAP_BACKGROUND_NAME = "50 sampel acak dari data latih bersih (n=151), seed=42"
"""

import numpy as np
from math import comb
from typing import Optional

SHAP_BACKGROUND_NAME = "50 sampel acak dari data latih bersih (n=151), seed=42"
SHAP_BACKGROUND_SIZE = 50
SHAP_RANDOM_STATE = 42


def _shap_kernel_weight(z: int, M: int) -> float:
    if z == 0 or z == M:
        # Koalisi kosong & penuh: anchoring (bobot besar)
        return 1e6
    return (M - 1) / (comb(M, z) * z * (M - z))


def _coalition_masks(M: int) -> np.ndarray:
    """Semua 2^M mask koalisi biner, baris = koalisi, kolom = fitur."""
    return np.array([[ (i >> j) & 1 for j in range(M)] for i in range(2 ** M)], dtype=float)


def _background_sample(X_train: np.ndarray, size: int = SHAP_BACKGROUND_SIZE,
                       random_state: int = SHAP_RANDOM_STATE) -> np.ndarray:
    """Sampling dataset background (reproduksibel)."""
    X_train = np.asarray(X_train)
    n = len(X_train)
    if n <= size:
        return X_train
    rng = np.random.RandomState(random_state)
    idx = rng.choice(n, size=size, replace=False)
    return X_train[idx]


def build_background_from_training_file(preprocessor, scaler, feature_names,
                                        size: int = SHAP_BACKGROUND_SIZE,
                                        random_state: int = SHAP_RANDOM_STATE,
                                        data_path: Optional[str] = None) -> Optional[np.ndarray]:
    """
    Bangun background dari data latih bersih (data/data_uji_ml.csv) yang konsisten
    dengan pipeline produksi. Jika data latih tidak tersedia, return None
    (caller harus fallback ke X_test / X_train yang diberikan).
    """
    import os
    try:
        import pandas as pd
        if data_path is None:
            data_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "data_uji_ml.csv"))
        if not os.path.exists(data_path):
            return None
        df = pd.read_csv(data_path)
        processed = preprocessor.preprocess(df, fit=False)
        subset = [c for c in feature_names if c in processed.columns]
        X_all = processed[subset].dropna()
        if len(X_all) == 0:
            return None
        X_scaled = scaler.transform(X_all.values)
        return _background_sample(X_scaled, size=size, random_state=random_state)
    except Exception as e:
        print(f"build_background_from_training_file failed: {e}")
        return None


def exact_shap_svm(scaler, clf, X_test, background, feature_names,
                   positive_class: int = 1) -> dict:
    """
    Hitung SHAP values eksak (KernelExplainer-equivalent) untuk model SVM.

    Args:
        scaler: StandardScaler yang sudah fit (atau None).
        clf: estimator sklearn (SVC probability=True).
        X_test: array scaled (n_samples, M).
        background: array scaled data latih untuk ekspektasi koalisi.
        feature_names: list nama fitur (M).
        positive_class: kelas yang dijadikan output f(x) (default 1).

    Returns:
        {
          "method": "kernel_exact",
          "background": SHAP_BACKGROUND_NAME,
          "base_value": float,
          "values": [[float, ...], ...],          # shape (n_samples, M)
          "mean_abs": {feature: float, ...},       # mean |SHAP| per fitur
          "features": [{"feature","shap_mean_abs"}],
        }
    """
    X_test = np.asarray(X_test, dtype=float)
    background = np.asarray(background, dtype=float)
    M = len(feature_names)

    def f(X_scaled: np.ndarray) -> np.ndarray:
        """Probabilitas kelas positif (index = positive_class)."""
        X_scaled = np.asarray(X_scaled, dtype=float)
        proba = clf.predict_proba(X_scaled)
        if proba.shape[1] > positive_class:
            return proba[:, positive_class]
        return proba[:, 0]

    masks = _coalition_masks(M)
    n_coal = len(masks)
    n_b = len(background)

    # Bobot koalisi
    zs = masks.sum(axis=1).astype(int)
    weights = np.array([_shap_kernel_weight(z, M) for z in zs])

    # base_value = E_b[f(background)]
    base_value = float(np.mean(f(background)))

    # Design matrix A: A[i, j] = 1 jika fitur j ada di koalisi i
    A = masks

    # Precompute per-sample coalitions
    results = []
    for x in X_test:
        # Bangun matriks koalisi: (n_coal, n_b, M)
        # X_S[i, b, j] = x[j] jika mask[i,j]==1, else background[b, j]
        x_row = x.reshape(1, M)
        X_S = np.where(masks[:, None, :] == 1, x_row, background[None, :, :])  # (n_coal, n_b, M)
        X_flat = X_S.reshape(-1, M)
        y_flat = f(X_flat).reshape(n_coal, n_b)
        v = y_flat.mean(axis=1)  # (n_coal,)

        # Target: v(S) - base
        y_target = v - base_value

        # WLS: phi = argmin sum_S w(S) (v(S)-base - A_S @ phi)^2
        sqrt_w = np.sqrt(weights)
        A_w = sqrt_w[:, None] * A
        y_w = sqrt_w * y_target
        # Tambahkan intercept 0 (base_value sudah diakomodasi di y_target)
        phi, *_ = np.linalg.lstsq(A_w, y_w, rcond=None)
        results.append(phi.astype(float))

    values = np.array(results)  # (n_samples, M)

    mean_abs = np.mean(np.abs(values), axis=0)
    features = [
        {"feature": name, "shap_mean_abs": float(v)}
        for name, v in zip(feature_names, mean_abs)
    ]
    features.sort(key=lambda r: r["shap_mean_abs"], reverse=True)

    return {
        "method": "kernel_exact",
        "background": SHAP_BACKGROUND_NAME,
        "base_value": base_value,
        "values": values.tolist(),
        "mean_abs": {name: float(v) for name, v in zip(feature_names, mean_abs)},
        "features": features,
    }


if __name__ == "__main__":
    from sklearn.preprocessing import StandardScaler
    from sklearn.svm import SVC
    from sklearn.model_selection import train_test_split

    from external_validation import _load_internal, EXTERNAL_FEATURES, RANDOM_STATE

    internal = _load_internal()
    X = internal[EXTERNAL_FEATURES].values
    y = internal["Keberhasilan Pengobatan"].values
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    scaler = StandardScaler().fit(X_train)
    clf = SVC(probability=True, class_weight="balanced", random_state=42).fit(
        scaler.transform(X_train), y_train
    )
    bg = _background_sample(scaler.transform(X_train))
    res = exact_shap_svm(scaler, clf, scaler.transform(X_test[:5]), bg, EXTERNAL_FEATURES)
    print("method:", res["method"], "| background:", res["background"])
    print("base_value:", res["base_value"])
    print("features:", res["features"])