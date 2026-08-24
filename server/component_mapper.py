"""
component_mapper.py — Maps C-MAPSS sensor columns to AeroTwin components.

Sensor Mapping (from C-MAPSS 21-sensor schema):
  turbine_blade: s3 (HPC outlet temp), s4 (LPT outlet temp), s20 (BPR)
  compressor:    s2 (T2, total temp fan inlet), s7 (T50, total temp LPT), 
                 s11 (physical fan speed), s17 (bleed enthalpy)
  bearing:       s8 (physical core speed), s9 (HPC outlet static pressure),
                 s13 (corrected fan speed), s14 (corrected core speed)

Each component gets aggregated temperature, vibration, and RPM values derived
from its assigned sensors.
"""

import numpy as np

# Sensor column indices (0-based) in the C-MAPSS CSV
# CSV columns: engine_id, cycle, op_setting_1-3, s1..s21, RUL
# s1 starts at index 5, so s_n is at index (5 + n - 1)
SENSOR_OFFSET = 5  # s1 is column index 5

COMPONENT_SENSOR_MAP = {
    'turbine_blade': {
        'sensors': ['s3', 's4', 's21'],
        'indices': [7, 8, 25],   # s3=idx7, s4=idx8, s21=idx25
        'sensitivity': 1.4,
        'baseline_temp': 1585.0,   # Typical C-MAPSS LPC outlet temp
        'baseline_vib': 23.4,     # Typical s21 value (BPR proxy)
        'baseline_rpm': 1400.0,   # Typical s4 value range
    },
    'compressor': {
        'sensors': ['s2', 's7', 's11', 's17'],
        'indices': [6, 11, 15, 21],  # s2=idx6, s7=idx11, s11=idx15, s17=idx21
        'sensitivity': 0.9,
        'baseline_temp': 642.0,   # Typical T2 value
        'baseline_vib': 47.3,     # Typical s11 value (fan speed)
        'baseline_rpm': 392.0,    # Typical s17 value (bleed enthalpy)
    },
    'bearing': {
        'sensors': ['s8', 's9', 's13', 's14'],
        'indices': [12, 13, 17, 18],  # s8=idx12, s9=idx13, s13=idx17, s14=idx18
        'sensitivity': 1.1,
        'baseline_temp': 2388.0,  # Typical s8 value (Ps30)
        'baseline_vib': 2388.0,   # Typical s13 value (corrected fan speed)
        'baseline_rpm': 8130.0,   # Typical s14 value
    }
}

# Display names for the UI
COMPONENT_DISPLAY_NAMES = {
    'turbine_blade': 'Turbine Blade',
    'compressor': 'Compressor',
    'bearing': 'Bearing'
}

COMPONENT_IDS = list(COMPONENT_SENSOR_MAP.keys())


def map_cmapss_row(row_dict):
    """
    Map a single C-MAPSS CSV row to 3 AeroTwin component readings.

    Args:
        row_dict (dict): A row from the C-MAPSS CSV with keys like
                         'engine_id', 'cycle', 's1'..'s21', 'RUL'.

    Returns:
        list[dict]: Three dicts, one per component, each with:
            {component_id, flight_hour, temperature, vibration, rpm,
             cmapss_engine_id, cmapss_cycle}
    """
    readings = []

    engine_id = int(row_dict.get('engine_id', 1))
    cycle = int(row_dict.get('cycle', 1))

    for comp_id, config in COMPONENT_SENSOR_MAP.items():
        sensors = config['sensors']
        sensor_values = []
        for s in sensors:
            val = float(row_dict.get(s, 0))
            sensor_values.append(val)

        # Derive temperature, vibration, RPM from the sensor group
        if comp_id == 'turbine_blade':
            # s3 (HPC outlet temp ~1585) = temperature
            # s21 (BPR ~23.4) used as vibration proxy (shifts with degradation)
            # s4 (LPT outlet temp ~1400) used for RPM proxy
            temperature = sensor_values[0]  # s3
            vibration = sensor_values[2]    # s21 (BPR proxy — decreases with wear)
            rpm = sensor_values[1]          # s4 (LPT temp as dynamic indicator)

        elif comp_id == 'compressor':
            # s2 (T2 fan inlet ~642) = temperature
            # s11 (physical fan speed ~47.3) = vibration proxy
            # s17 (bleed enthalpy ~8135) = RPM
            temperature = sensor_values[0]  # s2
            vibration = sensor_values[2]    # s11
            rpm = sensor_values[3]          # s17

        elif comp_id == 'bearing':
            # s8 (Ps30 ~2388) = temperature proxy (pressure-temp correlation)
            # s9 (total temp S50 ~9050) = RPM proxy
            # s13 (corrected fan speed ~2388) = vibration proxy
            # s14 (corrected core speed ~8130) = RPM
            temperature = sensor_values[0]  # s8
            vibration = sensor_values[2]    # s13
            rpm = sensor_values[3]          # s14

        # Scale cycle → realistic flight hours (1 cycle ≈ 50 flight hours)
        # C-MAPSS max ~300 cycles → ~15,000 flight hours, matching commercial engine overhaul life
        flight_hour = cycle * 50

        readings.append({
            'component_id': comp_id,
            'flight_hour': flight_hour,
            'temperature': round(temperature, 3),
            'vibration': round(vibration, 4),
            'rpm': round(rpm, 2),
            'cmapss_engine_id': engine_id,
            'cmapss_cycle': cycle,
        })

    return readings


def map_cmapss_row_from_list(row_values):
    """
    Map a C-MAPSS row given as a list of values (matching CSV column order).

    Args:
        row_values (list): [engine_id, cycle, op1, op2, op3, s1..s21, RUL]

    Returns:
        list[dict]: Three component readings.
    """
    # Build a dict from the list
    columns = ['engine_id', 'cycle', 'op_setting_1', 'op_setting_2', 'op_setting_3']
    columns += [f's{i}' for i in range(1, 22)]
    columns.append('RUL')

    row_dict = {}
    for i, col in enumerate(columns):
        if i < len(row_values):
            row_dict[col] = row_values[i]

    return map_cmapss_row(row_dict)


def get_component_baselines():
    """Return baseline values for all components (used by fatigue engine)."""
    baselines = {}
    for comp_id, config in COMPONENT_SENSOR_MAP.items():
        baselines[comp_id] = {
            'baseline_temp': config['baseline_temp'],
            'baseline_vib': config['baseline_vib'],
            'baseline_rpm': config['baseline_rpm'],
            'sensitivity': config['sensitivity'],
        }
    return baselines
