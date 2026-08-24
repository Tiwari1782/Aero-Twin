"""
fatigue_engine.py — Multi-factor fatigue accumulation algorithm.

Computes per-component fatigue using the physics-informed formula:

    fatigue_delta = (T_factor^1.4 × V_factor^1.8 × RPM_factor^1.2) × sensitivity

Where:
    T_factor   = current_temperature / baseline_temperature
    V_factor   = current_vibration / baseline_vibration
    RPM_factor = current_rpm / rated_rpm

    Component sensitivities:
        Turbine Blade = 1.4  (highest thermal stress)
        Bearing       = 1.1  (vibration-dominant wear)
        Compressor    = 0.9  (pressure-cycle fatigue)

    health_score = max(0, 100 − cumulative_fatigue)
"""

from component_mapper import get_component_baselines, COMPONENT_IDS


class FatigueEngine:
    """Maintains running cumulative fatigue per component."""

    def __init__(self):
        self.baselines = get_component_baselines()
        self.cumulative_fatigue = {cid: 0.0 for cid in COMPONENT_IDS}
        self.health_scores = {cid: 100.0 for cid in COMPONENT_IDS}

    def reset(self):
        """Reset all fatigue and health to baseline."""
        self.cumulative_fatigue = {cid: 0.0 for cid in COMPONENT_IDS}
        self.health_scores = {cid: 100.0 for cid in COMPONENT_IDS}

    def compute_fatigue(self, reading):
        """
        Compute fatigue delta for a single sensor reading and update
        cumulative state.

        Args:
            reading (dict): {component_id, temperature, vibration, rpm, ...}

        Returns:
            dict: {
                component_id, fatigue_delta, cumulative_fatigue,
                health_score, t_factor, v_factor, rpm_factor
            }
        """
        comp_id = reading['component_id']
        baseline = self.baselines[comp_id]

        temp = float(reading['temperature'])
        vib = float(reading['vibration'])
        rpm = float(reading['rpm'])

        # Compute factor ratios (clamped to avoid division by zero)
        t_factor = max(temp / max(baseline['baseline_temp'], 1.0), 0.01)
        v_factor = max(vib / max(baseline['baseline_vib'], 0.01), 0.01)
        rpm_factor = max(rpm / max(baseline['baseline_rpm'], 1.0), 0.01)

        sensitivity = baseline['sensitivity']

        # Fatigue delta formula
        fatigue_delta = (
            (t_factor ** 1.4)
            * (v_factor ** 1.8)
            * (rpm_factor ** 1.2)
            * sensitivity
        )

        # Scale fatigue delta to reasonable range (0.01 - 5.0 per tick)
        # The raw formula produces values near 1.0 at baseline, so we
        # subtract the baseline fatigue and scale
        baseline_fatigue = sensitivity  # ~1.0 at baseline conditions
        fatigue_delta = max(0, (fatigue_delta - baseline_fatigue * 0.8)) * 0.5

        # Update cumulative
        self.cumulative_fatigue[comp_id] += fatigue_delta
        self.health_scores[comp_id] = max(0.0, 100.0 - self.cumulative_fatigue[comp_id])

        return {
            'component_id': comp_id,
            'fatigue_delta': round(fatigue_delta, 4),
            'cumulative_fatigue': round(self.cumulative_fatigue[comp_id], 3),
            'health_score': round(self.health_scores[comp_id], 3),
            't_factor': round(t_factor, 4),
            'v_factor': round(v_factor, 4),
            'rpm_factor': round(rpm_factor, 4),
        }

    def process_tick(self, readings):
        """
        Process a full tick (3 readings, one per component).

        Args:
            readings (list[dict]): Three sensor readings.

        Returns:
            list[dict]: Three fatigue results.
        """
        results = []
        for reading in readings:
            result = self.compute_fatigue(reading)
            results.append(result)
        return results

    def get_health_score(self, component_id):
        """Get current health score for a component."""
        return self.health_scores.get(component_id, 100.0)

    def get_cumulative_fatigue(self, component_id):
        """Get cumulative fatigue for a component."""
        return self.cumulative_fatigue.get(component_id, 0.0)

    def get_all_health(self):
        """Get health scores for all components."""
        return dict(self.health_scores)

    def get_all_fatigue(self):
        """Get cumulative fatigue for all components."""
        return dict(self.cumulative_fatigue)
