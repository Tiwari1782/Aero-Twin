"""
db_writer.py — INSERT operations for all three PostgreSQL tables.

Called after every processing tick to persist:
  - Raw sensor readings
  - Processed health snapshots
  - Maintenance alerts
"""

from db import get_connection, release_connection
from sanitize import sanitize_for_db


def insert_sensor_reading(data):
    """
    Insert a single sensor reading into the sensor_readings table.

    Args:
        data (dict): {
            session_id, mode, component_id, flight_hour,
            temperature, vibration, rpm,
            cmapss_engine_id (optional), cmapss_cycle (optional)
        }
    """
    data = sanitize_for_db(data)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO sensor_readings
                    (session_id, mode, component_id, flight_hour,
                     temperature, vibration, rpm, cmapss_engine_id, cmapss_cycle)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                data['session_id'],
                data['mode'],
                data['component_id'],
                data['flight_hour'],
                data['temperature'],
                data['vibration'],
                data['rpm'],
                data.get('cmapss_engine_id'),
                data.get('cmapss_cycle')
            ))
            row_id = cur.fetchone()[0]
        conn.commit()
        return row_id
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] insert_sensor_reading failed: {e}")
        return None
    finally:
        release_connection(conn)


def insert_sensor_readings_batch(readings):
    """
    Insert multiple sensor readings in a single transaction.

    Args:
        readings (list[dict]): List of sensor reading dicts.
    """
    readings = [sanitize_for_db(r) for r in readings]
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for data in readings:
                cur.execute("""
                    INSERT INTO sensor_readings
                        (session_id, mode, component_id, flight_hour,
                         temperature, vibration, rpm, cmapss_engine_id, cmapss_cycle)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    data['session_id'],
                    data['mode'],
                    data['component_id'],
                    data['flight_hour'],
                    data['temperature'],
                    data['vibration'],
                    data['rpm'],
                    data.get('cmapss_engine_id'),
                    data.get('cmapss_cycle')
                ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] insert_sensor_readings_batch failed: {e}")
    finally:
        release_connection(conn)


def insert_health_snapshot(data):
    """
    Insert a health snapshot into the health_snapshots table.

    Args:
        data (dict): {
            session_id, component_id, flight_hour,
            fatigue_score, health_score, predicted_rul,
            confidence, severity
        }
    """
    data = sanitize_for_db(data)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO health_snapshots
                    (session_id, component_id, flight_hour,
                     fatigue_score, health_score, predicted_rul,
                     confidence, severity)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                data['session_id'],
                data['component_id'],
                data['flight_hour'],
                data['fatigue_score'],
                data['health_score'],
                data['predicted_rul'],
                data['confidence'],
                data['severity']
            ))
            row_id = cur.fetchone()[0]
        conn.commit()
        return row_id
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] insert_health_snapshot failed: {e}")
        return None
    finally:
        release_connection(conn)


def insert_maintenance_log(data):
    """
    Insert an alert record into the maintenance_log table.

    Args:
        data (dict): {
            session_id, component_id, severity,
            recommended_action, predicted_rul_at_alert,
            anomaly_flag, z_score_at_alert, mode
        }
    """
    data = sanitize_for_db(data)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO maintenance_log
                    (session_id, component_id, severity,
                     recommended_action, predicted_rul_at_alert,
                     anomaly_flag, z_score_at_alert, mode)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                data['session_id'],
                data['component_id'],
                data['severity'],
                data['recommended_action'],
                data['predicted_rul_at_alert'],
                data.get('anomaly_flag', False),
                data.get('z_score_at_alert'),
                data['mode']
            ))
            row_id = cur.fetchone()[0]
        conn.commit()
        return row_id
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] insert_maintenance_log failed: {e}")
        return None
    finally:
        release_connection(conn)


def fetch_sensor_history(component_id=None, limit=200, session_id=None):
    """
    Fetch sensor readings history from PostgreSQL.

    Args:
        component_id (str, optional): Filter by component.
        limit (int): Max rows to return.
        session_id (str, optional): Filter by session.

    Returns:
        list[dict]: Sensor reading rows.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            query = "SELECT * FROM sensor_readings WHERE 1=1"
            params = []

            if component_id:
                query += " AND component_id = %s"
                params.append(component_id)
            if session_id:
                query += " AND session_id = %s"
                params.append(session_id)

            query += " ORDER BY created_at DESC LIMIT %s"
            params.append(limit)

            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        print(f"[ERROR] fetch_sensor_history failed: {e}")
        return []
    finally:
        release_connection(conn)


def fetch_alerts(limit=50, component_id=None):
    """
    Fetch maintenance alerts from PostgreSQL.

    Args:
        limit (int): Max rows to return.
        component_id (str, optional): Filter by component.

    Returns:
        list[dict]: Maintenance log rows.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            query = "SELECT * FROM maintenance_log WHERE 1=1"
            params = []

            if component_id:
                query += " AND component_id = %s"
                params.append(component_id)

            query += " ORDER BY created_at DESC LIMIT %s"
            params.append(limit)

            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

            return [dict(zip(columns, row)) for row in rows]
    except Exception as e:
        print(f"[ERROR] fetch_alerts failed: {e}")
        return []
    finally:
        release_connection(conn)


def fetch_latest_health(session_id=None):
    """
    Fetch the latest health snapshot per component.

    Returns:
        dict: { component_id: { health data } }
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            query = """
                SELECT DISTINCT ON (component_id)
                    component_id, flight_hour, fatigue_score,
                    health_score, predicted_rul, confidence, severity,
                    created_at
                FROM health_snapshots
            """
            params = []
            if session_id:
                query += " WHERE session_id = %s"
                params.append(session_id)

            query += " ORDER BY component_id, created_at DESC"

            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

            result = {}
            for row in rows:
                data = dict(zip(columns, row))
                result[data['component_id']] = data

            return result
    except Exception as e:
        print(f"[ERROR] fetch_latest_health failed: {e}")
        return {}
    finally:
        release_connection(conn)
