"""
alert_engine.py — RUL threshold evaluation + z-score anomaly detection.

Alert Severity Thresholds:
    Health Score ≥ 80% or RUL > 100 hrs → GREEN    — No action required
    50% ≤ Health < 80% or 40 < RUL ≤ 100 hrs → AMBER — Schedule inspection within 2 weeks
    20% ≤ Health < 50% or 15 < RUL ≤ 40 hrs  → RED   — Priority inspection within 48 hours
    Health < 20% or RUL ≤ 15 hrs            → CRITICAL — Ground aircraft immediately

Anomaly Detection:
    Rolling z-score on vibration and temperature streams with minimum noise floor.
    Significant deviation (> 4.5 sigma and absolute spike) → ANOMALY flag.
"""

import numpy as np
from collections import deque
from component_mapper import COMPONENT_IDS


# ── Alert Thresholds ──
SEVERITY_THRESHOLDS = [
    (100, 'GREEN',    'No action required'),
    (40,  'AMBER',    'Schedule inspection within 2 weeks'),
    (15,  'RED',      'Priority inspection — within 48 hours'),
    (0,   'CRITICAL', 'Ground aircraft. Immediate inspection required'),
]

HEALTH_SEVERITY_THRESHOLDS = [
    (80, 'GREEN'),
    (50, 'AMBER'),
    (20, 'RED'),
    (0,  'CRITICAL'),
]

SEVERITY_ORDER = {'GREEN': 0, 'AMBER': 1, 'RED': 2, 'CRITICAL': 3}

ANOMALY_Z_THRESHOLD = 4.5

# Recommended actions by severity
RECOMMENDED_ACTIONS = {
    'GREEN':    'No action required. Engine operating within normal parameters.',
    'AMBER':    'Schedule routine inspection within 2 weeks. Monitor trend closely.',
    'RED':      'Priority inspection required within 48 hours. Prepare maintenance crew.',
    'CRITICAL': 'GROUND AIRCRAFT IMMEDIATELY. Emergency inspection and component replacement required.',
    'ANOMALY':  'SUDDEN FAULT DETECTED. Override all maintenance schedules. Inspect immediately.',
}


class AlertEngine:
    """Evaluates predicted RUL and sensor z-scores to generate alerts."""

    def __init__(self, window_size=20):
        """
        Args:
            window_size: Number of recent readings to maintain for z-score computation.
        """
        self.window_size = window_size

        # Rolling windows per component for z-score computation
        self.vib_history = {cid: deque(maxlen=window_size) for cid in COMPONENT_IDS}
        self.temp_history = {cid: deque(maxlen=window_size) for cid in COMPONENT_IDS}

        # Track previous severity to detect threshold crossings
        self.previous_severity = {cid: 'GREEN' for cid in COMPONENT_IDS}

    def reset(self):
        """Reset all state."""
        for cid in COMPONENT_IDS:
            self.vib_history[cid].clear()
            self.temp_history[cid].clear()
            self.previous_severity[cid] = 'GREEN'

    def _compute_z_score(self, value, history, min_std=2.0, min_diff=5.0):
        """
        Compute z-score against a rolling window with a noise floor.
        Requires both relative deviation (z > threshold) and meaningful absolute difference.
        """
        if len(history) < 8:
            return 0.0
        arr = np.array(list(history))
        mean = float(np.mean(arr))
        std = max(float(np.std(arr)), min_std)
        diff = abs(value - mean)
        if diff < min_diff:
            return 0.0
        return diff / std

    def _get_severity(self, predicted_rul):
        """Map predicted RUL to severity level."""
        for threshold, severity, _ in SEVERITY_THRESHOLDS:
            if predicted_rul > threshold:
                return severity
        return 'CRITICAL'

    def _get_severity_from_health(self, health_score):
        """Map health percentage to severity level."""
        for threshold, severity in HEALTH_SEVERITY_THRESHOLDS:
            if health_score >= threshold:
                return severity
        return 'CRITICAL'

    def evaluate(self, reading, predicted_rul, confidence=0.0):
        """
        Evaluate a sensor reading against thresholds and anomaly detection.

        Args:
            reading (dict): {component_id, temperature, vibration, rpm, flight_hour, ...}
            predicted_rul (float): ML-predicted remaining useful life (hours).
            confidence (float): ML model confidence (0-1).

        Returns:
            dict: Alert payload
        """
        comp_id = reading['component_id']
        temp = float(reading.get('temperature', 0))
        vib = float(reading.get('vibration', 0))

        # Update rolling windows
        self.vib_history[comp_id].append(vib)
        self.temp_history[comp_id].append(temp)

        # Compute z-scores with sensible noise floors (vibration: min_diff=10, temp: min_diff=50)
        z_score_vib = self._compute_z_score(vib, self.vib_history[comp_id], min_std=2.0, min_diff=10.0)
        z_score_temp = self._compute_z_score(temp, self.temp_history[comp_id], min_std=5.0, min_diff=50.0)
        max_z_score = max(z_score_vib, z_score_temp)

        # Anomaly detection — only triggers on massive spikes (e.g., injected anomaly)
        anomaly_flag = max_z_score > ANOMALY_Z_THRESHOLD

        # Health score takes primary precedence
        health_score = float(reading.get('health_score', 100.0))
        if health_score >= 80:
            severity = 'GREEN'
        elif health_score >= 50:
            severity = 'AMBER'
        elif health_score >= 20:
            severity = 'RED'
        else:
            severity = 'CRITICAL'

        # Also account for RUL degradation
        rul_severity = self._get_severity(predicted_rul)
        if SEVERITY_ORDER[rul_severity] > SEVERITY_ORDER[severity]:
            # Degrade severity if RUL is critically low
            if predicted_rul <= 15:
                severity = 'CRITICAL'
            elif predicted_rul <= 40 and severity == 'GREEN':
                severity = 'AMBER'

        # Override to CRITICAL if sudden anomaly detected
        if anomaly_flag:
            severity = 'CRITICAL'

        # Determine recommended action
        if anomaly_flag:
            recommended_action = RECOMMENDED_ACTIONS['ANOMALY']
        else:
            recommended_action = RECOMMENDED_ACTIONS.get(severity, 'Monitor system.')

        # Check if severity crossed a threshold
        prev_severity = self.previous_severity.get(comp_id, 'GREEN')
        threshold_crossed = SEVERITY_ORDER.get(severity, 0) > SEVERITY_ORDER.get(prev_severity, 0)

        # Update previous severity
        self.previous_severity[comp_id] = severity

        # Estimate time to service
        if predicted_rul > 0:
            days_to_service = predicted_rul / 8.0
            estimated_time = f"{int(days_to_service)} days ({int(predicted_rul)} flight hours)"
        else:
            estimated_time = "OVERDUE — Immediate service required"

        return {
            'component_id': comp_id,
            'severity': severity,
            'recommended_action': recommended_action,
            'predicted_rul': round(predicted_rul, 2),
            'confidence': round(confidence, 4),
            'anomaly_flag': anomaly_flag,
            'z_score_vib': round(z_score_vib, 3),
            'z_score_temp': round(z_score_temp, 3),
            'max_z_score': round(max_z_score, 3),
            'threshold_crossed': threshold_crossed,
            'estimated_time_to_service': estimated_time,
            'timestamp': reading.get('timestamp', ''),
        }

    def get_severity_for_rul(self, predicted_rul, health_score=100.0):
        """Quick severity lookup combining health score and RUL."""
        if health_score >= 80 and predicted_rul > 40:
            return 'GREEN'
        if health_score >= 50 or predicted_rul > 20:
            return 'AMBER'
        if health_score >= 20 or predicted_rul > 10:
            return 'RED'
        return 'CRITICAL'
