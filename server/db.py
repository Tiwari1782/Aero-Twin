"""
db.py — PostgreSQL connection pool and schema initialization.

Connects to PostgreSQL using psycopg2 connection pool.
Creates all three tables (sensor_readings, health_snapshots, maintenance_log)
on startup if they do not exist.
"""

import os
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://aerotwin_user:Prakash2005@localhost:5432/aerotwin_db'
)

# Connection pool — min 2, max 10 connections
_connection_pool = None


def get_pool():
    """Get or create the connection pool."""
    global _connection_pool
    if _connection_pool is None or _connection_pool.closed:
        _connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=DATABASE_URL
        )
    return _connection_pool


def get_connection():
    """Get a connection from the pool."""
    return get_pool().getconn()


def release_connection(conn):
    """Return a connection to the pool."""
    try:
        get_pool().putconn(conn)
    except Exception:
        pass


def init_db():
    """
    Create all tables and indexes if they do not exist.
    Called once at Flask startup.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # ── Table 1: sensor_readings ──
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    id              BIGSERIAL PRIMARY KEY,
                    session_id      UUID NOT NULL,
                    mode            VARCHAR(10) NOT NULL CHECK (mode IN ('csv', 'live')),
                    component_id    VARCHAR(30) NOT NULL,
                    flight_hour     INTEGER NOT NULL,
                    temperature     NUMERIC(8,3) NOT NULL,
                    vibration       NUMERIC(8,4) NOT NULL,
                    rpm             NUMERIC(10,2) NOT NULL,
                    cmapss_engine_id INTEGER,
                    cmapss_cycle    INTEGER,
                    created_at      TIMESTAMPTZ DEFAULT NOW()
                );
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_sensor_component_session
                    ON sensor_readings(component_id, session_id, flight_hour);
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_sensor_created_at
                    ON sensor_readings(created_at DESC);
            """)

            # ── Table 2: health_snapshots ──
            cur.execute("""
                CREATE TABLE IF NOT EXISTS health_snapshots (
                    id              BIGSERIAL PRIMARY KEY,
                    session_id      UUID NOT NULL,
                    component_id    VARCHAR(30) NOT NULL,
                    flight_hour     INTEGER NOT NULL,
                    fatigue_score   NUMERIC(6,3) NOT NULL,
                    health_score    NUMERIC(6,3) NOT NULL,
                    predicted_rul   NUMERIC(8,2) NOT NULL,
                    confidence      NUMERIC(5,4) NOT NULL,
                    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('GREEN','AMBER','RED','CRITICAL')),
                    created_at      TIMESTAMPTZ DEFAULT NOW()
                );
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_health_component_session
                    ON health_snapshots(component_id, session_id, flight_hour);
            """)

            # ── Table 3: maintenance_log ──
            cur.execute("""
                CREATE TABLE IF NOT EXISTS maintenance_log (
                    id                      BIGSERIAL PRIMARY KEY,
                    session_id              UUID NOT NULL,
                    component_id            VARCHAR(30) NOT NULL,
                    severity                VARCHAR(10) NOT NULL,
                    recommended_action      TEXT NOT NULL,
                    predicted_rul_at_alert  NUMERIC(8,2) NOT NULL,
                    anomaly_flag            BOOLEAN DEFAULT FALSE,
                    z_score_at_alert        NUMERIC(6,3),
                    mode                    VARCHAR(10) NOT NULL,
                    created_at              TIMESTAMPTZ DEFAULT NOW()
                );
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_maintenance_component
                    ON maintenance_log(component_id, created_at DESC);
            """)

        conn.commit()
        print("[OK] PostgreSQL tables initialized successfully")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Database initialization error: {e}")
        raise
    finally:
        release_connection(conn)


def close_pool():
    """Close all connections in the pool. Called on shutdown."""
    global _connection_pool
    if _connection_pool and not _connection_pool.closed:
        _connection_pool.closeall()
        _connection_pool = None
