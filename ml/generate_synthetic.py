"""
generate_synthetic.py — Generate synthetic degradation trajectories for training.

Generates 40 synthetic engine degradation trajectories using the same
physics-informed formulas as the live simulator. This supplements the
real C-MAPSS data for ML training (30% synthetic / 70% real).
"""

import os
import sys
import math
import random
import numpy as np
import pandas as pd

# Add backend dir to path
server_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'server')
sys.path.insert(0, server_dir)

from component_mapper import COMPONENT_IDS
from feature_engineer import FEATURE_NAMES, compute_features

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'synthetic_data.csv')

# Degradation profiles (same as simulator.py)
PROFILES = {
    'turbine_blade': {
        'base_temp': 1585.0, 'temp_rate': 0.8, 'temp_noise': 5.0,
        'base_vib': 23.4, 'vib_rate': 0.001, 'vib_noise': 0.15,
        'vib_exp_threshold': 100, 'vib_exp_factor': 0.015,
        'base_rpm': 1400.0, 'rpm_drift_pct': -0.0002, 'rpm_noise': 8.0,
        'sensitivity': 1.4,
    },
    'compressor': {
        'base_temp': 642.0, 'temp_rate': 0.5, 'temp_noise': 1.5,
        'base_vib': 47.3, 'vib_rate': 0.002, 'vib_noise': 0.3,
        'vib_exp_threshold': 100, 'vib_exp_factor': 0.012,
        'base_rpm': 392.0, 'rpm_drift_pct': -0.0002, 'rpm_noise': 5.0,
        'sensitivity': 0.9,
    },
    'bearing': {
        'base_temp': 2388.0, 'temp_rate': 0.3, 'temp_noise': 2.0,
        'base_vib': 2388.0, 'vib_rate': 0.003, 'vib_noise': 2.0,
        'vib_exp_threshold': 80, 'vib_exp_factor': 0.018,
        'base_rpm': 8130.0, 'rpm_drift_pct': -0.0002, 'rpm_noise': 5.0,
        'sensitivity': 1.1,
    }
}


def generate_trajectory(engine_id, comp_id, max_cycles):
    """Generate a single synthetic degradation trajectory."""
    profile = PROFILES[comp_id]
    rows = []
    readings_history = []
    cumulative_fatigue = 0.0

    # Add slight randomness to degradation rates
    rate_multiplier = random.uniform(0.7, 1.3)

    for cycle in range(1, max_cycles + 1):
        # Temperature
        temp = (profile['base_temp']
                + cycle * profile['temp_rate'] * rate_multiplier
                + random.gauss(0, profile['temp_noise']))

        # Vibration
        linear_vib = profile['base_vib'] + cycle * profile['vib_rate'] * rate_multiplier
        if cycle > profile['vib_exp_threshold']:
            excess = cycle - profile['vib_exp_threshold']
            exp_comp = profile['vib_exp_factor'] * rate_multiplier * (math.exp(excess * 0.01) - 1)
            vib = linear_vib + exp_comp
        else:
            vib = linear_vib
        vib += random.gauss(0, profile['vib_noise'])

        # RPM
        rpm = (profile['base_rpm']
               * (1 + cycle * profile['rpm_drift_pct'] * rate_multiplier)
               + random.gauss(0, profile['rpm_noise']))

        rul = max_cycles - cycle  # True RUL

        readings_history.append({
            'component_id': comp_id,
            'temperature': temp,
            'vibration': vib,
            'rpm': rpm,
            'flight_hour': cycle,
        })

        # Fatigue
        t_factor = max(temp / max(profile['base_temp'], 1.0), 0.01)
        v_factor = max(vib / max(profile['base_vib'], 0.01), 0.01)
        rpm_factor = max(rpm / max(profile['base_rpm'], 1.0), 0.01)
        fd = (t_factor ** 1.4) * (v_factor ** 1.8) * (rpm_factor ** 1.2) * profile['sensitivity']
        fatigue_delta = max(0, (fd - profile['sensitivity'] * 0.8)) * 0.5
        cumulative_fatigue += fatigue_delta
        health_score = max(0, 100.0 - cumulative_fatigue)

        if len(readings_history) < 10:
            continue

        fatigue_data = {
            'cumulative_fatigue': cumulative_fatigue,
            'health_score': health_score,
        }
        features = compute_features(readings_history, fatigue_data)
        if not features:
            continue

        rows.append({
            'engine_id': engine_id,
            'component_id': comp_id,
            'cycle': cycle,
            **features,
            'RUL': rul,
        })

    return rows


def generate():
    """Generate all synthetic training data."""
    print("Generating synthetic degradation trajectories...")

    random.seed(42)
    np.random.seed(42)

    all_rows = []
    n_engines = 40  # Speed optimization: ~27,000 samples instead of 1,100,000

    for eng_id in range(1, n_engines + 1):
        max_cycles = random.randint(120, 350)

        for comp_id in COMPONENT_IDS:
            trajectory = generate_trajectory(eng_id, comp_id, max_cycles)
            all_rows.extend(trajectory)

        if eng_id % 200 == 0:
            print(f"   Generated engine {eng_id}/{n_engines}")

    df = pd.DataFrame(all_rows)
    df.to_csv(OUTPUT_FILE, index=False)

    print(f"\n[OK] Synthetic data saved: {OUTPUT_FILE}")
    print(f"   Total samples: {len(df)}")
    print(f"   Engines: {n_engines}")
    print(f"   Components: {len(COMPONENT_IDS)}")

    return df


if __name__ == '__main__':
    generate()
