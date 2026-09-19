"""
preprocess_cmapss.py — Preprocess NASA C-MAPSS CSV data for ML training.

Reads the raw C-MAPSS CSV (with headers), maps sensors to components using
the component_mapper, computes all 12 engineered features per row, and
outputs a clean training CSV with features + RUL target.
"""

import os
import sys
import csv
import numpy as np
import pandas as pd

# Add backend directory to path for imports
server_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'server')
sys.path.insert(0, server_dir)

from component_mapper import map_cmapss_row, COMPONENT_IDS, COMPONENT_SENSOR_MAP
from feature_engineer import FEATURE_NAMES, compute_features

# Paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_INPUTS = [
    os.path.join(PROJECT_ROOT, 'Data', 'train_FD001.csv'),
    os.path.join(PROJECT_ROOT, 'Data', 'train_FD002.csv'),
    os.path.join(PROJECT_ROOT, 'Data', 'train_FD003.csv'),
    os.path.join(PROJECT_ROOT, 'Data', 'train_FD004.csv')
]
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'training_data.csv')

# Baseline values for fatigue computation
BASELINES = {
    'turbine_blade': {'temp': 1585.0, 'vib': 23.4, 'rpm': 1400.0, 'sensitivity': 1.4},
    'compressor':    {'temp': 642.0, 'vib': 47.3, 'rpm': 392.0, 'sensitivity': 0.9},
    'bearing':       {'temp': 2388.0, 'vib': 2388.0, 'rpm': 8130.0, 'sensitivity': 1.1},
}


def compute_fatigue_delta(temp, vib, rpm, baseline):
    """Compute one fatigue delta."""
    t_factor = max(temp / max(baseline['temp'], 1.0), 0.01)
    v_factor = max(vib / max(baseline['vib'], 0.01), 0.01)
    rpm_factor = max(rpm / max(baseline['rpm'], 1.0), 0.01)
    sensitivity = baseline['sensitivity']

    fatigue_delta = (t_factor ** 1.4) * (v_factor ** 1.8) * (rpm_factor ** 1.2) * sensitivity
    baseline_fatigue = sensitivity
    return max(0, (fatigue_delta - baseline_fatigue * 0.8)) * 0.5


def preprocess():
    """Main preprocessing pipeline."""
    all_dfs = []
    engine_id_offset = 0
    
    for csv_file in CSV_INPUTS:
        print(f"Reading: {csv_file}")
        df_part = pd.read_csv(csv_file)
        df_part['engine_id'] += engine_id_offset
        engine_id_offset += df_part['engine_id'].max()
        all_dfs.append(df_part)

    df = pd.concat(all_dfs, ignore_index=True)
    print(f"   Loaded {len(df)} rows, {df['engine_id'].nunique()} engines")

    all_training_rows = []
    engine_ids = df['engine_id'].unique()

    for eng_id in engine_ids:
        engine_df = df[df['engine_id'] == eng_id].reset_index(drop=True)

        # Process per component
        for comp_id in COMPONENT_IDS:
            readings_history = []
            cumulative_fatigue = 0.0
            baseline = BASELINES[comp_id]

            for idx, row in engine_df.iterrows():
                # Map the row to get this component's values
                readings = map_cmapss_row(row.to_dict())
                comp_reading = next(r for r in readings if r['component_id'] == comp_id)

                temp = comp_reading['temperature']
                vib = comp_reading['vibration']
                rpm = comp_reading['rpm']
                fh = comp_reading['flight_hour']
                rul = int(row['RUL'])

                readings_history.append({
                    'component_id': comp_id,
                    'temperature': temp,
                    'vibration': vib,
                    'rpm': rpm,
                    'flight_hour': fh,
                })

                # Fatigue accumulation
                fatigue_delta = compute_fatigue_delta(temp, vib, rpm, baseline)
                cumulative_fatigue += fatigue_delta
                health_score = max(0, 100.0 - cumulative_fatigue)

                # Need at least 10 readings for features
                if len(readings_history) < 10:
                    continue

                fatigue_data = {
                    'cumulative_fatigue': cumulative_fatigue,
                    'health_score': health_score,
                }
                features = compute_features(readings_history, fatigue_data)
                if not features:
                    continue

                training_row = {
                    'engine_id': int(eng_id),
                    'component_id': comp_id,
                    'cycle': fh,
                    **features,
                    'RUL': rul,
                }
                all_training_rows.append(training_row)

        if eng_id % 20 == 0:
            print(f"   Processed engine {eng_id}/{len(engine_ids)}")

    # Save to CSV
    output_df = pd.DataFrame(all_training_rows)
    output_df.to_csv(OUTPUT_FILE, index=False)
    print(f"\n[OK] Training data saved: {OUTPUT_FILE}")
    print(f"   Total samples: {len(output_df)}")
    print(f"   Features: {FEATURE_NAMES}")
    print(f"   Target: RUL")

    return output_df


if __name__ == '__main__':
    preprocess()
