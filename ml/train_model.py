"""
train_model.py — Train Random Forest Regressor for RUL prediction.

Merges C-MAPSS preprocessed data (70%) with synthetic data (30%).
Performs 5-fold GroupKFold cross-validation grouped by engine_id to prevent
data leakage across train and test sets.
Trains final Random Forest with:
    n_estimators=100, max_depth=12, min_samples_split=5, random_state=42

Saves trained model as ml/aerotwin_model.pkl.
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupKFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

# Add server to path
server_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'server')
sys.path.insert(0, server_dir)

from feature_engineer import FEATURE_NAMES

ML_DIR = os.path.dirname(os.path.abspath(__file__))
CMAPSS_DATA = os.path.join(ML_DIR, 'training_data.csv')
SYNTHETIC_DATA = os.path.join(ML_DIR, 'synthetic_data.csv')
MODEL_OUTPUT = os.path.join(ML_DIR, 'aerotwin_model.pkl')


def train():
    """Main training pipeline with GroupKFold cross-validation."""
    print("\n" + "="*60)
    print("  AeroTwin ML Training Pipeline (GroupKFold CV)")
    print("="*60)

    # ── Step 1: Load data ──
    dfs = []

    if os.path.exists(CMAPSS_DATA):
        cmapss_df = pd.read_csv(CMAPSS_DATA)
        cmapss_df['engine_group'] = 'cmapss_' + cmapss_df['engine_id'].astype(str)
        print(f"[OK] C-MAPSS data loaded: {len(cmapss_df)} samples, {cmapss_df['engine_group'].nunique()} engines")
        dfs.append(cmapss_df)
    else:
        print(f"[WARN] C-MAPSS data not found: {CMAPSS_DATA}")
        print(f"   Run preprocess_cmapss.py first!")

    if os.path.exists(SYNTHETIC_DATA):
        synth_df = pd.read_csv(SYNTHETIC_DATA)
        synth_df['engine_group'] = 'synth_' + synth_df['engine_id'].astype(str)
        print(f"[OK] Synthetic data loaded: {len(synth_df)} samples, {synth_df['engine_group'].nunique()} engines")
        dfs.append(synth_df)
    else:
        print(f"[WARN] Synthetic data not found: {SYNTHETIC_DATA}")
        print(f"   Run generate_synthetic.py first!")

    if not dfs:
        print("[ERROR] No training data available. Exiting.")
        return

    # ── Step 2: Merge datasets ──
    combined_df = pd.concat(dfs, ignore_index=True)
    print(f"\nCombined dataset: {len(combined_df)} samples across {combined_df['engine_group'].nunique()} engines")

    # ── Step 3: Prepare features, target, and groups ──
    missing_features = [f for f in FEATURE_NAMES if f not in combined_df.columns]
    if missing_features:
        print(f"[ERROR] Missing feature columns: {missing_features}")
        return

    X = combined_df[FEATURE_NAMES].values
    y = combined_df['RUL'].values
    groups = combined_df['engine_group'].values

    # Cap RUL at 500 (common practice for C-MAPSS to avoid unbounded targets)
    y = np.minimum(y, 500)

    print(f"   Features shape: {X.shape}")
    print(f"   Target range: [{y.min()}, {y.max()}]")
    print(f"   Target mean: {y.mean():.1f}")

    # Handle NaN/Inf
    mask = np.isfinite(X).all(axis=1) & np.isfinite(y)
    X = X[mask]
    y = y[mask]
    groups = groups[mask]
    print(f"   After NaN removal: {X.shape[0]} samples")

    # ── Step 4: 5-Fold GroupKFold Cross-Validation (Per-Engine Split) ──
    n_splits = 5
    gkf = GroupKFold(n_splits=n_splits)
    print(f"\nEvaluating {n_splits}-fold GroupKFold Cross-Validation (split by engine)...")
    
    cv_maes = []
    cv_rmses = []
    cv_r2s = []

    for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups=groups), 1):
        X_tr, X_val = X[train_idx], X[val_idx]
        y_tr, y_val = y[train_idx], y[val_idx]

        fold_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=12,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1,
        )
        fold_model.fit(X_tr, y_tr)
        val_preds = fold_model.predict(X_val)

        fold_mae = mean_absolute_error(y_val, val_preds)
        fold_rmse = np.sqrt(mean_squared_error(y_val, val_preds))
        fold_r2 = r2_score(y_val, val_preds)

        cv_maes.append(fold_mae)
        cv_rmses.append(fold_rmse)
        cv_r2s.append(fold_r2)

        print(f"   Fold {fold}/{n_splits} — MAE: {fold_mae:.2f}, RMSE: {fold_rmse:.2f}, R²: {fold_r2:.4f} (val samples: {len(val_idx)}, val engines: {len(np.unique(groups[val_idx]))})")

    print(f"\nCross-Validation Summary (GroupKFold across {combined_df['engine_group'].nunique()} engines):")
    print(f"   Mean MAE:  {np.mean(cv_maes):.2f} ± {np.std(cv_maes):.2f} flight hours")
    print(f"   Mean RMSE: {np.mean(cv_rmses):.2f} ± {np.std(cv_rmses):.2f} flight hours")
    print(f"   Mean R²:   {np.mean(cv_r2s):.4f} ± {np.std(cv_r2s):.4f}")

    # ── Step 5: Train Final Model on All Data ──
    print("\nTraining final Random Forest on full dataset for deployment...")
    final_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
        verbose=1,
    )
    final_model.fit(X, y)
    print("[OK] Final model training complete!")

    # Feature importance
    importances = final_model.feature_importances_
    print(f"\nFeature Importance (Full Model):")
    sorted_idx = np.argsort(importances)[::-1]
    for rank, idx in enumerate(sorted_idx, 1):
        print(f"   {rank:2d}. {FEATURE_NAMES[idx]:30s} {importances[idx]:.4f}")

    # ── Step 6: Save model ──
    joblib.dump(final_model, MODEL_OUTPUT)
    model_size = os.path.getsize(MODEL_OUTPUT) / (1024 * 1024)
    print(f"\n[OK] Model saved: {MODEL_OUTPUT} ({model_size:.1f} MB)")

    print("\n" + "="*60)
    print("  [OK] Training pipeline complete!")
    print("="*60 + "\n")

    return final_model, {
        'cv_mae_mean': np.mean(cv_maes),
        'cv_mae_std': np.std(cv_maes),
        'cv_rmse_mean': np.mean(cv_rmses),
        'cv_rmse_std': np.std(cv_rmses),
        'cv_r2_mean': np.mean(cv_r2s),
        'cv_r2_std': np.std(cv_r2s),
    }


if __name__ == '__main__':
    train()
