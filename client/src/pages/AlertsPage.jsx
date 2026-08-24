import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  MdOutlineWarningAmber,
  MdErrorOutline,
  MdCheckCircleOutline,
  MdOutlineNotificationsActive,
} from 'react-icons/md';
import { FiAlertTriangle, FiActivity, FiTarget, FiZap, FiClock } from 'react-icons/fi';
import AnimatedCounter from '../components/AnimatedCounter';

const API_URL = 'http://localhost:5000';

const C = {
  blue:     '#00C2FF',
  green:    '#00FF88',
  amber:    '#FBBF24',
  red:      '#FF3B3B',
  critical: '#FF0000',
  muted:    '#4A7A9B',
  text:     '#C8DFF0',
  border:   'rgba(0,194,255,0.12)',
};

const SEVERITY_CONFIG = {
  GREEN:    { icon: MdCheckCircleOutline, color: '#00FF88', bg: 'rgba(0,255,136,0.06)',  border: 'rgba(0,255,136,0.25)' },
  AMBER:    { icon: MdOutlineWarningAmber, color: '#FBBF24', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.25)' },
  RED:      { icon: FiAlertTriangle,      color: '#FF3B3B', bg: 'rgba(255,59,59,0.06)',  border: 'rgba(255,59,59,0.25)' },
  CRITICAL: { icon: MdErrorOutline,       color: '#FF0000', bg: 'rgba(255,0,0,0.08)',    border: 'rgba(255,0,0,0.35)' },
};

function GlassPanel({ children, className = '', style = {} }) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.018) 100%)',
        border: '1px solid rgba(0,194,255,0.13)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        ...style,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,194,255,0.3), transparent)' }} />
      {children}
    </div>
  );
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
}

function formatComponentName(id) {
  if (!id) return 'Unknown';
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(6,15,30,0.95)', border: '1px solid rgba(0,194,255,0.2)', borderRadius: 10, padding: '8px 14px', backdropFilter: 'blur(12px)' }}>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.fill, fontSize: 11, fontFamily: 'monospace' }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/alerts`, { params: { limit: 100 } });
        setAlerts(res.data.alerts || []);
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((a) => a.severity === 'CRITICAL').length;
    const anomaly = alerts.filter((a) => a.anomaly_flag).length;

    const compCounts = {};
    alerts.forEach((a) => {
      const c = a.component_id || 'unknown';
      compCounts[c] = (compCounts[c] || 0) + 1;
    });
    const mostAffected = Object.entries(compCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { total, critical, anomaly, mostAffected };
  }, [alerts]);

  const severityChart = useMemo(() => {
    const counts = { GREEN: 0, AMBER: 0, RED: 0, CRITICAL: 0 };
    alerts.forEach((a) => {
      if (counts[a.severity] !== undefined) counts[a.severity]++;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      fill: SEVERITY_CONFIG[name]?.color || '#64748b',
    }));
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (filter === 'ALL') return alerts;
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  const statCards = [
    { label: 'Total Alerts',      value: stats.total,       icon: FiActivity,     color: C.blue },
    { label: 'Critical',          value: stats.critical,    icon: MdErrorOutline, color: C.critical },
    { label: 'Anomaly-Triggered', value: stats.anomaly,     icon: FiZap,          color: C.amber },
    { label: 'Most Affected',     value: formatComponentName(stats.mostAffected), icon: FiTarget, color: C.green, isText: true },
  ];

  const FILTERS = ['ALL', 'GREEN', 'AMBER', 'RED', 'CRITICAL'];

  return (
    <div className="flex flex-col gap-4">

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassPanel>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${card.color}15`, border: `1px solid ${card.color}25` }}
                  >
                    <card.icon style={{ color: card.color, fontSize: 14 }} />
                  </div>
                  <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
                    {card.label.toUpperCase()}
                  </span>
                </div>
                {card.isText ? (
                  <p style={{ color: '#E8F4FF', fontSize: 18, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {card.value}
                  </p>
                ) : (
                  <p style={{ color: card.color, fontSize: 28, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                    <AnimatedCounter value={card.value} />
                  </p>
                )}
              </div>
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${card.color}50, transparent)` }} />
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      {/* ── Severity Distribution Chart ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassPanel>
          <div className="p-5">
            <h3 style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', marginBottom: 16 }}>
              SEVERITY DISTRIBUTION
            </h3>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityChart} margin={{ bottom: 0 }}>
                  <CartesianGrid stroke="#1E3A5F30" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} axisLine={{ stroke: 'rgba(0,194,255,0.1)' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]} name="Count">
                    {severityChart.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassPanel>
      </motion.div>

      {/* ── Alert Timeline — Dual-Sided Ladder Style with Center Spine ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <GlassPanel>
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <MdOutlineNotificationsActive style={{ color: C.amber, fontSize: 18 }} />
                <h3 style={{ color: '#E8F4FF', fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Alert Timeline
                </h3>
                <span style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace' }}>
                  {filteredAlerts.length} events
                </span>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5">
                {FILTERS.map((f) => {
                  const cfg = SEVERITY_CONFIG[f];
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        border: filter === f
                          ? `1px solid ${cfg?.color || C.blue}`
                          : '1px solid rgba(0,194,255,0.15)',
                        background: filter === f
                          ? (cfg ? `${cfg.color}20` : 'rgba(0,194,255,0.15)')
                          : 'transparent',
                        color: filter === f ? (cfg?.color || C.blue) : C.muted,
                        transition: 'all 0.15s',
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ladder Timeline Feed */}
            {loading ? (
              <div className="relative py-4">
                {/* Vertical spine line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-aero-border -translate-x-1/2 opacity-30" />
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => {
                    const isLeft = i % 2 === 0;
                    return (
                      <div key={i} className={`flex items-start gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div
                          className="flex-1 p-4 rounded-xl border border-aero-border/10"
                          style={{
                            background: 'rgba(255,255,255,0.015)',
                            maxWidth: '46%',
                            marginLeft: isLeft ? 'auto' : '4%',
                            marginRight: isLeft ? '4%' : 'auto',
                          }}
                        >
                          <div className="w-24 h-3 skeleton-pulse mb-2 rounded" />
                          <div className="w-full h-3 skeleton-pulse mb-2 rounded" />
                          <div className="w-16 h-2 skeleton-pulse rounded" />
                        </div>
                        <div className="w-3 h-3 rounded-full flex-shrink-0 mt-3 border-2 border-slate-700 skeleton-pulse" />
                        <div className="flex-1" style={{ maxWidth: '46%' }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <MdCheckCircleOutline style={{ color: C.green, fontSize: 40, margin: '0 auto 12px' }} />
                <p style={{ color: C.muted, fontSize: 13, fontFamily: 'monospace' }}>No alerts recorded</p>
                <p style={{ color: '#334155', fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>
                  All systems operating within normal parameters
                </p>
              </div>
            ) : (
              <div className="relative py-4">
                {/* Center vertical spine */}
                <div
                  className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(0,194,255,0.3) 0%, rgba(0,194,255,0.1) 100%)',
                    boxShadow: '0 0 8px rgba(0,194,255,0.15)',
                  }}
                />

                <div className="space-y-6">
                  <AnimatePresence>
                    {filteredAlerts.map((alert, i) => {
                      const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.GREEN;
                      const Icon = config.icon;
                      const isLeft = i % 2 === 0;
                      const isCritical = alert.severity === 'CRITICAL';

                      return (
                        <motion.div
                          key={alert.id || i}
                          initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35 }}
                          className={`flex items-start gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
                        >
                          {/* Alert Card */}
                          <div
                            className={`flex-1 p-3.5 rounded-xl border transition-all ${
                              isCritical ? 'animate-pulse-critical' : ''
                            }`}
                            style={{
                              backgroundColor: config.bg,
                              borderColor: config.border,
                              maxWidth: '46%',
                              marginLeft: isLeft ? 'auto' : '4%',
                              marginRight: isLeft ? '4%' : 'auto',
                              boxShadow: `0 4px 16px rgba(0,0,0,0.25), 0 0 10px ${config.color}15`,
                            }}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <Icon className="text-sm flex-shrink-0" style={{ color: config.color }} />
                                <span className="text-xs font-mono font-bold" style={{ color: config.color }}>
                                  {alert.severity}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                                <FiClock style={{ fontSize: 10, color: C.muted }} />
                                <span>{formatTimestamp(alert.created_at || alert.timestamp)}</span>
                              </div>
                            </div>

                            <p className="text-xs font-semibold text-white font-sans">
                              {formatComponentName(alert.component_id)}
                            </p>

                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              {alert.recommended_action}
                            </p>

                            <div className="flex items-center gap-3 mt-2.5 text-[10px] font-mono text-slate-400 border-t border-white/5 pt-2">
                              <span>
                                RUL: <span style={{ color: config.color, fontWeight: 700 }}>{Number(alert.predicted_rul_at_alert || 0).toFixed(0)} hrs</span>
                              </span>
                              {alert.anomaly_flag && (
                                <span
                                  className="px-1.5 py-0.5 rounded border font-bold text-[9px]"
                                  style={{
                                    backgroundColor: 'rgba(255, 59, 59, 0.15)',
                                    color: '#FF3B3B',
                                    borderColor: 'rgba(255, 59, 59, 0.3)',
                                  }}
                                >
                                  ANOMALY
                                </span>
                              )}
                              {alert.z_score_at_alert > 0 && (
                                <span className="ml-auto text-slate-500">
                                  z: {Number(alert.z_score_at_alert || 0).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Center Node Dot on the timeline spine */}
                          <div
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-3.5 border-2 z-10"
                            style={{
                              backgroundColor: config.color,
                              borderColor: '#071325',
                              boxShadow: `0 0 10px ${config.color}, 0 0 4px ${config.color}`,
                            }}
                          />

                          {/* Spacer to keep balance across center spine */}
                          <div className="flex-1" style={{ maxWidth: '46%' }} />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
