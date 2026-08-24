import sys
import os
import pytest

# Add parent dir to path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fatigue_engine import FatigueEngine
from component_mapper import map_cmapss_row
from alert_engine import AlertEngine
from ml_model import RULPredictor
from feature_engineer import compute_features


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

def test_alert_engine_thresholds():
    engine = AlertEngine()
    reading = {'component_id': 'turbine_blade', 'temperature': 100.0, 'vibration': 10.0}
    
    # Test RUL > 500
    alert1 = engine.evaluate(reading, 550.0)
    assert alert1['severity'] == 'GREEN'
    
    # Test RUL 100-500
    alert2 = engine.evaluate(reading, 300.0)
    assert alert2['severity'] == 'AMBER'
    
    # Test RUL 50-100
    alert3 = engine.evaluate(reading, 80.0)
    assert alert3['severity'] == 'RED'
    
    # Test RUL <= 50
    alert4 = engine.evaluate(reading, 30.0)
    assert alert4['severity'] == 'CRITICAL'

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
    assert predictor.using_fallback == True
    
    # High health = high RUL
    features1 = {'health_score': 100.0, 'cumulative_fatigue': 0.0, 'flight_hour_normalised': 0.1, 'vibration_slope_20': 0.0}
    res1 = predictor.predict(features1)
    assert res1['predicted_rul'] > 700.0
    
    # Low health = low RUL
    features2 = {'health_score': 20.0, 'cumulative_fatigue': 80.0, 'flight_hour_normalised': 0.9, 'vibration_slope_20': 0.5}
    res2 = predictor.predict(features2)
    assert res2['predicted_rul'] < 200.0

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
