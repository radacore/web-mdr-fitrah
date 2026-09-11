"""
Model Interpretability Module untuk Prediksi Keberhasilan Pengobatan MDR-TB

Modul ini menangani:
- Odds Ratio dari Logistic Regression via Firth penalized logistic (single source of truth).
- SHAP values analitik: LR (phi=beta*(x-E[x])), DT (TreeExplainer-style approx), SVM (permutation fallback).
- Feature Importance dari Decision Tree.
- Permutation Importance untuk model apapun (SVM, dll).
"""

import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from scipy import stats
from typing import Dict, List, Any, Optional

try:
    from shap_exact import exact_shap_svm, _background_sample, SHAP_BACKGROUND_NAME
except ImportError:
    # notebook flat-import path
    from shap_exact import exact_shap_svm, _background_sample, SHAP_BACKGROUND_NAME


def _firth_lookup_for_lr(
    feature_names: List[str],
    feature_selection_result: Optional[Dict[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    """Build {feature: firth result dict} from cached raw firth_results.
    Reads the raw firth output (with coefficient/ci) instead of the summary feature rows."""
    out: Dict[str, Dict[str, Any]] = {}
    if not feature_selection_result:
        return out
    firth_results = feature_selection_result.get("firth_results") or []
    for f in firth_results:
        name = f.get("feature")
        if name and f.get("p_value") is not None:
            out[name] = {
                "coefficient": f.get("coefficient"),
                "odds_ratio": f.get("odds_ratio"),
                "ci_lower": f.get("ci_lower"),
                "ci_upper": f.get("ci_upper"),
                "p_value": f.get("p_value"),
                "significant": f.get("significant"),
                "method": feature_selection_result.get("firth_method", "firth"),
            }
    return out


def get_lr_odds_ratios(
    lr_pipeline,
    feature_names: List[str],
    feature_selection_result: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Adjusted Odds Ratio (AOR) + 95% CI + p-value untuk Logistic Regression.

    Single source of truth: Firth penalized logistic (dari feature_selection_result).
    Fallback: Wald approx (lama) dgn flag method='wald_fallback' jika firth tidak tersedia.
    """
    firth_map = _firth_lookup_for_lr(feature_names, feature_selection_result)

    try:
        classifier = lr_pipeline.named_steps['classifier']
        coefs = classifier.coef_[0]

        results = []
        for i, (name, coef) in enumerate(zip(feature_names, coefs)):
            fr = firth_map.get(name)
            if fr and fr.get("p_value") is not None:
                # Firth source of truth
                results.append({
                    'feature': name,
                    'coefficient': float(fr.get('coefficient', coef)),
                    'odds_ratio': float(fr['odds_ratio']),
                    'ci_lower': float(fr['ci_lower']),
                    'ci_upper': float(fr['ci_upper']),
                    'p_value': float(fr['p_value']),
                    'significant': bool(fr['significant']),
                    'method': fr.get('method', 'firth'),
                })
            else:
                # Fallback lama (model lama tanpa firth result) — tandai eksplisit
                se = abs(coef) / (abs(coef / 0.5) + 1e-10) if abs(coef) > 1e-10 else 0.5
                z = coef / se if se > 0 else 0.0
                p_value = float(2 * (1 - stats.norm.cdf(abs(z))))
                results.append({
                    'feature': name,
                    'coefficient': float(coef),
                    'odds_ratio': float(np.exp(coef)),
                    'ci_lower': float(np.exp(coef - 1.96 * se)),
                    'ci_upper': float(np.exp(coef + 1.96 * se)),
                    'p_value': p_value,
                    'significant': p_value < 0.05,
                    'method': 'wald_fallback',
                })

        results.sort(key=lambda x: abs(x['coefficient']), reverse=True)
        return results

    except Exception as e:
        print(f"Error extracting LR odds ratios: {e}")
        return []


def get_shap_values(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    feature_names: List[str],
    n_repeats: int = 30,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    SHAP values analitik (white-box). Tidak butuh package shap (yang cap Python<3.11 via numba).

    - Logistic Regression: identity SHAP — phi_i = beta_i * (x_i - E[x_i])
      (LinearExplainer equivalent; sama dgn cell 4127822d notebook disertasi).
    - Decision Tree: mean |SHAP| approx dgn tree.feature_importances_ scaled (proxy); method='tree_proxy'.
    - SVM: permutation fallback (reuse get_permutation_importance_data); method='permutation_fallback'.

    Returns: {method, features:[{name, shap_mean_abs}]}, plus values (LR only) untuk beeswarm.
    """
    try:
        classifier = model.named_steps['classifier']
        scaler = model.named_steps.get('scaler')

        cls_name = type(classifier).__name__

        if cls_name == "LogisticRegression":
            coefs = np.asarray(classifier.coef_[0])
            X_scaled = scaler.transform(X.values) if scaler else X.values
            mean_x = X_scaled.mean(axis=0)
            # phi_i = beta_i * (x_i - E[x_i])
            shap_vals = (X_scaled - mean_x) * coefs  # shape (n, p)
            mean_abs = np.mean(np.abs(shap_vals), axis=0)
            features = [
                {"feature": name, "shap_mean_abs": float(v)}
                for name, v in zip(feature_names, mean_abs)
            ]
            features.sort(key=lambda r: r["shap_mean_abs"], reverse=True)
            return {
                "method": "linear",
                "features": features,
                "values": shap_vals.tolist(),
            }

        if cls_name == "DecisionTreeClassifier":
            importances = np.asarray(classifier.feature_importances_)
            features = [
                {"feature": name, "shap_mean_abs": float(v)}
                for name, v in zip(feature_names, importances)
            ]
            features.sort(key=lambda r: r["shap_mean_abs"], reverse=True)
            return {
                "method": "tree_proxy",
                "features": features,
                "values": None,
            }

        # SVC (RBF) dan lainnya → exact Kernel SHAP (Shapley values eksak).
        # Package shap butuh numba (tak kompatibel Python 3.14); kita hitung
        # native dgn 2^M koalisi — identik dengan KernelExplainer.
        try:
            X_scaled = scaler.transform(X.values) if scaler else X.values
            bg = _background_sample(X_scaled)
            result = exact_shap_svm(
                scaler=scaler,
                clf=classifier,
                X_test=X_scaled,
                background=bg,
                feature_names=feature_names,
            )
            return {
                "method": "kernel_exact",
                "background": result["background"],
                "base_value": result["base_value"],
                "features": result["features"],
                "values": result["values"],
            }
        except Exception as e:
            print(f"Error computing exact SHAP for {cls_name}: {e}")
            # Fallback: permutation
            perm = get_permutation_importance_data(
                model, X, y, feature_names, n_repeats=n_repeats, random_state=random_state
            )
            features = [
                {"feature": r["feature"], "shap_mean_abs": float(r["importance_mean"])}
                for r in perm
            ]
            features.sort(key=lambda r: r["shap_mean_abs"], reverse=True)
            return {
                "method": "permutation_fallback",
                "features": features,
                "values": None,
            }

    except Exception as e:
        print(f"Error computing SHAP values: {e}")
        return {"method": "error", "features": [], "detail": str(e)}


def get_tree_feature_importance(dt_pipeline, feature_names: List[str]) -> List[Dict[str, Any]]:
    """
    Mengekstrak Feature Importance dari Decision Tree classifier.

    Args:
        dt_pipeline: sklearn Pipeline yang berisi step 'classifier' (DecisionTreeClassifier)
        feature_names: Daftar nama fitur

    Returns:
        List of dict: [{feature, importance}] sorted descending
    """
    try:
        classifier = dt_pipeline.named_steps['classifier']
        importances = classifier.feature_importances_

        results = []
        for name, imp in zip(feature_names, importances):
            results.append({
                'feature': name,
                'importance': float(imp)
            })

        results.sort(key=lambda x: x['importance'], reverse=True)
        return results

    except Exception as e:
        print(f"Error extracting DT feature importance: {e}")
        return []


def get_permutation_importance_data(model, X: pd.DataFrame, y: pd.Series,
                                     feature_names: List[str],
                                     n_repeats: int = 30,
                                     random_state: int = 42) -> List[Dict[str, Any]]:
    """
    Menghitung Permutation Importance untuk model apapun.
    Cocok untuk SVM dan model yang tidak punya feature_importances_ bawaan.

    Args:
        model: sklearn Pipeline/model
        X: Feature DataFrame
        y: Target Series
        feature_names: Daftar nama fitur
        n_repeats: Jumlah pengulangan permutasi
        random_state: Random state

    Returns:
        List of dict: [{feature, importance_mean, importance_std}] sorted descending
    """
    try:
        result = permutation_importance(
            model, X, y,
            n_repeats=n_repeats,
            random_state=random_state,
            scoring='f1'
        )

        imp_mean = np.asarray(result['importances_mean'])
        imp_std = np.asarray(result['importances_std'])

        results = []
        for i, name in enumerate(feature_names):
            results.append({
                'feature': name,
                'importance_mean': float(imp_mean[i]),
                'importance_std': float(imp_std[i])
            })

        results.sort(key=lambda x: x['importance_mean'], reverse=True)
        return results

    except Exception as e:
        print(f"Error computing permutation importance: {e}")
        return []


def get_all_interpretability(models: Dict, X: pd.DataFrame, y: pd.Series,
                              feature_names: List[str],
                              feature_selection_result: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Menghitung interpretability data untuk semua model.

    Args:
        feature_selection_result: hasil run_hybrid_selection (sumber firth OR/p-value).
            Jika None, LR odds ratio pakai Wald approx (flag wald_fallback).

    Returns:
        Dictionary per-model: {
            'Logistic Regression': { odds_ratios, permutation_importance, shap },
            'Decision Tree': { feature_importance, permutation_importance, shap },
            'Support Vector Machine': { permutation_importance, shap }
        }
    """
    results = {}

    for name, model in models.items():
        model_results = {}

        # Odds Ratio (hanya untuk Logistic Regression) — source of truth: firth
        if 'Logistic Regression' in name:
            model_results['odds_ratios'] = get_lr_odds_ratios(
                model, feature_names, feature_selection_result
            )

        # Tree Feature Importance (hanya untuk Decision Tree)
        if 'Decision Tree' in name:
            model_results['feature_importance'] = get_tree_feature_importance(model, feature_names)

        # Permutation Importance (untuk semua model)
        model_results['permutation_importance'] = get_permutation_importance_data(
            model, X, y, feature_names, n_repeats=30
        )

        # SHAP (analitik, semua model)
        model_results['shap'] = get_shap_values(model, X, y, feature_names)

        results[name] = model_results

    return results


def get_class_distribution(y: pd.Series) -> Dict[str, Any]:
    """
    Menghitung distribusi kelas pada target variable.

    Returns:
        Dictionary: { counts: {0: n, 1: m}, percentages: {0: p, 1: q}, total: N, imbalance_ratio: r }
    """
    counts = y.value_counts().to_dict()
    total = len(y)
    percentages = {k: round(v / total * 100, 2) for k, v in counts.items()}

    # Imbalance ratio = majority / minority
    if len(counts) >= 2:
        majority = max(counts.values())
        minority = min(counts.values())
        imbalance_ratio = round(majority / minority, 2) if minority > 0 else float('inf')
    else:
        imbalance_ratio = 0.0

    return {
        'counts': {str(k): int(v) for k, v in counts.items()},
        'percentages': {str(k): float(v) for k, v in percentages.items()},
        'total': total,
        'imbalance_ratio': imbalance_ratio
    }
