"""
simulator.py — MODE B: Physics-informed synthetic sensor generator.

Generates synthetic sensor readings every tick (2 seconds) per component using
degradation formulas calibrated against NASA C-MAPSS parameters:

  Temperature: base_value + (flight_hour × degradation_rate) + noise
    - Turbine blade: ~0.8°C/flight-hour
    - Compressor: ~0.5°C/flight-hour
    - Bearing: ~0.3°C/flight-hour

  Vibration: Exponential increase after 100 flight hours.
  RPM: Linear drift at -0.02%/flight-hour.
"""

import random
import math
from datetime import datetime, timezone
from component_mapper import COMPONENT_SENSOR_MAP, COMPONENT_IDS


# ── Degradation Profiles ──
DEGRADATION_PROFILES = {
    'turbine_blade': {
        'base_temp': 1585.0,
        'temp_rate': 0.8,        # °C per flight hour
        'base_vib': 23.4,
        'vib_rate': 0.001,       # Base linear rate
        'vib_exp_threshold': 100,  # Exponential after this
        'vib_exp_factor': 0.015,
        'base_rpm': 1400.0,
        'rpm_drift_pct': -0.0002,  # -0.02% per hour
        'temp_noise': 5.0,
        'vib_noise': 0.15,
        'rpm_noise': 8.0,
    },
    'compressor': {
        'base_temp': 642.0,
        'temp_rate': 0.5,
        'base_vib': 47.3,
        'vib_rate': 0.002,
        'vib_exp_threshold': 100,
        'vib_exp_factor': 0.012,
        'base_rpm': 392.0,
        'rpm_drift_pct': -0.0002,
        'temp_noise': 1.5,
        'vib_noise': 0.3,
        'rpm_noise': 5.0,
    },
    'bearing': {
        'base_temp': 2388.0,
        'temp_rate': 0.3,
        'base_vib': 2388.0,
        'vib_rate': 0.003,
        'vib_exp_threshold': 80,
        'vib_exp_factor': 0.018,
        'base_rpm': 8130.0,
        'rpm_drift_pct': -0.0002,
        'temp_noise': 2.0,
        'vib_noise': 2.0,
        'rpm_noise': 5.0,
    }
}


class Simulator:
    """Physics-informed synthetic engine sensor generator."""

    def __init__(self):
        self.flight_hour = 0
        self.anomaly_active = {}     # {component_id: anomaly_type}
        self.anomaly_remaining = {}  # {component_id: ticks remaining}
        self._reset_state()

    def _reset_state(self):
        """Reset all state to baseline."""
        self.flight_hour = 0
        self.anomaly_active = {}
        self.anomaly_remaining = {}

    def reset(self):
        """Public reset — called on user 'reset' action."""
        self._reset_state()

    def advance_time(self, hours):
        """Fast-forward simulation by N flight hours."""
        self.flight_hour += hours

    def inject_anomaly(self, anomaly_type='vibration', component_id=None, duration_ticks=10):
        """
        Inject a fault into the simulation.

        Args:
            anomaly_type: 'vibration', 'thermal', or 'rpm'
            component_id: Target component (None = all components)
            duration_ticks: How many ticks the anomaly persists
        """
        targets = [component_id] if component_id else COMPONENT_IDS
        for cid in targets:
            self.anomaly_active[cid] = anomaly_type
            self.anomaly_remaining[cid] = duration_ticks

    def generate_reading(self, component_id):
        """
        Generate a single synthetic sensor reading for a component.

        Args:
            component_id (str): One of 'turbine_blade', 'compressor', 'bearing'

        Returns:
            dict: {component_id, flight_hour, temperature, vibration, rpm, timestamp}
        """
        profile = DEGRADATION_PROFILES[component_id]
        fh = self.flight_hour

        # ── Temperature ──
        temp = (
            profile['base_temp']
            + (fh * profile['temp_rate'])
            + random.gauss(0, profile['temp_noise'])
        )

        # ── Vibration ──
        linear_vib = profile['base_vib'] + (fh * profile['vib_rate'])
        if fh > profile['vib_exp_threshold']:
            excess = fh - profile['vib_exp_threshold']
            exp_component = profile['vib_exp_factor'] * (math.exp(excess * 0.01) - 1)
            vib = linear_vib + exp_component
        else:
            vib = linear_vib
        vib += random.gauss(0, profile['vib_noise'])

        # ── RPM ──
        rpm = (
            profile['base_rpm']
            * (1 + fh * profile['rpm_drift_pct'])
            + random.gauss(0, profile['rpm_noise'])
        )

        # ── Apply anomaly if active ──
        if component_id in self.anomaly_active:
            anomaly_type = self.anomaly_active[component_id]
            if anomaly_type == 'vibration':
                vib *= random.uniform(2.5, 4.0)  # Spike vibration
            elif anomaly_type == 'thermal':
                temp += random.uniform(50, 150)   # Temperature surge
            elif anomaly_type == 'rpm':
                rpm *= random.uniform(0.85, 0.92)  # RPM drop

            # Decrement anomaly timer
            self.anomaly_remaining[component_id] -= 1
            if self.anomaly_remaining[component_id] <= 0:
                del self.anomaly_active[component_id]
                del self.anomaly_remaining[component_id]

        return {
            'component_id': component_id,
            'flight_hour': fh,
            'temperature': round(temp, 3),
            'vibration': round(vib, 4),
            'rpm': round(rpm, 2),
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }

    def generate_tick(self):
        """
        Generate one complete tick — one reading per component.
        Advances the flight hour counter.

        Returns:
            list[dict]: Three readings (one per component).
        """
        readings = []
        for comp_id in COMPONENT_IDS:
            reading = self.generate_reading(comp_id)
            readings.append(reading)

        # Advance flight hour after generating all readings
        self.flight_hour += 1
        return readings

    @property
    def is_anomaly_active(self):
        """Check if any anomaly is currently active."""
        return len(self.anomaly_active) > 0
