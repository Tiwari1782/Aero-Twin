"""
feature_engineer.py — Computes 12 engineered ML features from sensor history.

Features (computed from last 10 readings per component):
    F1:  rolling_mean_vibration_10    — Mean vibration, last 10 ticks
    F2:  rolling_std_vibration_10     — Vibration instability
    F3:  vibration_slope_20           — Rate of vibration increase
    F4:  rolling_mean_temp_10         — Mean temperature, last 10 ticks
    F5:  temp_rise_rate               — °C gained per flight hour
    F6:  rolling_std_temp_10          — Thermal instability
    F7:  rpm_drift                    — Deviation from baseline RPM
    F8:  vib_temp_correlation         — Mechanical-thermal coupling indicator
    F9:  cumulative_fatigue           — Physics-based fatigue score
    F10: health_score                 — Current health percentage
    F11: flight_hour_normalised       — Time elapsed (0–1 scale, max 1000 hrs)
    F12: max_z_score_10               — Max anomaly z-score, last 10 ticks
"""

import numpy as np
from component_mapper import COMPONENT_SENSOR_MAP

# Baseline RPM values for drift computation
BASELINE_RPM = {
    'turbine_blade': 1400.0,
    'compressor': 8135.0,
    'bearing': 8130.0,
}

MAX_FLIGHT_HOURS = 1000.0


def compute_features(readings_history, fatigue_data):
    """
    Compute 12 engineered features from the last N sensor readings.

    Args:
        readings_history (list[dict]): Last 10+ readings for a single component.
            Each dict: {temperature, vibration, rpm, flight_hour, component_id}
        fatigue_data (dict): {cumulative_fatigue, health_score} for the component.

    Returns:
        dict: 12 named features, or None if insufficient history.
    """
    if not readings_history or len(readings_history) < 3:
        return None

    comp_id = readings_history[0]['component_id'] if readings_history else 'unknown'

    # Extract arrays from history (most recent last)
    temps = np.array([float(r['temperature']) for r in readings_history])
    vibs = np.array([float(r['vibration']) for r in readings_history])
    rpms = np.array([float(r['rpm']) for r in readings_history])
    flight_hours = np.array([float(r['flight_hour']) for r in readings_history])

    # Use last 10 readings (or all if fewer)
    last_10_temps = temps[-10:]
    last_10_vibs = vibs[-10:]
    last_10_rpms = rpms[-10:]

    # F1: rolling_mean_vibration_10
    rolling_mean_vib = float(np.mean(last_10_vibs))

    # F2: rolling_std_vibration_10
    rolling_std_vib = float(np.std(last_10_vibs)) if len(last_10_vibs) > 1 else 0.0

    # F3: vibration_slope_20 — linear regression slope over last 20 (or available)
    last_20_vibs = vibs[-20:]
    if len(last_20_vibs) > 1:
        x = np.arange(len(last_20_vibs))
        coeffs = np.polyfit(x, last_20_vibs, 1)
        vib_slope = float(coeffs[0])
    else:
        vib_slope = 0.0

    # F4: rolling_mean_temp_10
    rolling_mean_temp = float(np.mean(last_10_temps))

    # F5: temp_rise_rate — temperature change per flight hour
    if len(last_10_temps) > 1 and (flight_hours[-1] - flight_hours[-len(last_10_temps)]) > 0:
        temp_change = last_10_temps[-1] - last_10_temps[0]
        hour_change = float(flight_hours[-1] - flight_hours[-len(last_10_temps)])
        temp_rise_rate = temp_change / max(hour_change, 1.0)
    else:
        temp_rise_rate = 0.0

    # F6: rolling_std_temp_10
    rolling_std_temp = float(np.std(last_10_temps)) if len(last_10_temps) > 1 else 0.0

    # F7: rpm_drift — deviation from baseline RPM
    baseline_rpm = BASELINE_RPM.get(comp_id, 8000.0)
    current_rpm = float(rpms[-1])
    rpm_drift = (current_rpm - baseline_rpm) / baseline_rpm

    # F8: vib_temp_correlation — Pearson correlation between vibration and temperature
    if len(last_10_vibs) > 2 and np.std(last_10_vibs) > 0 and np.std(last_10_temps) > 0:
        corr_matrix = np.corrcoef(last_10_vibs, last_10_temps)
        vib_temp_corr = float(corr_matrix[0, 1])
        if np.isnan(vib_temp_corr):
            vib_temp_corr = 0.0
    else:
        vib_temp_corr = 0.0

    # F9: cumulative_fatigue (from fatigue engine)
    cumulative_fatigue = float(fatigue_data.get('cumulative_fatigue', 0.0))

    # F10: health_score (from fatigue engine)
    health_score = float(fatigue_data.get('health_score', 100.0))

    # F11: flight_hour_normalised (0–1 scale)
    current_fh = float(flight_hours[-1])
    flight_hour_normalised = min(current_fh / MAX_FLIGHT_HOURS, 1.0)

    # F12: max_z_score_10 — maximum z-score of vibration and temperature in last 10
    z_scores = []
    if rolling_std_vib > 0:
        vib_z = np.abs((last_10_vibs - rolling_mean_vib) / rolling_std_vib)
        z_scores.extend(vib_z.tolist())
    if rolling_std_temp > 0:
        temp_z = np.abs((last_10_temps - rolling_mean_temp) / rolling_std_temp)
        z_scores.extend(temp_z.tolist())
    max_z_score = float(max(z_scores)) if z_scores else 0.0

    return {
        'rolling_mean_vibration_10': round(rolling_mean_vib, 6),
        'rolling_std_vibration_10': round(rolling_std_vib, 6),
        'vibration_slope_20': round(vib_slope, 6),
        'rolling_mean_temp_10': round(rolling_mean_temp, 6),
        'temp_rise_rate': round(temp_rise_rate, 6),
        'rolling_std_temp_10': round(rolling_std_temp, 6),
        'rpm_drift': round(rpm_drift, 6),
        'vib_temp_correlation': round(vib_temp_corr, 6),
        'cumulative_fatigue': round(cumulative_fatigue, 4),
        'health_score': round(health_score, 4),
        'flight_hour_normalised': round(flight_hour_normalised, 6),
        'max_z_score_10': round(max_z_score, 4),
    }


def features_to_array(features):
    """
    Convert features dict to numpy array in the correct order for the ML model.

    Args:
        features (dict): 12 named features.

    Returns:
        np.ndarray: Shape (1, 12) — single sample, 12 features.
    """
    feature_order = [
        'rolling_mean_vibration_10',
        'rolling_std_vibration_10',
        'vibration_slope_20',
        'rolling_mean_temp_10',
        'temp_rise_rate',
        'rolling_std_temp_10',
        'rpm_drift',
        'vib_temp_correlation',
        'cumulative_fatigue',
        'health_score',
        'flight_hour_normalised',
        'max_z_score_10',
    ]

    values = [features.get(f, 0.0) for f in feature_order]
    return np.array(values).reshape(1, -1)


FEATURE_NAMES = [
    'rolling_mean_vibration_10',
    'rolling_std_vibration_10',
    'vibration_slope_20',
    'rolling_mean_temp_10',
    'temp_rise_rate',
    'rolling_std_temp_10',
    'rpm_drift',
    'vib_temp_correlation',
    'cumulative_fatigue',
    'health_score',
    'flight_hour_normalised',
    'max_z_score_10',
]
