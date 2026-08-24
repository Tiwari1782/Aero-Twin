import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  ResponsiveContainer, ComposedChart, Line, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { FiDownload, FiFilter, FiDatabase, FiActivity, FiClock, FiChevronDown } from 'react-icons/fi';
import { MdHistory } from 'react-icons/md';
import { GiThermometerHot } from 'react-icons/gi';
import { MdVibration } from 'react-icons/md';
import { BsSpeedometer } from 'react-icons/bs';
import AnimatedCounter from '../components/AnimatedCounter';

const API_URL = 'http://localhost:5000';

const C = {
  blue:   '#00C2FF',
  green:  '#34D399',
  red:    '#FF6B6B',
  cyan:   '#00E5FF',
  muted:  '#4A7A9B',
  text:   '#C8DFF0',
  border: 'rgba(0,194,255,0.12)',
};

/* Glass panel */
function GlassPanel({ children, style = {}, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.018) 100%)',
        border: '1px solid rgba(0,194,255,0.13)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        ...style,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,194,255,0.28), transparent)' }} />
      {children}
    </div>
  );
}

/* Glass select */
function GlassSelect({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none pr-7 pl-3 py-2 rounded-xl text-xs font-mono outline-none transition-all duration-200"
        style={{
          background: 'rgba(0,194,255,0.07)',
          border: '1px solid rgba(0,194,255,0.18)',
          color: C.text,
          cursor: 'pointer',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(0,194,255,0.4)'; }}
        onBlur={e  => { e.target.style.borderColor = 'rgba(0,194,255,0.18)'; }}
      >
        {children}
      </select>
      <FiChevronDown
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: C.muted, fontSize: 12 }}
      />
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  // Find flight_hour from payload data
  const fh = payload[0]?.payload?.flight_hour;
  return (
    <div className="rounded-xl px-4 py-3"
      style={{ background: 'rgba(6,15,30,0.95)', border: '1px solid rgba(0,194,255,0.2)', backdropFilter: 'blur(12px)' }}>
      <p style={{ color: C.blue, fontSize: 10, fontFamily: 'monospace', marginBottom: 6 }}>
        {fh !== undefined ? `FH: ${fh.toLocaleString()} hrs` : `Index #${label}`}
      </p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color || e.stroke, fontSize: 11, fontFamily: 'monospace' }}>
          {e.name}: {Number(e.value).toFixed(3)}
        </p>
      ))}
    </div>
  );
}

const COMP_COLORS = {
  turbine_blade: C.blue,
  compressor:    '#A78BFA',
  bearing:       '#FBBF24',
};

export default function HistoryPage() {
  const [readings, setReadings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [component, setComponent] = useState('');
  const [limit,     setLimit]     = useState(200);
  const [sortKey,   setSortKey]   = useState('flight_hour');
  const [sortDir,   setSortDir]   = useState('desc');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = { limit };
      if (component) params.component = component;
      const res = await axios.get(`${API_URL}/api/history`, { params });
      setReadings(res.data.readings || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, [component, limit]);

  const chartData = useMemo(() =>
    readings.slice().sort((a, b) => (a.flight_hour || 0) - (b.flight_hour || 0))
      .map((r, i) => ({
        idx:         i,
        temperature: Number(r.temperature) || 0,
        vibration:   Number(r.vibration)   || 0,
        rpm:         Number(r.rpm)         || 0,
        flight_hour: Number(r.flight_hour) || 0,
      })),
    [readings]);

  const sorted = useMemo(() =>
    [...readings].sort((a, b) => {
      const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    }), [readings, sortKey, sortDir]);

  const stats = useMemo(() => {
    if (!readings.length) return { total: 0, avgTemp: 0, avgVib: 0, avgRpm: 0 };
    const n = readings.length;
    return {
      total:   n,
      avgTemp: readings.reduce((s, r) => s + (Number(r.temperature) || 0), 0) / n,
      avgVib:  readings.reduce((s, r) => s + (Number(r.vibration)   || 0), 0) / n,
      avgRpm:  readings.reduce((s, r) => s + (Number(r.rpm)         || 0), 0) / n,
    };
  }, [readings]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleExportCSV = () => {
    const headers = ['component_id', 'flight_hour', 'temperature', 'vibration', 'rpm', 'timestamp'];
    const csv = [headers.join(','), ...sorted.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n');
    const a   = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `aerotwin_history_${Date.now()}.csv`,
    });
    a.click();
  };

  const statCards = [
    { label: 'Total Records', value: stats.total,   icon: FiDatabase,       color: C.blue,    dec: 0 },
    { label: 'Avg Temp',      value: stats.avgTemp,  icon: GiThermometerHot, color: C.red,     dec: 1, unit: '°C'  },
    { label: 'Avg Vibration', value: stats.avgVib,   icon: MdVibration,      color: C.cyan,    dec: 3, unit: 'g'   },
    { label: 'Avg RPM',       value: stats.avgRpm,   icon: BsSpeedometer,    color: C.green,   dec: 0, unit: 'rpm' },
  ];

  const columns = [
    { key: 'component_id', label: 'Component' },
    { key: 'flight_hour',  label: 'FH' },
    { key: 'temperature',  label: 'Temp (°C)' },
    { key: 'vibration',    label: 'Vibration' },
    { key: 'rpm',          label: 'RPM' },
    { key: 'timestamp',    label: 'Timestamp' },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassPanel>
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${card.color}15`, border: `1px solid ${card.color}25` }}>
                    <card.icon style={{ color: card.color, fontSize: 14 }} />
                  </div>
                  <span className="font-tech font-bold text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
                    {card.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono-tech font-bold text-2xl" style={{ color: card.color, lineHeight: 1 }}>
                    <AnimatedCounter value={card.value} decimals={card.dec} />
                  </span>
                  {card.unit && (
                    <span className="font-mono-tech text-[10px]" style={{ color: C.muted }}>{card.unit}</span>
                  )}
                </div>
              </motion.div>
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${card.color}50, transparent)` }} />
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassPanel>
          <div className="flex flex-wrap items-center gap-4 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,194,255,0.1)', border: '1px solid rgba(0,194,255,0.2)' }}>
                <MdHistory style={{ color: C.blue, fontSize: 14 }} />
              </div>
              <h2 style={{ color: '#E8F4FF', fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                Sensor Telemetry Log
              </h2>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <FiFilter style={{ color: C.muted, fontSize: 13 }} />

              <GlassSelect value={component} onChange={e => setComponent(e.target.value)}>
                <option value="">All Components</option>
                <option value="turbine_blade">Turbine Blade</option>
                <option value="compressor">Compressor</option>
                <option value="bearing">Bearing</option>
              </GlassSelect>

              <GlassSelect value={limit} onChange={e => setLimit(Number(e.target.value))}>
                <option value={100}>100 rows</option>
                <option value={200}>200 rows</option>
                <option value={500}>500 rows</option>
                <option value={1000}>1000 rows</option>
              </GlassSelect>

              <motion.button
                whileHover={{ scale: 1.04, boxShadow: '0 0 18px rgba(0,194,255,0.2)' }}
                whileTap={{ scale: 0.96 }}
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: 'rgba(0,194,255,0.1)',
                  border: '1px solid rgba(0,194,255,0.28)',
                  color: C.blue,
                  fontFamily: 'monospace',
                }}
              >
                <FiDownload style={{ fontSize: 13 }} />
                Export CSV
              </motion.button>
            </div>
          </div>
        </GlassPanel>
      </motion.div>

      {/* ── Degradation chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassPanel>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0,194,255,0.1)', border: '1px solid rgba(0,194,255,0.2)' }}>
                <FiActivity style={{ color: C.blue, fontSize: 14 }} />
              </div>
              <div>
                <p style={{ color: C.blue, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em' }}>OVERVIEW</p>
                <h3 style={{ color: '#E8F4FF', fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Degradation Trajectory
                </h3>
              </div>
              <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 10, fontFamily: 'monospace' }}>
                {chartData.length} data points
              </span>
            </div>

            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ left: -20, right: 10, bottom: 0, top: 5 }}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.red}  stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C.red}  stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="vibGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.cyan} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={C.cyan} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(0,194,255,0.07)" strokeDasharray="3 3" />
                  <XAxis dataKey="idx"
                    tick={{ fill: C.muted, fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={{ stroke: 'rgba(0,194,255,0.1)' }} tickLine={false} />
                  <YAxis yAxisId="temp" orientation="left"
                    tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="vib" orientation="right"
                    tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle" iconSize={7}
                    wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: C.text, paddingTop: 12 }}
                  />
                  <Area yAxisId="temp" type="monotone" dataKey="temperature"
                    stroke={C.red} fill="url(#tempGrad)" strokeWidth={2} dot={false} name="Temperature" />
                  <Area yAxisId="vib" type="monotone" dataKey="vibration"
                    stroke={C.cyan} fill="url(#vibGrad)" strokeWidth={1.5} dot={false} name="Vibration" />
                  <Line yAxisId="vib" type="monotone" dataKey="rpm"
                    stroke={C.green} strokeWidth={1.5} dot={false}
                    activeDot={{ r: 3, strokeWidth: 0, fill: C.green }}
                    name="RPM" strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassPanel>
      </motion.div>

      {/* ── Data table ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassPanel>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,194,255,0.1)', background: 'rgba(0,15,35,0.5)' }}>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left cursor-pointer transition-colors duration-150"
                      style={{ color: sortKey === col.key ? C.blue : C.muted }}
                      onMouseEnter={e => { if (sortKey !== col.key) e.currentTarget.style.color = C.text; }}
                      onMouseLeave={e => { if (sortKey !== col.key) e.currentTarget.style.color = C.muted; }}
                    >
                      <div className="flex items-center gap-1.5" style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
                        {col.label.toUpperCase()}
                        {sortKey === col.key && (
                          <span style={{ color: C.blue }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid rgba(0,194,255,0.05)' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full skeleton-pulse" style={{ width: 8, height: 8 }} />
                          <div className="w-24 h-4 skeleton-pulse" />
                        </div>
                      </td>
                      <td className="px-4 py-3"><div className="w-12 h-4 skeleton-pulse" /></td>
                      <td className="px-4 py-3"><div className="w-16 h-4 skeleton-pulse" /></td>
                      <td className="px-4 py-3"><div className="w-16 h-4 skeleton-pulse" /></td>
                      <td className="px-4 py-3"><div className="w-16 h-4 skeleton-pulse" /></td>
                      <td className="px-4 py-3"><div className="w-32 h-4 skeleton-pulse" /></td>
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <span style={{ color: C.muted, fontSize: 12, fontFamily: 'monospace' }}>
                        No readings found in history database.
                      </span>
                    </td>
                  </tr>
                ) : (
                  sorted.slice(0, 200).map((row, i) => {
                    const compColor = COMP_COLORS[row.component_id] || C.muted;
                    return (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.005, 0.3) }}
                        style={{
                          borderBottom: '1px solid rgba(0,194,255,0.05)',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,194,255,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)'; }}
                      >
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-2 font-tech" style={{ fontSize: 12, color: C.text }}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: compColor, boxShadow: `0 0 6px ${compColor}` }} />
                            {(row.component_id || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono-tech font-bold" style={{ fontSize: 12, color: C.blue }}>
                          {Number(row.flight_hour || 0).toFixed(0)}
                        </td>
                        <td className="px-4 py-2.5 font-mono-tech" style={{ fontSize: 12, color: C.text }}>
                          {Number(row.temperature || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 font-mono-tech" style={{ fontSize: 12, color: C.text }}>
                          {Number(row.vibration || 0).toFixed(4)}
                        </td>
                        <td className="px-4 py-2.5 font-mono-tech" style={{ fontSize: 12, color: C.text }}>
                          {Number(row.rpm || 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-2.5 font-mono-tech" style={{ fontSize: 10, color: C.muted }}>
                          {row.timestamp ? new Date(row.timestamp).toLocaleString('en-US', { hour12: false }) : '—'}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid rgba(0,194,255,0.08)', background: 'rgba(0,10,25,0.4)' }}
          >
            <span style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace' }}>
              Showing {Math.min(sorted.length, 200)} of {readings.length} records
            </span>
            <div className="flex items-center gap-1.5">
              <FiClock style={{ color: C.blue, fontSize: 11 }} />
              <span style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace' }}>
                Last fetched: {new Date().toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}