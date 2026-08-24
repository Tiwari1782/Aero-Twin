import { useState, useEffect, useRef, useCallback, createElement } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { FiDatabase, FiLink2, FiAlertTriangle } from 'react-icons/fi';

const SOCKET_URL = 'http://localhost:5000';
const MAX_HISTORY = 200;
const MAX_ALERTS = 50;

export default function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState('live');
  const [flightHour, setFlightHour] = useState(0);

  // Per-component latest data
  const [sensorData, setSensorData] = useState({});
  const [healthData, setHealthData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [datasetInfo, setDatasetInfo] = useState(null);

  // History buffers for charts (rolling window)
  const [sensorHistory, setSensorHistory] = useState({
    turbine_blade: [],
    compressor: [],
    bearing: [],
  });
  const [healthHistory, setHealthHistory] = useState({
    turbine_blade: [],
    compressor: [],
    bearing: [],
  });

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      toast.success('Backend Connected — Live telemetry active', {
        icon: createElement(FiLink2, { size: 16 }),
        id: 'socket-connect',
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      toast.error('Backend Disconnected — Reconnecting...', {
        id: 'socket-disconnect',
      });
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    // ── sensor_update ──
    socket.on('sensor_update', (data) => {
      const compId = data.component_id;
      if (!compId) return;

      setSensorData((prev) => ({ ...prev, [compId]: data }));

      setSensorHistory((prev) => {
        const history = prev[compId] || [];
        const newEntry = {
          ...data,
          time: Date.now(),
          idx: history.length,
        };
        const updated = [...history, newEntry];
        if (updated.length > MAX_HISTORY) updated.shift();
        return { ...prev, [compId]: updated };
      });

      if (data.flight_hour !== undefined) {
        setFlightHour(data.flight_hour);
      }
    });

    // ── health_update ──
    socket.on('health_update', (data) => {
      const compId = data.component_id;
      if (!compId) return;

      setHealthData((prev) => ({ ...prev, [compId]: data }));

      setHealthHistory((prev) => {
        const history = prev[compId] || [];
        const newEntry = {
          ...data,
          time: Date.now(),
          idx: history.length,
        };
        const updated = [...history, newEntry];
        if (updated.length > MAX_HISTORY) updated.shift();
        return { ...prev, [compId]: updated };
      });
    });

    // ── alert_update ──
    socket.on('alert_update', (data) => {
      setAlerts((prev) => {
        const updated = [{ ...data, id: Date.now() + Math.random(), time: Date.now() }, ...prev];
        if (updated.length > MAX_ALERTS) updated.pop();
        return updated;
      });

      // Auto-toast for CRITICAL / RED alerts
      if (data.severity === 'CRITICAL' || data.severity === 'RED') {
        toast.error(
          `${data.severity}: ${data.component_id?.replace('_', ' ').toUpperCase()} — ${data.recommended_action || 'Inspect immediately'}`,
          {
            duration: 8000,
            id: `alert-${data.component_id}-${Date.now()}`,
          }
        );
      }
    });

    // ── mode_update ──
    socket.on('mode_update', (data) => {
      if (data.mode) setMode(data.mode);
      if (data.flight_hour !== undefined) setFlightHour(data.flight_hour);
    });

    // ── simulation_reset ──
    socket.on('simulation_reset', () => {
      setFlightHour(0);
      setSensorHistory({ turbine_blade: [], compressor: [], bearing: [] });
      setHealthHistory({ turbine_blade: [], compressor: [], bearing: [] });
      setAlerts([]);
      toast.success('Simulation reset to baseline', { id: 'sim-reset' });
    });

    // ── anomaly_injected ──
    socket.on('anomaly_injected', (data) => {
      toast(`Anomaly injected: ${data.type} → ${data.component || 'all'}`, {
        icon: createElement(FiAlertTriangle, { size: 16 }),
        id: 'anomaly-inject',
        style: { borderColor: '#FFB800' },
      });
    });

    // ── dataset_loaded ──
    socket.on('dataset_loaded', (data) => {
      setDatasetInfo(data);

      // Reset all local state for the new dataset
      setFlightHour(0);
      setSensorHistory({ turbine_blade: [], compressor: [], bearing: [] });
      setHealthHistory({ turbine_blade: [], compressor: [], bearing: [] });
      setAlerts([]);
      setSensorData({});
      setHealthData({});

      toast.success(
        `New file ${data.filename} dataset representing now`,
        { icon: createElement(FiDatabase, { size: 18 }), id: 'dataset-loaded', duration: 5000 }
      );
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const emitEvent = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return {
    isConnected,
    mode,
    setMode,
    flightHour,
    sensorData,
    healthData,
    alerts,
    sensorHistory,
    healthHistory,
    emitEvent,
    datasetInfo,
  };
}

