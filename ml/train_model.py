"""
train_model.py — Train Random Forest Regressor for RUL prediction.

Merges C-MAPSS preprocessed data (70%) with synthetic data (30%).
Trains a Random Forest with:
    n_estimators=100, max_depth=12, min_samples_split=5, random_state=42

Evaluates MAE, RMSE, R² on held-out 20% test set.
Saves trained model as ml/aerotwin_model.pkl.
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
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
    """Main training pipeline."""
    print("\n" + "="*60)
    print("  AeroTwin ML Training Pipeline")
    print("="*60)

    # ── Step 1: Load data ──
    dfs = []

    if os.path.exists(CMAPSS_DATA):
        cmapss_df = pd.read_csv(CMAPSS_DATA)
        print(f"[OK] C-MAPSS data loaded: {len(cmapss_df)} samples")
        dfs.append(cmapss_df)
    else:
        print(f"[WARN] C-MAPSS data not found: {CMAPSS_DATA}")
        print(f"   Run preprocess_cmapss.py first!")

    if os.path.exists(SYNTHETIC_DATA):
        synth_df = pd.read_csv(SYNTHETIC_DATA)
        print(f"[OK] Synthetic data loaded: {len(synth_df)} samples")
        dfs.append(synth_df)
    else:
        print(f"[WARN] Synthetic data not found: {SYNTHETIC_DATA}")
        print(f"   Run generate_synthetic.py first!")

    if not dfs:
        print("[ERROR] No training data available. Exiting.")
        return

    # ── Step 2: Merge datasets ──
    combined_df = pd.concat(dfs, ignore_index=True)
    print(f"\nCombined dataset: {len(combined_df)} samples")

    # ── Step 3: Prepare features and target ──
    # Ensure all feature columns exist
    missing_features = [f for f in FEATURE_NAMES if f not in combined_df.columns]
    if missing_features:
        print(f"[ERROR] Missing feature columns: {missing_features}")
        return

    X = combined_df[FEATURE_NAMES].values
    y = combined_df['RUL'].values

    # Cap RUL at 500 (common practice for C-MAPSS to avoid unbounded targets)
    y = np.minimum(y, 500)

    print(f"   Features shape: {X.shape}")
    print(f"   Target range: [{y.min()}, {y.max()}]")
    print(f"   Target mean: {y.mean():.1f}")

    # Handle NaN/Inf
    mask = np.isfinite(X).all(axis=1) & np.isfinite(y)
    X = X[mask]
    y = y[mask]
    print(f"   After NaN removal: {X.shape[0]} samples")

    # ── Step 4: Train/Test Split ──
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"\n   Train set: {X_train.shape[0]} samples")
    print(f"   Test set:  {X_test.shape[0]} samples")

    # ── Step 5: Train Random Forest ──
    print("\nTraining Random Forest Regressor...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
        verbose=1,
    )

    model.fit(X_train, y_train)
    print("[OK] Training complete!")

    # ── Step 6: Evaluate ──
    y_pred = model.predict(X_test)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"\nEvaluation Metrics (on {len(y_test)} test samples):")
    print(f"   MAE:  {mae:.2f} flight hours")
    print(f"   RMSE: {rmse:.2f} flight hours")
    print(f"   R²:   {r2:.4f}")

    # Feature importance
    importances = model.feature_importances_
    print(f"\nFeature Importance:")
    sorted_idx = np.argsort(importances)[::-1]
    for rank, idx in enumerate(sorted_idx, 1):
        print(f"   {rank:2d}. {FEATURE_NAMES[idx]:30s} {importances[idx]:.4f}")

    # ── Step 7: Save model ──
    joblib.dump(model, MODEL_OUTPUT)
    model_size = os.path.getsize(MODEL_OUTPUT) / (1024 * 1024)
    print(f"\n[OK] Model saved: {MODEL_OUTPUT} ({model_size:.1f} MB)")

    print("\n" + "="*60)
    print("  [OK] Training pipeline complete!")
    print("="*60 + "\n")

    return model, {'mae': mae, 'rmse': rmse, 'r2': r2}


if __name__ == '__main__':
    train()
