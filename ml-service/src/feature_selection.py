"""
Hybrid Feature Selection Module untuk Prediksi Keberhasilan Pengobatan MDR-TB

Metodologi sistematis-hibrida (Filter-Wrapper) untuk disertasi:
- Tahap Pra-Seleksi: drop konstanta, korelasi tinggi (|r|>0.8), VIF tinggi (>10)
- Tahap Statistik (Kelompok A): firthlogist (penalized logistic, robust di small n/separasi)
- Tahap Klinis (Kelompok B): variabel justifikasi klinis (Riwayat_DM, Komorbiditas)
- Tahap Komputasional (Kelompok C): RFE + Random Forest importance
- Tahap Stabilitas: RFE per fold (10-fold), Jaccard seleksi

Leakage-safe: semua perhitungan HANYA pada X_train (post-SMOTE).
stability_across_folds sub-split internal, tidak sentuh X_test/X_val.
"""

from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd
from sklearn.feature_selection import RFE
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
from itertools import combinations


def _fit_firth(X: pd.DataFrame, y: pd.Series, alpha: float = 0.05) -> List[Dict[str, Any]]:
    """
    Firth penalized logistic regression (Firth 1993, Heinze & Schemper 2002).
    Self-implemented via modified IWLS dengan Jeffreys prior builtin — robust
    di small sample / quasi-separation. Tidak butuh package firthlogist
    (yang cap Python<3.11).

    p-value via Wald (z=coef/se) dgn se dari covariance matrix penalized.
    CI 95% = exp(coef ± 1.96*se).

    Returns: [{feature, coef, odds_ratio, ci_lower, ci_upper, p_value, significant, method}]
    """
    from scipy import optimize
    from scipy.stats import norm

    feature_names = list(X.columns)
    X_arr = np.asarray(X.values, dtype=float)
    y_arr = np.asarray(y).astype(int).ravel()
    n, p = X_arr.shape

    # Design matrix dengan intercept
    X_design = np.hstack([np.ones((n, 1)), X_arr])
    d = X_design.shape[1]

    def sigmoid(z):
        z = np.clip(z, -30, 30)
        return 1.0 / (1.0 + np.exp(-z))

    def penalized_loglik(beta):
        eta = X_design @ beta
        mu = sigmoid(eta)
        mu = np.clip(mu, 1e-10, 1 - 1e-10)
        # log-likelihood binomial
        ll = np.sum(y_arr * np.log(mu) + (1 - y_arr) * np.log(1 - mu))
        # Firth penalty: 0.5 * log|X'W X| (Jeffreys prior builtin)
        W = mu * (1 - mu)
        W = np.clip(W, 1e-10, None)
        XWX = (X_design * W[:, None]).T @ X_design
        sign, logdet = np.linalg.slogdet(XWX)
        if sign <= 0:
            logdet = np.log(max(np.linalg.det(XWX + 1e-8 * np.eye(d)), 1e-10))
        penalty = 0.5 * logdet
        return ll + penalty  # maximize

    def neg_penalized_loglik(beta):
        return -penalized_loglik(beta)

    def grad(beta):
        eta = X_design @ beta
        mu = sigmoid(eta)
        mu = np.clip(mu, 1e-10, 1 - 1e-10)
        W = mu * (1 - 1e-10)
        W = np.clip(W, 1e-10, None)
        # gradient of log-lik
        g_ll = X_design.T @ (y_arr - mu)
        # gradient of penalty: 0.5 * d/dbeta log|X'WX|
        # d log|A|/dbeta_i = trace(A^-1 dA/dbeta_i); dA/dbeta_i = X_diag(dW/dbeta_i) X
        # approximasi: gunakan Hessian-based update IWLS
        XWX = (X_design * W[:, None]).T @ X_design
        try:
            XWX_inv = np.linalg.inv(XWX + 1e-8 * np.eye(d))
        except np.linalg.LinAlgError:
            XWX_inv = np.linalg.pinv(XWX)
        # dW/dbeta_i = mu*(1-mu)*(1-2*mu)*X_j  → kompleks; gunakan finite diff fallback
        g_pen = np.zeros(d)
        eps = 1e-5
        base = penalized_loglik(beta)
        for i in range(d):
            bp = beta.copy()
            bp[i] += eps
            g_pen[i] = (penalized_loglik(bp) - base) / eps
        return -(g_ll + g_pen)

    # Inisialisasi: intercept = logit(mean(y)), koef lain 0
    py = max(np.mean(y_arr), 1e-3)
    py = min(py, 1 - 1e-3)
    beta0 = np.zeros(d)
    beta0[0] = np.log(py / (1 - py))

    # Optimasi: gunakan BFGS (neg likelihood) dengan grad (jika konvergen),
    # fallback ke IWLS iteratif.
    beta = beta0.copy()
    converged = False
    try:
        res = optimize.minimize(
            neg_penalized_loglik, beta0, jac=grad, method="BFGS",
            options={"maxiter": 200, "gtol": 1e-6},
        )
        if res.success or res.fun < neg_penalized_loglik(beta0):
            beta = res.x
            converged = True
    except Exception:
        pass

    if not converged:
        # IWLS Firth fallback (Heinze & Schemper 2002 modified score)
        beta = beta0.copy()
        for _ in range(100):
            eta = X_design @ beta
            mu = sigmoid(eta)
            mu = np.clip(mu, 1e-10, 1 - 1e-10)
            W = mu * (1 - mu)
            W = np.clip(W, 1e-10, None)
            # adjusted response dengan Firth correction
            XWX = (X_design * W[:, None]).T @ X_design
            try:
                XWX_inv = np.linalg.inv(XWX + 1e-8 * np.eye(d))
            except np.linalg.LinAlgError:
                XWX_inv = np.linalg.pinv(XWX)
            # hat matrix diagonal
            h = np.einsum("ij,jk,ik->i", X_design, XWX_inv, X_design)
            # modified response: y + 0.5*(h - 2*mu*h)... gunakan y - mu + 0.5*(1-2*mu)*h
            star = y_arr - mu + 0.5 * (1 - 2 * mu) * h
            z = eta + star / np.clip(W, 1e-10, None)
            beta_new = XWX_inv @ (X_design * W[:, None]).T @ z
            if np.max(np.abs(beta_new - beta)) < 1e-7:
                beta = beta_new
                converged = True
                break
            beta = beta_new

    # Standard error dari covariance matrix (inverse of observed info + penalty Hessian)
    eta = X_design @ beta
    mu = sigmoid(eta)
    mu = np.clip(mu, 1e-10, 1 - 1e-10)
    W = mu * (1 - mu)
    W = np.clip(W, 1e-10, None)
    XWX = (X_design * W[:, None]).T @ X_design
    try:
        cov = np.linalg.inv(XWX + 1e-8 * np.eye(d))
    except np.linalg.LinAlgError:
        cov = np.linalg.pinv(XWX)
    se = np.sqrt(np.clip(np.diag(cov), 0, None))

    # Bukan koef intercept, hanya fitur
    results = []
    for i, name in enumerate(feature_names):
        idx = i + 1  # skip intercept at index 0
        coef = float(beta[idx])
        se_i = float(se[idx]) if se[idx] > 0 else 0.5
        z = coef / se_i if se_i > 0 else 0.0
        p_val = float(2 * (1 - norm.cdf(abs(z))))
        results.append({
            "feature": name,
            "coefficient": coef,
            "odds_ratio": float(np.exp(coef)),
            "ci_lower": float(np.exp(coef - 1.96 * se_i)),
            "ci_upper": float(np.exp(coef + 1.96 * se_i)),
            "p_value": p_val,
            "significant": p_val < alpha,
            "method": "firth",
        })
    return results


def drop_constant_and_near_constant(
    X: pd.DataFrame, variance_threshold: float = 0.01
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Drop kolom konstan / near-konstan (std < threshold)."""
    kept = []
    rejected = []
    for col in X.columns:
        std = float(X[col].std())
        if std < variance_threshold:
            rejected.append({
                "feature": col,
                "detail": {"std": std, "threshold": variance_threshold},
            })
        else:
            kept.append(col)
    return kept, rejected


def correlation_screen(
    X: pd.DataFrame, threshold: float = 0.8
) -> Tuple[List[str], List[Dict[str, Any]], Dict[str, Any]]:
    """
    Drop salah satu dari pasangan |corr|>threshold.
    Heuristik: drop fitur dengan mean |corr| lebih tinggi (info unik lebih sedikit).
    """
    corr = X.corr().abs()
    mean_abs_corr = corr.mean()

    to_drop: set = set()
    rejected_rows: List[Dict[str, Any]] = []
    cols = list(X.columns)

    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            a, b = cols[i], cols[j]
            if a in to_drop or b in to_drop:
                continue
            r = float(corr.loc[a, b])
            if r > threshold:
                # drop yang mean |corr| lebih tinggi
                drop = a if mean_abs_corr[a] >= mean_abs_corr[b] else b
                keep = b if drop == a else a
                to_drop.add(drop)
                rejected_rows.append({
                    "feature": drop,
                    "partner": keep,
                    "correlation": round(r, 3),
                    "detail": {"partner": keep, "r": round(r, 3)},
                })

    kept = [c for c in cols if c not in to_drop]
    matrix_payload = {
        "labels": cols,
        "matrix": corr.round(3).values.tolist(),
    }
    return kept, rejected_rows, matrix_payload


def vif_screen(
    X: pd.DataFrame, threshold: float = 10.0
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Iterative VIF drop. Variance inflation factor via statsmodels."""
    try:
        from statsmodels.stats.outliers_influence import variance_inflation_factor
    except ImportError:
        print("Warning: statsmodels not installed. Skipping VIF screen.")
        return list(X.columns), []

    kept = list(X.columns)
    rejected: List[Dict[str, Any]] = []

    while True:
        if len(kept) < 3:
            break
        X_sub = X[kept]
        vifs = []
        for i, col in enumerate(kept):
            try:
                vif = float(variance_inflation_factor(X_sub.values, i))
            except Exception:
                vif = float("inf")
            vifs.append((col, vif))

        max_col, max_vif = max(vifs, key=lambda t: t[1])
        if max_vif <= threshold:
            break
        kept.remove(max_col)
        rejected.append({
            "feature": max_col,
            "vif": round(max_vif, 2),
            "detail": {"vif": round(max_vif, 2), "threshold": threshold},
        })

    return kept, rejected


def rf_importance_ranking(
    X: pd.DataFrame, y: pd.Series, n_estimators: int = 200, random_state: int = 4
) -> List[Dict[str, Any]]:
    """Random Forest Gini importance ranking."""
    rf = RandomForestClassifier(
        n_estimators=n_estimators, random_state=random_state, class_weight="balanced"
    )
    rf.fit(X.values, np.asarray(y).ravel())
    importances = rf.feature_importances_
    rows = [
        {"feature": name, "rf_importance": float(imp)}
        for name, imp in zip(X.columns, importances)
    ]
    rows.sort(key=lambda r: r["rf_importance"], reverse=True)
    return rows


def rfe_ranking(
    X: pd.DataFrame, y: pd.Series, n_to_select: Optional[int] = None,
    random_state: int = 4
) -> List[Dict[str, Any]]:
    """RFE dengan LR estimator. Ranking 1=most important."""
    n_features = X.shape[1]
    if n_to_select is None:
        n_to_select = max(1, n_features // 2)

    estimator = LogisticRegression(
        max_iter=1000, random_state=random_state, class_weight="balanced"
    )
    rfe = RFE(estimator, n_features_to_select=n_to_select)
    rfe.fit(X.values, np.asarray(y).ravel())

    rows = []
    for i, name in enumerate(X.columns):
        rows.append({
            "feature": name,
            "rfe_rank": int(i + 1) if hasattr(rfe, "ranking_") and False else None,
        })

    # gunakan ranking_ bila tersedia
    if hasattr(rfe, "ranking_"):
        for i, name in enumerate(X.columns):
            for row in rows:
                if row["feature"] == name:
                    row["rfe_rank"] = int(rfe.ranking_[i])
                    row["rfe_selected"] = bool(rfe.support_[i])

    rows.sort(key=lambda r: (r.get("rfe_rank") or 9999))
    return rows


def stability_across_folds(
    X: pd.DataFrame, y: pd.Series, n_folds: int = 10,
    random_state: int = 4, select_threshold: float = 0.6
) -> Dict[str, Any]:
    """
    RFE per fold (fit di sub-train). Hitung selection_rate + Jaccard pairwise.
    Leakage-safe: split internal, tidak sentuh test/val eksternal.
    """
    n_features = X.shape[1]
    n_to_select = max(1, n_features // 2)

    cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=random_state)
    per_fold_subsets: List[List[str]] = []
    feature_names = list(X.columns)

    for train_idx, _ in cv.split(X, y):
        X_fold = X.iloc[train_idx]
        y_fold = y.iloc[train_idx]
        estimator = LogisticRegression(
            max_iter=1000, random_state=random_state, class_weight="balanced"
        )
        rfe = RFE(estimator, n_features_to_select=n_to_select)
        rfe.fit(X_fold.values, np.asarray(y_fold).ravel())
        selected = [feature_names[i] for i, s in enumerate(rfe.support_) if s]
        per_fold_subsets.append(selected)

    # selection rate per feature
    selection_rate = {name: 0.0 for name in feature_names}
    for subset in per_fold_subsets:
        for name in subset:
            selection_rate[name] += 1.0
    selection_rate = {name: round(v / n_folds, 3) for name, v in selection_rate.items()}

    # pairwise Jaccard
    jaccards = []
    for a, b in combinations(per_fold_subsets, 2):
        ua, ub = set(a), set(b)
        union = ua | ub
        jaccards.append(len(ua & ub) / len(union) if union else 0.0)
    jaccard_mean = round(float(np.mean(jaccards)), 3) if jaccards else 0.0

    stable_features = [name for name, rate in selection_rate.items() if rate >= select_threshold]

    return {
        "per_fold_subsets": per_fold_subsets,
        "selection_rate": selection_rate,
        "jaccard_mean": jaccard_mean,
        "select_threshold": select_threshold,
        "stable_features": stable_features,
        "n_folds": n_folds,
    }


def run_hybrid_selection(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    clinical_keep: Optional[List[str]] = None,
    corr_threshold: float = 0.8,
    vif_threshold: float = 10.0,
    variance_threshold: float = 0.01,
    n_folds_stability: int = 10,
    select_rate: float = 0.6,
    alpha: float = 0.05,
    random_state: int = 4,
) -> Dict[str, Any]:
    """
    Orkestrasi hybrid feature selection.

    Args:
        X_train, y_train: data training (post-SMOTE). HANYA ini; tidak X_test.
        clinical_keep: Kelompok B (justifikasi klinis).
        corr_threshold: |corr|>threshold → drop satu.
        vif_threshold: VIF>threshold → drop.
        variance_threshold: std< threshold → drop (near-constant).
        n_folds_stability: fold untuk stability pass (default 10).
        select_rate: threshold selection_rate untuk "stable feature".

    Returns: payload /feature-selection.
    """
    if clinical_keep is None:
        clinical_keep = ["Riwayat_DM", "Komorbiditas"]

    X = X_train.copy()
    y = y_train.copy()
    all_features = list(X.columns)

    # --- Tahap 1: Pra-seleksi (Filter) ---
    kept_const, rej_const = drop_constant_and_near_constant(X, variance_threshold)
    X_after_const = X[kept_const]

    kept_corr, rej_corr, corr_matrix = correlation_screen(X_after_const, corr_threshold)
    X_after_corr = X_after_const[kept_corr]

    kept_vif, rej_vif = vif_screen(X_after_corr, vif_threshold)
    kept_vif = [c for c in X.columns if c in kept_vif]  # preserve original order

    # pre-screen rejected set (final)
    pre_rejected: set = set(all_features) - set(kept_vif)

    # --- Tahap 2: Evidence pada fitur yang survive pre-screen ---
    X_surv = X[kept_vif]

    # Kelompok A: firthlogist significance
    firth_results = _fit_firth(X_surv, y, alpha=alpha)
    firth_map = {r["feature"]: r for r in firth_results}

    # Kelompok C: RFE + RF importance
    rf_ranking = rf_importance_ranking(X_surv, y, random_state=random_state)
    rf_map = {r["feature"]: r["rf_importance"] for r in rf_ranking}
    rf_top_k = max(1, len(kept_vif) // 2)
    rf_top_features = {r["feature"] for r in rf_ranking[:rf_top_k]}

    rfe_results = rfe_ranking(X_surv, y, n_to_select=max(1, len(kept_vif) // 2), random_state=random_state)
    rfe_map = {r["feature"]: r for r in rfe_results}
    rfe_selected = {r["feature"] for r in rfe_results if r.get("rfe_selected")}

    # Stability: RFE per fold
    stability = stability_across_folds(
        X_surv, y, n_folds=n_folds_stability, random_state=random_state, select_threshold=select_rate
    )

    # --- Group assignment per feature ---
    features: List[Dict[str, Any]] = []
    selected_features: List[str] = []

    for name in all_features:
        row: Dict[str, Any] = {
            "name": name,
            "status": "rejected",
            "group": None,
            "reason": "",
            "detail": None,
            "correlation_values": None,
            "vif": None,
            "odds_ratio": None,
            "p_value": None,
            "significant": None,
            "rf_importance": None,
            "rfe_rank": None,
            "selection_rate": None,
        }

        # Rejected by pre-screen
        if name in pre_rejected:
            row["status"] = "rejected"
            row["group"] = "pre"
            # cari reason spesifik
            rej = next((r for r in rej_const if r["feature"] == name), None)
            if rej:
                row["reason"] = f"Dibuang karena near-constant (std={rej['detail']['std']:.4f})"
                row["detail"] = rej["detail"]
            else:
                rej = next((r for r in rej_corr if r["feature"] == name), None)
                if rej:
                    r = rej["correlation"]
                    row["reason"] = f"Dibuang karena redundansi tinggi (r={r:.2f}) dengan {rej['partner']}"
                    row["correlation_values"] = {"partner": rej["partner"], "r": r}
                    row["detail"] = rej["detail"]
                else:
                    rej = next((r for r in rej_vif if r["feature"] == name), None)
                    if rej:
                        row["reason"] = f"Dibuang karena multikolinearitas tinggi (VIF={rej['vif']})"
                        row["vif"] = rej["detail"]["vif"]
                        row["detail"] = rej["detail"]
                    else:
                        row["reason"] = "Dibuang pada tahap pra-seleksi"
            features.append(row)
            continue

        # Survives pre-screen → isi evidence
        fr = firth_map.get(name, {})
        row["odds_ratio"] = fr.get("odds_ratio")
        row["p_value"] = fr.get("p_value")
        row["significant"] = fr.get("significant")
        row["rf_importance"] = rf_map.get(name)
        rfe_r = rfe_map.get(name, {})
        row["rfe_rank"] = rfe_r.get("rfe_rank")
        row["selection_rate"] = stability["selection_rate"].get(name)
        # VIF pada fitur yang survive
        vif_match = next((r for r in rej_vif if r["feature"] == name), None)
        if not vif_match:
            # still here → get its VIF if computed
            pass

        sig = fr.get("significant", False)
        p_val = fr.get("p_value")

        # Kelompok A: signifikan
        if sig and p_val is not None:
            row["status"] = "accepted"
            row["group"] = "A"
            row["reason"] = f"Diterima karena signifikansi statistik (p={p_val:.4g}, firth)"
            selected_features.append(name)
            features.append(row)
            continue

        # Kelompok B: justifikasi klinis
        if name in clinical_keep:
            row["status"] = "accepted"
            row["group"] = "B"
            p_str = f"p={p_val:.4g}" if p_val is not None else "p=n/a"
            row["reason"] = f"Diterima karena justifikasi klinis ({p_str}, marginal statitik)"
            selected_features.append(name)
            features.append(row)
            continue

        # Kelompok C: RFE-selected atau RF top-k
        if name in rfe_selected or name in rf_top_features:
            row["status"] = "accepted"
            row["group"] = "C"
            rfe_r_val = rfe_r.get("rfe_rank")
            rf_val = rf_map.get(name)
            parts = []
            if name in rfe_selected:
                parts.append(f"terpilih RFE (rank={rfe_r_val})")
            if name in rf_top_features:
                parts.append(f"RF importance={rf_val:.4f}")
            row["reason"] = f"Diterima karena evidence komputasional ({', '.join(parts)})"
            selected_features.append(name)
            features.append(row)
            continue

        # Stabilitas tinggi tapi tidak masuk kategori di atas? tetap diterima sbg C tambahan
        sr = stability["selection_rate"].get(name, 0.0)
        if sr >= select_rate:
            row["status"] = "accepted"
            row["group"] = "C"
            row["reason"] = f"Diterima karena stabilitas seleksi tinggi (rate={sr:.2f})"
            selected_features.append(name)
            features.append(row)
            continue

        # Ditolak
        row["status"] = "rejected"
        row["group"] = "C"
        p_str = f"p={p_val:.4g}" if p_val is not None else "p=n/a"
        rank_str = f"rank={rfe_r.get('rfe_rank')}" if rfe_r.get("rfe_rank") else "rank=n/a"
        rf_str = f"{rf_map.get(name, 0):.4f}" if rf_map.get(name) is not None else "n/a"
        row["reason"] = (
            f"Ditolak: tidak signifikan ({p_str}), tidak terpilih RFE ({rank_str}), "
            f"RF importance rendah ({rf_str}), stabilitas rate={sr:.2f}"
        )
        features.append(row)

    accepted = len(selected_features)
    rejected = len(all_features) - accepted

    return {
        "selected_features": selected_features,
        "summary": {
            "total": len(all_features),
            "accepted": accepted,
            "rejected": rejected,
        },
        "features": features,
        "stability": stability,
        "correlation_matrix": corr_matrix,
        "groups_definition": {
            "A": "Statistik (firthlogist p<0.05)",
            "B": "Justifikasi klinis (Riwayat_DM, Komorbiditas)",
            "C": "Komputasional (RFE / RF importance / stabilitas)",
            "pre": "Dibuang pada pra-seleksi (konstan/korelasi/VIF)",
        },
        "firth_method": firth_results[0].get("method") if firth_results else "error",
        "firth_results": firth_results,
        "config": {
            "corr_threshold": corr_threshold,
            "vif_threshold": vif_threshold,
            "variance_threshold": variance_threshold,
            "alpha": alpha,
            "n_folds_stability": n_folds_stability,
            "select_rate": select_rate,
        },
    }


if __name__ == "__main__":
    # Self-check: load CSV, run selection, assert reasonable subset.
    import os
    import sys

    here = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, here)
    from preprocessing import DataPreprocessor

    pre = DataPreprocessor()
    csv_path = os.path.join(here, "..", "data", "data_uji_ml.csv")
    df = pre.load_data(csv_path)
    df_p = pre.preprocess(df)
    X, y = pre.get_features_and_target(df_p)

    result = run_hybrid_selection(X, y)
    sel = result["selected_features"]
    print(f"\n=== Hybrid Feature Selection ===")
    print(f"Total: {result['summary']['total']}")
    print(f"Accepted: {result['summary']['accepted']} -> {sel}")
    print(f"Rejected: {result['summary']['rejected']}")
    print(f"Stability jaccard_mean: {result['stability']['jaccard_mean']}")
    print(f"Firth method: {result['firth_method']}")
    print("\nPer-feature:")
    for f in result["features"]:
        print(f"  [{f['group'] or '-'}] {f['status']:8s} {f['name']:35s} {f['reason']}")

    assert 5 <= len(sel) <= 17, f"selected_features out of range: {len(sel)}"
    print("\nSelf-check PASSED.")
