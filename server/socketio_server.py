"""
socketio_server.py — Socket.IO event definitions and handlers.

Server → Client events (emitted every tick):
    sensor_update   — Raw sensor reading
    health_update   — Processed health state (drives dashboard visuals)
    alert_update    — New alert (only emitted when threshold crossed)

Client → Server events:
    inject_anomaly  — Inject fault spike into MODE B simulator
    advance_time    — Fast-forward simulation by N flight hours
    reset           — Reset all components to baseline health
    set_mode        — Switch data source live (csv/live)
"""

from datetime import datetime, timezone


def register_socketio_events(socketio, engine_state):
    """
    Register all Socket.IO event handlers.

    Args:
        socketio: Flask-SocketIO instance.
        engine_state: Shared state dict from app.py.
    """

    @socketio.on('connect')
    def handle_connect():
        print(f"Client connected")
        # Send current state to newly connected client
        socketio.emit('mode_update', {
            'mode': engine_state.get('mode', 'live'),
            'flight_hour': engine_state.get('flight_hour', 0),
        })

    @socketio.on('disconnect')
    def handle_disconnect():
        print(f"Client disconnected")

    @socketio.on('inject_anomaly')
    def handle_inject_anomaly(data):
        """Handle anomaly injection from client."""
        if engine_state.get('mode') != 'live':
            socketio.emit('error', {
                'message': 'Anomaly injection only available in Live mode'
            })
            return

        anomaly_type = data.get('type', 'vibration')
        component_id = data.get('component_id', None)

        simulator = engine_state.get('simulator')
        if simulator:
            simulator.inject_anomaly(
                anomaly_type=anomaly_type,
                component_id=component_id,
                duration_ticks=10
            )
            print(f"Anomaly injected: {anomaly_type} → {component_id or 'all'}")

            socketio.emit('anomaly_injected', {
                'type': anomaly_type,
                'component': component_id or 'all',
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })

    @socketio.on('advance_time')
    def handle_advance_time(data):
        """Fast-forward simulation by N flight hours."""
        hours = data.get('hours', 10)
        hours = min(max(hours, 1), 100)  # Clamp 1-100

        simulator = engine_state.get('simulator')
        if simulator:
            simulator.advance_time(hours)
            engine_state['flight_hour'] = simulator.flight_hour
            print(f"Time advanced by {hours} hours → flight hour {simulator.flight_hour}")

        socketio.emit('time_advanced', {
            'hours_advanced': hours,
            'current_flight_hour': engine_state.get('flight_hour', 0),
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })

    @socketio.on('reset')
    def handle_reset(data=None):
        """Reset all components to baseline health."""
        engine_state['fatigue_engine'].reset()
        engine_state['alert_engine'].reset()

        simulator = engine_state.get('simulator')
        if simulator:
            simulator.reset()

        csv_reader = engine_state.get('csv_reader')
        if csv_reader:
            csv_reader.reset()

        engine_state['latest_rul'] = {}
        engine_state['latest_readings'] = {}
        engine_state['readings_buffer'] = {
            cid: [] for cid in ['turbine_blade', 'compressor', 'bearing']
        }
        engine_state['flight_hour'] = 0

        print("Simulation reset to baseline")

        socketio.emit('simulation_reset', {
            'status': 'reset',
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })

    @socketio.on('set_mode')
    def handle_set_mode(data):
        """Switch data source mode."""
        new_mode = data.get('mode', '').lower()
        if new_mode not in ('csv', 'live'):
            socketio.emit('error', {'message': 'Invalid mode. Use "csv" or "live".'})
            return

        old_mode = engine_state.get('mode', 'live')
        engine_state['mode'] = new_mode

        # Reset on mode switch
        engine_state['fatigue_engine'].reset()
        engine_state['alert_engine'].reset()
        engine_state['latest_rul'] = {}
        engine_state['latest_readings'] = {}
        engine_state['readings_buffer'] = {
            cid: [] for cid in ['turbine_blade', 'compressor', 'bearing']
        }
        engine_state['flight_hour'] = 0

        if new_mode == 'live' and engine_state.get('simulator'):
            engine_state['simulator'].reset()
        if new_mode == 'csv' and engine_state.get('csv_reader'):
            engine_state['csv_reader'].reset()

        print(f"Mode switched: {old_mode} → {new_mode}")

        socketio.emit('mode_update', {
            'mode': new_mode,
            'previous_mode': old_mode,
            'flight_hour': 0,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })


def emit_sensor_update(socketio, readings):
    """Emit sensor_update event with sensor readings."""
    for reading in readings:
        socketio.emit('sensor_update', reading)


def emit_health_update(socketio, health_data):
    """Emit health_update event with processed health state."""
    for data in health_data:
        socketio.emit('health_update', data)


def emit_alert_update(socketio, alerts):
    """Emit alert_update event for threshold crossings."""
    for alert in alerts:
        if alert.get('threshold_crossed') or alert.get('anomaly_flag'):
            socketio.emit('alert_update', alert)


def emit_dataset_loaded(socketio, dataset_info):
    """Emit dataset_loaded event after a CSV upload completes.

    Args:
        socketio: Flask-SocketIO instance.
        dataset_info (dict): {filename, total_rows, columns, uploaded_at}
    """
    socketio.emit('dataset_loaded', dataset_info)
