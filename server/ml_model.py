"""
ml_model.py — Random Forest inference wrapper.

Loads the trained aerotwin_model.pkl at startup and provides
a predict() function that returns predicted_rul and confidence.

If the model file is not found, falls back to a simple heuristic
estimator based on health_score so the system still works.
"""

import os
import numpy as np

# Try loading joblib separately from shap so a missing shap doesn't break inference
try:
    import joblib  # pyrefly: ignore
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False

# SHAP is optional — feature importance charts still work without it
SHAP_AVAILABLE = False
try:
    import shap  # pyrefly: ignore  # noqa: F401
    SHAP_AVAILABLE = True
except ImportError:
    pass

from feature_engineer import features_to_array, FEATURE_NAMES


class RULPredictor:
    """ML model wrapper for RUL prediction."""

    def __init__(self, model_path=None):
        """
        Load the trained model from disk.

        Args:
            model_path: Path to the .pkl model file. Defaults to ml/aerotwin_model.pkl.
        """
        if model_path is None:
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(project_root, 'ml', 'aerotwin_model.pkl')

        self.model = None
        self.explainer = None
        self.model_path = model_path
        self.using_fallback = False

        self._load_model()

    def _load_model(self):
        """Attempt to load the trained model."""
        if not JOBLIB_AVAILABLE:
            print("[WARN] joblib not available — using heuristic RUL estimator")
            self.using_fallback = True
            return

        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                print(f"[OK] ML model loaded: {os.path.basename(self.model_path)}")

                # Only initialize SHAP explainer if shap is installed
                if SHAP_AVAILABLE:
                    import shap as _shap  # pyrefly: ignore
                    self.explainer = _shap.TreeExplainer(self.model)
                    print("[OK] SHAP explainer initialized.")
                else:
                    print("[INFO] SHAP not installed — feature importance uses built-in RF importances.")

                self.using_fallback = False
            except Exception as e:
                print(f"[WARN] Model load error: {e} — using heuristic estimator")
                self.using_fallback = True
        else:
            print(f"[WARN] Model not found at {self.model_path} — using heuristic estimator")
            self.using_fallback = True

    def predict(self, features):
        """
        Predict RUL from engineered features.

        Args:
            features (dict): 12 named features from feature_engineer.

        Returns:
            dict: {predicted_rul, confidence, model_type, feature_importance}
        """
        if features is None:
            return {
                'predicted_rul': 500.0,
                'confidence': 0.1,
                'model_type': 'default',
                'feature_importance': {},
            }

        if self.using_fallback or self.model is None:
            return self._heuristic_predict(features)

        try:
            X = features_to_array(features)
            predicted_rul = float(self.model.predict(X)[0])

            # Feature importance dict — use SHAP if available, else RF built-in importances
            feature_importance = {}
            if self.explainer is not None:
                try:
                    shap_values = self.explainer.shap_values(X)
                    # shap_values may be a 2D array (regression) or list (classification)
                    if isinstance(shap_values, list):
                        sv = shap_values[0][0]
                    else:
                        sv = shap_values[0] if shap_values.ndim > 1 else shap_values
                    feature_importance = {
                        FEATURE_NAMES[i]: round(float(sv[i]), 4)
                        for i in range(min(len(FEATURE_NAMES), len(sv)))
                    }
                except Exception as shap_err:
                    print(f"[WARN] SHAP inference error: {shap_err} — using RF importances")
                    feature_importance = self._get_rf_importances()
            else:
                feature_importance = self._get_rf_importances()

            # Compute confidence from individual tree predictions
            if hasattr(self.model, 'estimators_'):
                tree_predictions = np.array([
                    tree.predict(X)[0] for tree in self.model.estimators_
                ])
                std = np.std(tree_predictions)
                mean = np.mean(tree_predictions)
                cv = std / max(abs(mean), 1.0)
                confidence = max(0.0, min(1.0, 1.0 - cv))
            else:
                confidence = 0.75

            # Clamp RUL to reasonable range
            predicted_rul = max(0.0, min(15000.0, predicted_rul))

            return {
                'predicted_rul': round(predicted_rul, 2),
                'confidence': round(float(confidence), 4),
                'model_type': 'random_forest',
                'feature_importance': feature_importance,
            }
        except Exception as e:
            print(f"[WARN] ML prediction error: {e} — falling back to heuristic")
            return self._heuristic_predict(features)

    def _get_rf_importances(self):
        """Return built-in Random Forest feature importances (no SHAP needed)."""
        if self.model is None or not hasattr(self.model, 'feature_importances_'):
            return {}
        importances = self.model.feature_importances_
        return {
            FEATURE_NAMES[i]: round(float(importances[i]), 4)
            for i in range(min(len(FEATURE_NAMES), len(importances)))
        }

    def _heuristic_predict(self, features):
        """
        Simple heuristic RUL estimation based on health_score.
        Used when the trained model is not available.

        For realistic flight hours (cycle * 50), RUL ≈ health_score * 120
        Linear mapping: 100% health → ~12,000 flight hours remaining.
        """
        health = features.get('health_score', 100.0)
        fatigue = features.get('cumulative_fatigue', 0.0)
        fh_norm = features.get('flight_hour_normalised', 0.0)
        vib_slope = features.get('vibration_slope_20', 0.0)

        # Base RUL from health score — scaled to realistic flight hours
        base_rul = health * 120.0

        # Adjust for vibration trend
        if vib_slope > 0:
            trend_penalty = min(vib_slope * 500.0, 3000.0)
            base_rul -= trend_penalty

        # Adjust for flight hours elapsed
        base_rul *= max(0.2, 1.0 - fh_norm * 0.3)

        predicted_rul = max(0.0, min(15000.0, base_rul))

        # Lower confidence for heuristic
        confidence = max(0.3, 0.7 - fatigue * 0.005)

        # Generate synthetic feature importance for display
        feature_importance = {
            'health_score': 0.35,
            'cumulative_fatigue': 0.25,
            'vibration_slope_20': 0.15,
            'temp_slope_20': 0.10,
            'flight_hour_normalised': 0.08,
            'vib_mean_20': 0.04,
            'temp_mean_20': 0.03,
        }

        return {
            'predicted_rul': round(predicted_rul, 2),
            'confidence': round(confidence, 4),
            'model_type': 'heuristic',
            'feature_importance': feature_importance,
        }

    def is_model_loaded(self):
        """Check if the trained model is loaded."""
        return self.model is not None and not self.using_fallback
