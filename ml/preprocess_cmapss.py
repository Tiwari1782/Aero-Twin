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
from feature_engineer import FEATURE_NAMES

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
    'compressor':    {'temp': 642.0, 'vib': 47.3, 'rpm': 8135.0, 'sensitivity': 0.9},
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
        max_cycle = len(engine_df)

        # Process per component
        for comp_id in COMPONENT_IDS:
            temps = []
            vibs = []
            rpms = []
            flight_hours = []
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

                temps.append(temp)
                vibs.append(vib)
                rpms.append(rpm)
                flight_hours.append(fh)

                # Fatigue accumulation
                fatigue_delta = compute_fatigue_delta(temp, vib, rpm, baseline)
                cumulative_fatigue += fatigue_delta
                health_score = max(0, 100.0 - cumulative_fatigue)

                # Need at least 10 readings for features
                if len(temps) < 10:
                    continue

                # Compute features from last 10 readings
                last_10_temps = np.array(temps[-10:])
                last_10_vibs = np.array(vibs[-10:])
                last_10_rpms = np.array(rpms[-10:])
                last_20_vibs = np.array(vibs[-20:])

                # F1-F2: Rolling vibration stats
                rolling_mean_vib = float(np.mean(last_10_vibs))
                rolling_std_vib = float(np.std(last_10_vibs))

                # F3: Vibration slope
                if len(last_20_vibs) > 1:
                    x = np.arange(len(last_20_vibs))
                    coeffs = np.polyfit(x, last_20_vibs, 1)
                    vib_slope = float(coeffs[0])
                else:
                    vib_slope = 0.0

                # F4-F6: Rolling temp stats
                rolling_mean_temp = float(np.mean(last_10_temps))
                rolling_std_temp = float(np.std(last_10_temps))

                # F5: Temp rise rate
                fh_arr = np.array(flight_hours[-10:])
                if (fh_arr[-1] - fh_arr[0]) > 0:
                    temp_rise_rate = (last_10_temps[-1] - last_10_temps[0]) / (fh_arr[-1] - fh_arr[0])
                else:
                    temp_rise_rate = 0.0

                # F7: RPM drift
                baseline_rpm = baseline['rpm']
                rpm_drift = (rpms[-1] - baseline_rpm) / baseline_rpm

                # F8: Vib-temp correlation
                if rolling_std_vib > 0 and rolling_std_temp > 0:
                    corr = np.corrcoef(last_10_vibs, last_10_temps)
                    vib_temp_corr = float(corr[0, 1])
                    if np.isnan(vib_temp_corr):
                        vib_temp_corr = 0.0
                else:
                    vib_temp_corr = 0.0

                # F11: Flight hour normalised
                fh_norm = min(fh / 1000.0, 1.0)

                # F12: Max z-score
                z_scores = []
                if rolling_std_vib > 0:
                    z_scores.extend(np.abs((last_10_vibs - rolling_mean_vib) / rolling_std_vib).tolist())
                if rolling_std_temp > 0:
                    z_scores.extend(np.abs((last_10_temps - rolling_mean_temp) / rolling_std_temp).tolist())
                max_z = max(z_scores) if z_scores else 0.0

                training_row = {
                    'engine_id': int(eng_id),
                    'component_id': comp_id,
                    'cycle': fh,
                    'rolling_mean_vibration_10': round(rolling_mean_vib, 6),
                    'rolling_std_vibration_10': round(rolling_std_vib, 6),
                    'vibration_slope_20': round(vib_slope, 6),
                    'rolling_mean_temp_10': round(rolling_mean_temp, 6),
                    'temp_rise_rate': round(float(temp_rise_rate), 6),
                    'rolling_std_temp_10': round(rolling_std_temp, 6),
                    'rpm_drift': round(rpm_drift, 6),
                    'vib_temp_correlation': round(vib_temp_corr, 6),
                    'cumulative_fatigue': round(cumulative_fatigue, 4),
                    'health_score': round(health_score, 4),
                    'flight_hour_normalised': round(fh_norm, 6),
                    'max_z_score_10': round(max_z, 4),
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
