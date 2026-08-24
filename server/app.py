"""
app.py — Flask entry point for AeroTwin server.

Wires all modules together:
  - Initializes Flask + Flask-SocketIO
  - Connects to PostgreSQL and creates tables
  - Loads the ML model
  - Starts background simulation/CSV thread
  - Configures CORS for frontend (localhost:5173)
  - Registers REST API routes and Socket.IO events
"""

import os
import sys
import uuid
import time
import warnings
import logging
import threading
from datetime import datetime, timezone

# Suppress joblib verbose output before any sklearn/joblib imports
os.environ['JOBLIB_VERBOSITY'] = '0'
logging.getLogger('joblib').setLevel(logging.ERROR)

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_root, '.env'))

# Add server directory to path for imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# pyrefly: ignore [missing-import]
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from db import init_db, close_pool
from simulator import Simulator
from csv_reader import CSVReader
from fatigue_engine import FatigueEngine
from feature_engineer import compute_features
from ml_model import RULPredictor
from alert_engine import AlertEngine
from db_writer import (
    insert_sensor_readings_batch,
    insert_health_snapshot,
    insert_maintenance_log,
)
from routes import api, init_routes
from socketio_server import (
    register_socketio_events,
    emit_sensor_update,
    emit_health_update,
    emit_alert_update,
)
from component_mapper import COMPONENT_IDS

# ── Configuration ──
SIMULATION_SPEED = float(os.getenv('SIMULATION_SPEED_SECONDS', '7'))
DEFAULT_MODE = os.getenv('DEFAULT_MODE', 'live')
FLASK_ENV = os.getenv('FLASK_ENV', 'development')
FLASK_SECRET = os.getenv('FLASK_SECRET_KEY', 'aerotwin-dev-secret')
_csv_env = os.getenv('CMAPSS_CSV_PATH', 'Data/train_FD001.csv')
CMAPSS_CSV_PATH = _csv_env if (_csv_env and os.path.isabs(_csv_env)) else os.path.join(project_root, _csv_env or 'Data/train_FD001.csv')
_model_env = os.getenv('MODEL_PATH', '')
MODEL_PATH = _model_env if (_model_env and os.path.isabs(_model_env)) else (os.path.join(project_root, _model_env) if _model_env else os.path.join(project_root, 'ml', 'aerotwin_model.pkl'))

# ── Flask App ──
app = Flask(__name__)
app.config['SECRET_KEY'] = FLASK_SECRET
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB max upload

CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
]}}, supports_credentials=True)

socketio = SocketIO(
    app,
    cors_allowed_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
    async_mode='threading',
    logger=False,
    engineio_logger=False,
)

# ── Initialize Engines ──
simulator = Simulator()
csv_reader = CSVReader(csv_path=CMAPSS_CSV_PATH)
fatigue_engine = FatigueEngine()
ml_predictor = RULPredictor(model_path=MODEL_PATH)
alert_engine = AlertEngine()

# ── Shared Engine State ──
engine_state = {
    'session_id': uuid.uuid4(),
    'mode': DEFAULT_MODE,
    'flight_hour': 0,
    'simulator': simulator,
    'csv_reader': csv_reader,
    'fatigue_engine': fatigue_engine,
    'ml_predictor': ml_predictor,
    'alert_engine': alert_engine,
    'latest_readings': {},
    'latest_rul': {},
    'readings_buffer': {cid: [] for cid in COMPONENT_IDS},
    'running': True,
    '_socketio': socketio,  # Reference for routes to emit events
}

# ── Register Routes and Socket.IO Events ──
init_routes(engine_state)
app.register_blueprint(api)
register_socketio_events(socketio, engine_state)

# Max buffer size for feature computation
BUFFER_SIZE = 30


def processing_tick():
    """
    One complete processing cycle:
    1. Generate/read sensor readings
    2. Compute fatigue
    3. Engineer features
    4. Run ML prediction
    5. Evaluate alerts
    6. Write to DB
    7. Emit Socket.IO events
    """
    mode = engine_state['mode']

    # Step 1: Get sensor readings
    if mode == 'live':
        readings = simulator.generate_tick()
        engine_state['flight_hour'] = simulator.flight_hour
    else:  # csv mode
        readings = csv_reader.read_next()
        if readings is None:
            csv_reader.reset()
            readings = csv_reader.read_next()
        if readings:
            engine_state['flight_hour'] = readings[0].get('flight_hour', 0)

    if not readings:
        return

    # Add mode and session info to readings
    session_id = str(engine_state['session_id'])
    for reading in readings:
        reading['session_id'] = session_id
        reading['mode'] = mode

    # Step 2: Write raw readings to DB
    try:
        insert_sensor_readings_batch(readings)
    except Exception as e:
        print(f"[WARN] DB write error (sensor): {e}")

    # Step 3: Compute fatigue per component
    fatigue_results = fatigue_engine.process_tick(readings)

    # Update readings buffer for feature computation
    for reading in readings:
        comp_id = reading['component_id']
        buffer = engine_state['readings_buffer'][comp_id]
        buffer.append(reading)
        if len(buffer) > BUFFER_SIZE:
            buffer.pop(0)
        engine_state['latest_readings'][comp_id] = reading

    # Step 4-6: Feature engineering, ML prediction, alert evaluation per component
    health_updates = []
    alert_updates = []

    for i, reading in enumerate(readings):
        comp_id = reading['component_id']
        fatigue_data = fatigue_results[i]

        # Step 4: Compute features
        buffer = engine_state['readings_buffer'][comp_id]
        features = compute_features(buffer, {
            'cumulative_fatigue': fatigue_data['cumulative_fatigue'],
            'health_score': fatigue_data['health_score'],
        })

        # Step 5: ML prediction
        rul_result = ml_predictor.predict(features)
        predicted_rul = rul_result['predicted_rul']
        confidence = rul_result['confidence']

        engine_state['latest_rul'][comp_id] = rul_result

        # Step 6: Alert evaluation
        # Inject health_score so alert engine can use both RUL + health thresholds
        reading['health_score'] = fatigue_data['health_score']
        alert = alert_engine.evaluate(reading, predicted_rul, confidence)
        severity = alert['severity']

        # Build health update payload
        health_update = {
            'component_id': comp_id,
            'health_score': fatigue_data['health_score'],
            'fatigue_score': fatigue_data['cumulative_fatigue'],
            'predicted_rul': predicted_rul,
            'confidence': confidence,
            'severity': severity,
            'flight_hour': reading.get('flight_hour', 0),
            'timestamp': reading.get('timestamp', ''),
            'feature_importance': rul_result.get('feature_importance', {}),
        }
        health_updates.append(health_update)

        # Write health snapshot to DB
        try:
            insert_health_snapshot({
                'session_id': session_id,
                'component_id': comp_id,
                'flight_hour': reading.get('flight_hour', 0),
                'fatigue_score': fatigue_data['cumulative_fatigue'],
                'health_score': fatigue_data['health_score'],
                'predicted_rul': predicted_rul,
                'confidence': confidence,
                'severity': severity,
            })
        except Exception as e:
            print(f"[WARN] DB write error (health): {e}")

        # Write alert to DB if threshold crossed or anomaly
        if alert.get('threshold_crossed') or alert.get('anomaly_flag'):
            alert_updates.append(alert)
            try:
                insert_maintenance_log({
                    'session_id': session_id,
                    'component_id': comp_id,
                    'severity': severity,
                    'recommended_action': alert['recommended_action'],
                    'predicted_rul_at_alert': predicted_rul,
                    'anomaly_flag': alert.get('anomaly_flag', False),
                    'z_score_at_alert': alert.get('max_z_score', 0),
                    'mode': mode,
                })
            except Exception as e:
                print(f"[WARN] DB write error (alert): {e}")

    # Step 7: Emit Socket.IO events
    emit_sensor_update(socketio, readings)
    emit_health_update(socketio, health_updates)
    if alert_updates:
        emit_alert_update(socketio, alert_updates)


def background_loop():
    """
    Background thread that runs the processing tick loop.
    Generates/reads data every SIMULATION_SPEED seconds.
    """
    print(f"Background loop started (mode={engine_state['mode']}, interval={SIMULATION_SPEED}s)")

    while engine_state.get('running', True):
        try:
            processing_tick()
        except Exception as e:
            print(f"[ERROR] Processing tick error: {e}")
            import traceback
            traceback.print_exc()

        socketio.sleep(SIMULATION_SPEED)

    print("Background loop stopped")


# ── Startup ──
@app.before_request
def _ensure_db():
    """Lazy DB init on first request (safety net)."""
    pass


def start_app():
    """Initialize and start the AeroTwin server."""
    print("\n" + "="*60)
    print("  AeroTwin — Digital Twin Engine Health Monitor")
    print("="*60)

    # Initialize database
    try:
        init_db()
    except Exception as e:
        print(f"[ERROR] Failed to connect to PostgreSQL: {e}")
        print("   Make sure PostgreSQL is running and aerotwin_db exists.")
        print("   You can start PostgreSQL with: docker-compose up -d postgres")
        return

    # Print status
    print(f"[OK] Mode: {engine_state['mode'].upper()}")
    print(f"[OK] ML Model: {'Loaded' if ml_predictor.is_model_loaded() else 'Heuristic fallback'}")
    print(f"[OK] CSV Dataset: {'Loaded' if csv_reader.loaded else 'Not found'} ({csv_reader.total_rows} rows)")
    print(f"[OK] Simulation interval: {SIMULATION_SPEED}s")
    print(f"[OK] Session ID: {engine_state['session_id']}")
    print(f"\nAeroTwin server starting on http://localhost:5000")
    print(f"   Client expected at http://localhost:5173")
    print("="*60 + "\n")

    # Start background processing loop
    socketio.start_background_task(background_loop)

    # Run the server
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )


if __name__ == '__main__':
    try:
        start_app()
    except KeyboardInterrupt:
        print("\nShutting down...")
        engine_state['running'] = False
        close_pool()
