"""
ablation_study.py — Quantify the contribution of physics-informed features (F9, F10).

Compares:
1. Baseline Model (Pure Data-Driven): 10 features WITHOUT Physics (Excludes F9, F10)
2. Proposed Hybrid Model (Physics-Informed): All 12 features WITH Physics (F9 cumulative_fatigue, F10 health_score)

Uses 5-Fold GroupKFold cross-validation grouped strictly by engine_id to prevent data leakage.
Outputs:
- Per-fold and mean MAE, RMSE, R²
- Relative improvement percentage (delta MAE, delta RMSE, delta R²)
- Formatted Markdown table ready to insert into research papers.
"""

import os
import sys
import time
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupKFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Add server to path
server_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'server')
sys.path.insert(0, server_dir)

from feature_engineer import FEATURE_NAMES

ML_DIR = os.path.dirname(os.path.abspath(__file__))
CMAPSS_DATA = os.path.join(ML_DIR, 'training_data.csv')
SYNTHETIC_DATA = os.path.join(ML_DIR, 'synthetic_data.csv')

# Feature subsets
ALL_FEATURES = list(FEATURE_NAMES)
PHYSICS_FEATURES = ['cumulative_fatigue', 'health_score']
NON_PHYSICS_FEATURES = [f for f in ALL_FEATURES if f not in PHYSICS_FEATURES]


def run_ablation(n_splits=5, sample_fraction=1.0):
    print("\n" + "="*75)
    print("       AeroTwin PHM Research — Physics Feature Ablation Study")
    print("="*75)
    print(f"Configurations:")
    print(f"  • Model A (Pure Data-Driven) : {len(NON_PHYSICS_FEATURES)} features (Excludes F9, F10)")
    print(f"  • Model B (Physics-Informed) : {len(ALL_FEATURES)} features (Includes F9, F10)")
    print(f"  • Validation Strategy        : {n_splits}-Fold GroupKFold (grouped by engine_id)")
    print("="*75)

    # 1. Load Data
    dfs = []
    if os.path.exists(CMAPSS_DATA):
        c_df = pd.read_csv(CMAPSS_DATA)
        c_df['engine_group'] = 'cmapss_' + c_df['engine_id'].astype(str)
        dfs.append(c_df)
    if os.path.exists(SYNTHETIC_DATA):
        s_df = pd.read_csv(SYNTHETIC_DATA)
        s_df['engine_group'] = 'synth_' + s_df['engine_id'].astype(str)
        dfs.append(s_df)

    if not dfs:
        print("[ERROR] Training data not found.")
        return

    combined_df = pd.concat(dfs, ignore_index=True)
    print(f"\n[OK] Loaded total dataset: {len(combined_df)} samples across {combined_df['engine_group'].nunique()} engines.")

    # Subsample engines if fraction < 1.0 (for rapid benchmarking)
    if sample_fraction < 1.0:
        unique_engines = combined_df['engine_group'].unique()
        rng = np.random.RandomState(42)
        selected_engines = rng.choice(unique_engines, size=int(len(unique_engines) * sample_fraction), replace=False)
        combined_df = combined_df[combined_df['engine_group'].isin(selected_engines)].reset_index(drop=True)
        print(f"   Subsampled to: {len(combined_df)} samples across {len(selected_engines)} engines.")

    y = np.minimum(combined_df['RUL'].values, 500)
    groups = combined_df['engine_group'].values

    # Clean data
    X_full = combined_df[ALL_FEATURES].values
    mask = np.isfinite(X_full).all(axis=1) & np.isfinite(y)
    combined_df = combined_df[mask].reset_index(drop=True)
    y = y[mask]
    groups = groups[mask]

    X_no_phys = combined_df[NON_PHYSICS_FEATURES].values
    X_with_phys = combined_df[ALL_FEATURES].values

    gkf = GroupKFold(n_splits=n_splits)

    results_no_phys = {'mae': [], 'rmse': [], 'r2': []}
    results_with_phys = {'mae': [], 'rmse': [], 'r2': []}

    print(f"\nEvaluating {n_splits} folds...")
    t_start = time.time()

    for fold, (train_idx, val_idx) in enumerate(gkf.split(X_full, y, groups=groups), 1):
        print(f"\n--- Fold {fold}/{n_splits} ---")
        y_train, y_val = y[train_idx], y[val_idx]

        # Model A: Pure Data-Driven
        X_train_a, X_val_a = X_no_phys[train_idx], X_no_phys[val_idx]
        rf_a = RandomForestRegressor(n_estimators=100, max_depth=12, min_samples_split=5, random_state=42, n_jobs=-1)
        rf_a.fit(X_train_a, y_train)
        pred_a = rf_a.predict(X_val_a)

        mae_a = mean_absolute_error(y_val, pred_a)
        rmse_a = np.sqrt(mean_squared_error(y_val, pred_a))
        r2_a = r2_score(y_val, pred_a)

        results_no_phys['mae'].append(mae_a)
        results_no_phys['rmse'].append(rmse_a)
        results_no_phys['r2'].append(r2_a)

        # Model B: Physics-Informed (Hybrid)
        X_train_b, X_val_b = X_with_phys[train_idx], X_with_phys[val_idx]
        rf_b = RandomForestRegressor(n_estimators=100, max_depth=12, min_samples_split=5, random_state=42, n_jobs=-1)
        rf_b.fit(X_train_b, y_train)
        pred_b = rf_b.predict(X_val_b)

        mae_b = mean_absolute_error(y_val, pred_b)
        rmse_b = np.sqrt(mean_squared_error(y_val, pred_b))
        r2_b = r2_score(y_val, pred_b)

        results_with_phys['mae'].append(mae_b)
        results_with_phys['rmse'].append(rmse_b)
        results_with_phys['r2'].append(r2_b)

        fold_imp = (mae_a - mae_b) / mae_a * 100.0
        print(f"  Fold {fold} Model A (Pure Data) : MAE = {mae_a:.2f}, RMSE = {rmse_a:.2f}, R² = {r2_a:.4f}")
        print(f"  Fold {fold} Model B (+ Physics)  : MAE = {mae_b:.2f}, RMSE = {rmse_b:.2f}, R² = {r2_b:.4f}")
        print(f"  --> MAE Improvement: {fold_imp:+.2f}%")

    elapsed = time.time() - t_start

    # Summary calculations
    mean_mae_a = np.mean(results_no_phys['mae'])
    std_mae_a = np.std(results_no_phys['mae'])
    mean_rmse_a = np.mean(results_no_phys['rmse'])
    mean_r2_a = np.mean(results_no_phys['r2'])

    mean_mae_b = np.mean(results_with_phys['mae'])
    std_mae_b = np.std(results_with_phys['mae'])
    mean_rmse_b = np.mean(results_with_phys['rmse'])
    mean_r2_b = np.mean(results_with_phys['r2'])

    mae_reduction_pct = (mean_mae_a - mean_mae_b) / mean_mae_a * 100.0
    rmse_reduction_pct = (mean_rmse_a - mean_rmse_b) / mean_rmse_a * 100.0
    r2_increase_pct = (mean_r2_b - mean_r2_a) / max(abs(mean_r2_a), 0.001) * 100.0

    print("\n" + "="*75)
    print("                    ABLATION STUDY FINAL SUMMARY")
    print("="*75)
    print(f"Execution completed in {elapsed:.1f} seconds.\n")
    print(f"Model A (Pure Data-Driven, 10 features):")
    print(f"   Mean MAE  : {mean_mae_a:.2f} ± {std_mae_a:.2f} flight hours")
    print(f"   Mean RMSE : {mean_rmse_a:.2f}")
    print(f"   Mean R²   : {mean_r2_a:.4f}")
    print(f"\nModel B (Hybrid Physics-Informed, 12 features):")
    print(f"   Mean MAE  : {mean_mae_b:.2f} ± {std_mae_b:.2f} flight hours")
    print(f"   Mean RMSE : {mean_rmse_b:.2f}")
    print(f"   Mean R²   : {mean_r2_b:.4f}")
    print("\n" + "-"*75)
    print(f"  ★ MAE Error Reduction      : {mae_reduction_pct:+.2f}%  (Lower is better)")
    print(f"  ★ RMSE Error Reduction     : {rmse_reduction_pct:+.2f}%  (Lower is better)")
    print(f"  ★ R² Score Gain            : {r2_increase_pct:+.2f}%  (Higher is better)")
    print("="*75)

    # Markdown formatted report for research paper
    markdown_table = f"""
### Ablation Study Results: Pure Data-Driven vs. Hybrid Physics-Informed Model

| Model Configuration | Feature Space | MAE (Flight Hours) | RMSE (Flight Hours) | $R^2$ Score |
|---|---|---|---|---|
| **Model A: Pure Data-Driven** | 10 Features (Excludes $F_9, F_{{10}}$) | {mean_mae_a:.2f} ± {std_mae_a:.2f} | {mean_rmse_a:.2f} | {mean_r2_a:.4f} |
| **Model B: Hybrid Physics-Informed** | 12 Features (Includes $F_9, F_{{10}}$) | **{mean_mae_b:.2f} ± {std_mae_b:.2f}** | **{mean_rmse_b:.2f}** | **{mean_r2_b:.4f}** |
| **Improvement ($\Delta$)** | — | **{mae_reduction_pct:+.2f}%** (Error Reduction) | **{rmse_reduction_pct:+.2f}%** | **{r2_increase_pct:+.2f}%** |

*Note: Evaluated across 5-Fold GroupKFold partitioning strictly by Engine ID on {len(combined_df)} samples.*
"""
    print("\nGenerated LaTeX / Markdown Table for Research Paper:")
    print(markdown_table)

    return {
        'model_a': {'mae': mean_mae_a, 'rmse': mean_rmse_a, 'r2': mean_r2_a},
        'model_b': {'mae': mean_mae_b, 'rmse': mean_rmse_b, 'r2': mean_r2_b},
        'mae_reduction_pct': mae_reduction_pct,
        'rmse_reduction_pct': rmse_reduction_pct,
        'r2_increase_pct': r2_increase_pct,
        'table': markdown_table
    }


if __name__ == '__main__':
    # Run with sample_fraction=0.25 (approx 180 engines, 120,000 samples) for fast, statistically rigorous execution
    frac = 0.25 if len(sys.argv) < 2 else float(sys.argv[1])
    run_ablation(n_splits=5, sample_fraction=frac)
