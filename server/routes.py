"""
routes.py — REST API endpoint definitions.

Implements all 7 REST endpoints:
    GET  /api/health     — Current health/RUL/severity per component
    GET  /api/history    — Sensor reading history from PostgreSQL
    GET  /api/rul        — ML RUL predictions + confidence
    GET  /api/alerts     — Maintenance log (most recent first)
    POST /api/anomaly    — Inject fault into simulator (MODE B only)
    POST /api/reset      — Reset simulation to baseline
    POST /api/mode       — Switch data source mode (csv/live)
"""

from flask import Blueprint, jsonify, request  # pyrefly: ignore
from db_writer import fetch_sensor_history, fetch_alerts, fetch_latest_health
from datetime import datetime, timezone
import json
import os
import csv as csv_module
import uuid

api = Blueprint('api', __name__)

# These will be set by app.py after initialization
_engine_state = None


def init_routes(engine_state):
    """
    Initialize routes with reference to shared engine state.

    Args:
        engine_state (dict): Shared state dict containing:
            - fatigue_engine, alert_engine, ml_predictor
            - simulator, csv_reader
            - session_id, mode, readings_buffer
    """
    global _engine_state
    _engine_state = engine_state


@api.route('/api/health', methods=['GET'])
def get_health():
    """Current health_score, fatigue, RUL, severity per component."""
    if _engine_state is None:
        return jsonify({'error': 'Engine not initialized'}), 503

    fatigue_engine = _engine_state['fatigue_engine']
    alert_engine = _engine_state['alert_engine']
    ml_predictor = _engine_state['ml_predictor']

    components = {}
    for comp_id in ['turbine_blade', 'compressor', 'bearing']:
        health = fatigue_engine.get_health_score(comp_id)
        fatigue = fatigue_engine.get_cumulative_fatigue(comp_id)

        # Get latest RUL prediction
        rul_data = _engine_state.get('latest_rul', {}).get(comp_id, {})
        predicted_rul = rul_data.get('predicted_rul', 500.0)
        confidence = rul_data.get('confidence', 0.5)

        severity = alert_engine.get_severity_for_rul(predicted_rul, health_score=health)

        # Get latest sensor reading
        last_reading = _engine_state.get('latest_readings', {}).get(comp_id, {})

        components[comp_id] = {
            'health_score': round(health, 2),
            'fatigue_score': round(fatigue, 2),
            'predicted_rul': round(predicted_rul, 2),
            'confidence': round(confidence, 4),
            'severity': severity,
            'last_reading': {
                'temperature': last_reading.get('temperature', 0),
                'vibration': last_reading.get('vibration', 0),
                'rpm': last_reading.get('rpm', 0),
                'flight_hour': last_reading.get('flight_hour', 0),
            }
        }

    return jsonify({
        'components': components,
        'session_id': str(_engine_state.get('session_id', '')),
        'mode': _engine_state.get('mode', 'live'),
        'flight_hour': _engine_state.get('flight_hour', 0),
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


@api.route('/api/history', methods=['GET'])
def get_history():
    """Sensor reading history from PostgreSQL."""
    component = request.args.get('component', None)
    limit = request.args.get('limit', 200, type=int)
    limit = min(limit, 1000)  # Cap at 1000

    session_id = str(_engine_state.get('session_id', '')) if _engine_state else None

    rows = fetch_sensor_history(
        component_id=component,
        limit=limit,
        session_id=None  # Return all sessions
    )

    # Serialize datetime objects
    serialized = []
    for row in rows:
        item = {}
        for k, v in row.items():
            if isinstance(v, datetime):
                item[k] = v.isoformat()
            elif hasattr(v, '__float__'):
                item[k] = float(v)
            else:
                item[k] = str(v) if v is not None else None
            item[k] = v if not isinstance(v, datetime) else v.isoformat()
        # Clean serialization
        clean = {}
        for k, v in row.items():
            if isinstance(v, datetime):
                clean[k] = v.isoformat()
            elif hasattr(v, 'is_integer'):  # Decimal
                clean[k] = float(v)
            else:
                clean[k] = v
        serialized.append(clean)

    return jsonify({
        'readings': serialized,
        'count': len(serialized),
        'component': component,
    })


@api.route('/api/rul', methods=['GET'])
def get_rul():
    """ML model RUL prediction + confidence interval per component."""
    if _engine_state is None:
        return jsonify({'error': 'Engine not initialized'}), 503

    rul_data = _engine_state.get('latest_rul', {})

    predictions = {}
    for comp_id in ['turbine_blade', 'compressor', 'bearing']:
        pred = rul_data.get(comp_id, {})
        predictions[comp_id] = {
            'predicted_rul': pred.get('predicted_rul', 500.0),
            'confidence': pred.get('confidence', 0.5),
            'model_type': pred.get('model_type', 'unknown'),
        }

    return jsonify({
        'predictions': predictions,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


@api.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Maintenance log — most recent alerts first."""
    limit = request.args.get('limit', 50, type=int)
    component = request.args.get('component', None)
    limit = min(limit, 200)

    rows = fetch_alerts(limit=limit, component_id=component)

    serialized = []
    for row in rows:
        clean = {}
        for k, v in row.items():
            if isinstance(v, datetime):
                clean[k] = v.isoformat()
            elif hasattr(v, 'is_integer'):  # Decimal
                clean[k] = float(v)
            else:
                clean[k] = v
        serialized.append(clean)

    return jsonify({
        'alerts': serialized,
        'count': len(serialized),
    })


@api.route('/api/anomaly', methods=['POST'])
def inject_anomaly():
    """Inject fault into simulator (MODE B only)."""
    if _engine_state is None:
        return jsonify({'error': 'Engine not initialized'}), 503

    if _engine_state.get('mode') != 'live':
        return jsonify({
            'error': 'Anomaly injection only available in Live Simulation mode',
            'current_mode': _engine_state.get('mode')
        }), 400

    data = request.get_json(silent=True) or {}
    anomaly_type = data.get('type', 'vibration')
    component_id = data.get('component_id', None)

    valid_types = ['vibration', 'thermal', 'rpm']
    if anomaly_type not in valid_types:
        return jsonify({'error': f'Invalid anomaly type. Must be one of: {valid_types}'}), 400

    simulator = _engine_state.get('simulator')
    if simulator:
        simulator.inject_anomaly(anomaly_type=anomaly_type, component_id=component_id)

    return jsonify({
        'status': 'Anomaly injected',
        'type': anomaly_type,
        'component': component_id or 'all',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


@api.route('/api/reset', methods=['POST'])
def reset_simulation():
    """Reset simulation to baseline health=100%."""
    if _engine_state is None:
        return jsonify({'error': 'Engine not initialized'}), 503

    # Reset all engines
    _engine_state['fatigue_engine'].reset()
    _engine_state['alert_engine'].reset()

    simulator = _engine_state.get('simulator')
    if simulator:
        simulator.reset()

    csv_reader = _engine_state.get('csv_reader')
    if csv_reader:
        csv_reader.reset()

    # Reset state
    _engine_state['latest_rul'] = {}
    _engine_state['latest_readings'] = {}
    _engine_state['readings_buffer'] = {cid: [] for cid in ['turbine_blade', 'compressor', 'bearing']}
    _engine_state['flight_hour'] = 0

    return jsonify({
        'status': 'Simulation reset to baseline',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


@api.route('/api/mode', methods=['POST'])
def switch_mode():
    """Switch data source mode (csv/live)."""
    if _engine_state is None:
        return jsonify({'error': 'Engine not initialized'}), 503

    data = request.get_json(silent=True) or {}
    new_mode = data.get('mode', '').lower()

    if new_mode not in ('csv', 'live'):
        return jsonify({'error': 'Mode must be "csv" or "live"'}), 400

    old_mode = _engine_state.get('mode', 'live')
    _engine_state['mode'] = new_mode

    # Reset engines on mode switch
    _engine_state['fatigue_engine'].reset()
    _engine_state['alert_engine'].reset()
    _engine_state['latest_rul'] = {}
    _engine_state['latest_readings'] = {}
    _engine_state['readings_buffer'] = {cid: [] for cid in ['turbine_blade', 'compressor', 'bearing']}
    _engine_state['flight_hour'] = 0

    if new_mode == 'live' and _engine_state.get('simulator'):
        _engine_state['simulator'].reset()
    if new_mode == 'csv' and _engine_state.get('csv_reader'):
        _engine_state['csv_reader'].reset()

    return jsonify({
        'status': f'Mode switched from {old_mode} to {new_mode}',
        'mode': new_mode,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


# ── Required C-MAPSS columns ──
REQUIRED_COLUMNS = {'engine_id', 'cycle'}
REQUIRED_SENSORS = {f's{i}' for i in range(1, 22)}


@api.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    """Upload a CSV dataset to use for telemetry replay.

    Accepts multipart/form-data with a .csv file.
    Validates for C-MAPSS column schema, saves to Data/uploads/,
    hot-swaps the CSVReader, and auto-switches to CSV mode.
    """
    if _engine_state is None:
        return jsonify({'error': 'Engine not initialized'}), 503

    # Check file presence
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided. Use form field name "file".'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Validate extension
    if not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'Only .csv files are accepted'}), 400

    # Read and validate columns
    try:
        content = file.read().decode('utf-8')
        lines = content.strip().split('\n')
        if len(lines) < 2:
            return jsonify({'error': 'CSV file is empty or has no data rows'}), 400

        # Parse header
        reader = csv_module.reader([lines[0]])
        header = [col.strip() for col in next(reader)]
        header_set = set(header)

        # Check required columns
        missing_required = REQUIRED_COLUMNS - header_set
        if missing_required:
            return jsonify({
                'error': f'Missing required columns: {", ".join(sorted(missing_required))}',
                'hint': 'CSV must have at least: engine_id, cycle, s1..s21',
                'found_columns': header,
            }), 400

        # Check sensor columns
        missing_sensors = REQUIRED_SENSORS - header_set
        if len(missing_sensors) > 5:  # Allow a few missing sensors
            return jsonify({
                'error': f'Missing too many sensor columns ({len(missing_sensors)} of 21)',
                'missing': sorted(missing_sensors),
                'hint': 'CSV must have sensor columns s1 through s21',
                'found_columns': header,
            }), 400

        data_rows = len(lines) - 1  # Exclude header

    except UnicodeDecodeError:
        return jsonify({'error': 'File is not valid UTF-8 text'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

    # Save file
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(project_root, 'Data', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    safe_name = ''.join(c if c.isalnum() or c in '._-' else '_' for c in file.filename)
    saved_name = f'{timestamp}_{safe_name}'
    save_path = os.path.join(upload_dir, saved_name)

    with open(save_path, 'w', newline='', encoding='utf-8') as f:
        f.write(content)

    print(f'[OK] CSV uploaded: {saved_name} ({data_rows} rows, {len(header)} columns)')

    # Hot-swap CSVReader
    from csv_reader import CSVReader
    new_reader = CSVReader(csv_path=save_path)

    if not new_reader.loaded:
        os.remove(save_path)
        return jsonify({'error': 'Failed to load the uploaded CSV into the reader'}), 500

    _engine_state['csv_reader'] = new_reader

    # Reset all engines and switch to CSV mode
    old_mode = _engine_state.get('mode', 'live')
    _engine_state['mode'] = 'csv'
    _engine_state['fatigue_engine'].reset()
    _engine_state['alert_engine'].reset()
    _engine_state['latest_rul'] = {}
    _engine_state['latest_readings'] = {}
    _engine_state['readings_buffer'] = {cid: [] for cid in ['turbine_blade', 'compressor', 'bearing']}
    _engine_state['flight_hour'] = 0
    _engine_state['session_id'] = uuid.uuid4()

    # Emit socket events for mode switch and dataset load
    socketio = _engine_state.get('_socketio')
    if socketio:
        socketio.emit('mode_update', {
            'mode': 'csv',
            'previous_mode': old_mode,
            'flight_hour': 0,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })
        socketio.emit('dataset_loaded', {
            'filename': file.filename,
            'saved_as': saved_name,
            'total_rows': new_reader.total_rows,
            'columns': header,
            'uploaded_at': datetime.now(timezone.utc).isoformat(),
        })

    return jsonify({
        'status': 'Dataset uploaded and activated',
        'filename': file.filename,
        'saved_as': saved_name,
        'total_rows': new_reader.total_rows,
        'columns': header,
        'mode': 'csv',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    })


@api.route('/api/dataset-info', methods=['GET'])
def get_dataset_info():
    """Return info about the currently loaded CSV dataset."""
    if _engine_state is None:
        return jsonify({'error': 'Engine not initialized'}), 503

    csv_reader = _engine_state.get('csv_reader')
    if not csv_reader:
        return jsonify({'dataset': None})

    return jsonify({
        'dataset': {
            'filename': os.path.basename(csv_reader.csv_path),
            'total_rows': csv_reader.total_rows,
            'current_row': csv_reader.current_row_index,
            'progress': round(csv_reader.progress * 100, 1),
            'loaded': csv_reader.loaded,
            'engine_info': csv_reader.get_current_engine_info(),
        },
        'mode': _engine_state.get('mode', 'live'),
    })


