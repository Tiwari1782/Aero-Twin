import sys
import os
import pytest

# Add parent dir to path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fatigue_engine import FatigueEngine
from component_mapper import map_cmapss_row, map_cmapss_row_from_list, COMPONENT_SENSOR_MAP
from alert_engine import AlertEngine
from ml_model import RULPredictor
from feature_engineer import compute_features, BASELINE_RPM


def test_component_mapper():
    # Test valid row mapping
    row = {
        'engine_id': 1, 'cycle': 1, 'setting1': 0.0, 'setting2': 0.0, 'setting3': 100.0,
        's1': 518.67, 's2': 642.0, 's3': 1585.0, 's4': 1400.0, 's5': 14.62,
        's6': 21.61, 's7': 554.0, 's8': 2388.0, 's9': 9050.0, 's10': 1.3,
        's11': 47.3, 's12': 521.0, 's13': 2388.0, 's14': 8130.0, 's15': 8.4,
        's16': 0.03, 's17': 392.0, 's18': 2388.0, 's19': 100.0, 's20': 23.4, 's21': 14.0
    }
    mapped = map_cmapss_row(row)
    assert len(mapped) == 3
    
    # Verify turbine_blade mappings (s3, s21, s4)
    tb = next(m for m in mapped if m['component_id'] == 'turbine_blade')
    assert tb['temperature'] == 1585.0
    assert tb['vibration'] == 14.0
    assert tb['rpm'] == 1400.0

    # Verify compressor mappings (s2, s11, s17)
    comp = next(m for m in mapped if m['component_id'] == 'compressor')
    assert comp['temperature'] == 642.0
    assert comp['vibration'] == 47.3
    assert comp['rpm'] == 392.0


def test_map_cmapss_row_from_list():
    row_values = [
        1, 1, 0.0, 0.0, 100.0,
        518.67, 642.0, 1585.0, 1400.0, 14.62,
        21.61, 554.0, 2388.0, 9050.0, 1.3,
        47.3, 521.0, 2388.0, 8130.0, 8.4,
        0.03, 392.0, 2388.0, 100.0, 23.4, 14.0,
        150
    ]
    mapped = map_cmapss_row_from_list(row_values)
    assert len(mapped) == 3
    assert mapped[0]['cmapss_engine_id'] == 1
    assert mapped[0]['cmapss_cycle'] == 1


def test_baseline_consistency():
    # Verify compressor baseline is 392.0 across mapper and feature engineer
    assert COMPONENT_SENSOR_MAP['compressor']['baseline_rpm'] == 392.0
    assert BASELINE_RPM['compressor'] == 392.0
    assert BASELINE_RPM['turbine_blade'] == 1400.0
    assert BASELINE_RPM['bearing'] == 8130.0


def test_alert_engine_thresholds():
    engine = AlertEngine()
    
    # 1. Health >= 80, RUL > 40 -> GREEN
    reading_green = {'component_id': 'turbine_blade', 'temperature': 1585.0, 'vibration': 23.4, 'health_score': 95.0}
    alert1 = engine.evaluate(reading_green, 550.0)
    assert alert1['severity'] == 'GREEN'
    
    # 2. Health 50-80 -> AMBER
    reading_amber = {'component_id': 'turbine_blade', 'temperature': 1650.0, 'vibration': 25.0, 'health_score': 65.0}
    alert2 = engine.evaluate(reading_amber, 300.0)
    assert alert2['severity'] == 'AMBER'
    
    # 3. Health 20-50 -> RED
    reading_red = {'component_id': 'turbine_blade', 'temperature': 1750.0, 'vibration': 35.0, 'health_score': 35.0}
    alert3 = engine.evaluate(reading_red, 80.0)
    assert alert3['severity'] == 'RED'
    
    # 4. Health < 20 -> CRITICAL
    reading_crit = {'component_id': 'turbine_blade', 'temperature': 1900.0, 'vibration': 50.0, 'health_score': 15.0}
    alert4 = engine.evaluate(reading_crit, 30.0)
    assert alert4['severity'] == 'CRITICAL'

    # 5. High health but critically low RUL (<= 15) degrades to CRITICAL
    reading_low_rul = {'component_id': 'turbine_blade', 'temperature': 1585.0, 'vibration': 23.4, 'health_score': 90.0}
    alert5 = engine.evaluate(reading_low_rul, 10.0)
    assert alert5['severity'] == 'CRITICAL'


def test_alert_engine_anomaly():
    engine = AlertEngine()
    # Fill history with baseline values
    for _ in range(15):
        engine.evaluate({'component_id': 'turbine_blade', 'temperature': 1585.0, 'vibration': 23.4}, 500.0)

    # Massive sudden vibration spike
    spike_reading = {'component_id': 'turbine_blade', 'temperature': 1585.0, 'vibration': 150.0, 'health_score': 95.0}
    alert = engine.evaluate(spike_reading, 500.0)
    assert alert['anomaly_flag'] is True
    assert alert['severity'] == 'CRITICAL'


def test_fatigue_engine():
    fe = FatigueEngine()
    
    # Baseline reading should yield very low fatigue
    fe.compute_fatigue({'component_id': 'turbine_blade', 'temperature': 1585.0, 'vibration': 23.4, 'rpm': 1400.0})
    score = fe.get_health_score('turbine_blade')
    assert score > 99.0
    
    # Severe anomaly should decrease health
    fe.compute_fatigue({'component_id': 'turbine_blade', 'temperature': 1800.0, 'vibration': 40.0, 'rpm': 1500.0})
    score2 = fe.get_health_score('turbine_blade')
    assert score2 < 100.0


def test_ml_model_heuristic():
    predictor = RULPredictor(model_path='invalid_path.pkl')
    assert predictor.using_fallback is True
    
    # High health = high RUL
    features1 = {'health_score': 100.0, 'cumulative_fatigue': 0.0, 'flight_hour_normalised': 0.1, 'vibration_slope_20': 0.0}
    res1 = predictor.predict(features1)
    assert res1['predicted_rul'] > 5000.0
    assert res1['model_type'] == 'heuristic'
    
    # Low health = low RUL
    features2 = {'health_score': 20.0, 'cumulative_fatigue': 80.0, 'flight_hour_normalised': 0.9, 'vibration_slope_20': 0.5}
    res2 = predictor.predict(features2)
    assert res2['predicted_rul'] < res1['predicted_rul']
    assert res2['predicted_rul'] < 2000.0


def test_feature_engineer():
    readings = []
    # Process 10 identical baseline readings
    for i in range(1, 11):
        readings.append({
            'component_id': 'turbine_blade',
            'temperature': 1585.0,
            'vibration': 23.4,
            'rpm': 1400.0,
            'flight_hour': i
        })
        
    fatigue = {'cumulative_fatigue': 0.0, 'health_score': 100.0}
    features = compute_features(readings, fatigue)
    
    # We should have features now (buffer >= 10)
    assert features is not None
    assert features['rolling_mean_temp_10'] == 1585.0
    assert features['rolling_mean_vibration_10'] == 23.4
    assert features['health_score'] == 100.0
    assert features['cumulative_fatigue'] == 0.0


def test_feature_engineer_insufficient_data():
    readings = [
        {'component_id': 'turbine_blade', 'temperature': 1585.0, 'vibration': 23.4, 'rpm': 1400.0, 'flight_hour': 1}
    ]
    fatigue = {'cumulative_fatigue': 0.0, 'health_score': 100.0}
    assert compute_features(readings, fatigue) is None
    assert compute_features([], fatigue) is None
