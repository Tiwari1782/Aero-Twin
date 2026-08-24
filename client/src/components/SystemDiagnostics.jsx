import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';

const C = {
  blue:   '#00C2FF',
  green:  '#00FF88',
  amber:  '#FBBF24',
  red:    '#FF453A',
  muted:  '#4A7A9B',
  border: 'rgba(0,194,255,0.12)',
};

function CustomTooltip({ active, payload, label, title = 'Point' }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 border border-aero-border/30 backdrop-blur-md"
      style={{ background: 'rgba(6, 15, 30, 0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
    >
      <p className="text-[10px] font-mono text-slate-500 mb-1">{title} #{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-mono" style={{ color: entry.color || entry.fill }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function SystemDiagnostics({ healthHistory, healthData, sensorData }) {
  // 1. Health Score Trajectory
  const trajectoryData = useMemo(() => {
    const maxLen = Math.max(
      healthHistory.turbine_blade?.length || 0,
      healthHistory.compressor?.length || 0,
      healthHistory.bearing?.length || 0
    );

    const data = [];
    for (let i = 0; i < maxLen; i++) {
      data.push({
        idx: i,
        'Turbine blade': healthHistory.turbine_blade?.[i]?.health_score ?? null,
        'Compressor': healthHistory.compressor?.[i]?.health_score ?? null,
        'Bearing': healthHistory.bearing?.[i]?.health_score ?? null,
      });
    }
    return data;
  }, [healthHistory]);

  // 2. Status Breakdown (Nominal vs Caution vs Warning)
  const statusBreakdown = useMemo(() => {
    let nominal = 0;
    let caution = 0;
    let warning = 0;

    const comps = ['turbine_blade', 'compressor', 'bearing'];
    comps.forEach((comp) => {
      const score = healthData[comp]?.health_score ?? 100;
      if (score >= 80) nominal++;
      else if (score >= 50) caution++;
      else warning++;
    });

    const total = nominal + caution + warning || 1;
    return [
      { name: 'Nominal', value: Math.round((nominal / total) * 100), fill: C.green },
      { name: 'Caution', value: Math.round((caution / total) * 100), fill: C.amber },
      { name: 'Warning', value: Math.round((warning / total) * 100), fill: C.red },
    ];
  }, [healthData]);

  // 3. Health Score Distribution
  const healthDistribution = useMemo(() => {
    const buckets = [
      { name: '0-20', count: 0, fill: C.red },
      { name: '20-40', count: 0, fill: C.red },
      { name: '40-60', count: 0, fill: C.amber },
      { name: '60-80', count: 0, fill: C.green },
      { name: '80-100', count: 0, fill: C.blue },
    ];

    const comps = ['turbine_blade', 'compressor', 'bearing'];
    comps.forEach((comp) => {
      const history = healthHistory[comp] || [];
      history.forEach((h) => {
        const score = h.health_score ?? 100;
        if (score <= 20) buckets[0].count++;
        else if (score <= 40) buckets[1].count++;
        else if (score <= 60) buckets[2].count++;
        else if (score <= 80) buckets[3].count++;
        else buckets[4].count++;
      });
    });

    return buckets;
  }, [healthHistory]);

  // 4. Vibration Comparison
  const vibrationData = useMemo(() => {
    return [
      { name: 'Turbine blade', value: sensorData.turbine_blade?.vibration ?? 0, fill: C.blue },
      { name: 'Compressor', value: sensorData.compressor?.vibration ?? 0, fill: C.green },
      { name: 'Bearing', value: sensorData.bearing?.vibration ?? 0, fill: C.amber },
    ];
  }, [sensorData]);

  // 5. Remaining Useful Life (RUL) Comparison
  const rulData = useMemo(() => {
    return [
      { name: 'Turbine', value: healthData.turbine_blade?.predicted_rul ?? 500, fill: C.blue },
      { name: 'Compressor', value: healthData.compressor?.predicted_rul ?? 500, fill: C.green },
      { name: 'Bearing', value: healthData.bearing?.predicted_rul ?? 500, fill: C.amber },
    ];
  }, [healthData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-3">
      {/* ── Top Row ── */}
      {/* 1. Health Score Trajectory */}
      <div className="lg:col-span-6 panel p-4">
        <h3 className="text-sm font-semibold text-slate-300 font-sans mb-3 flex items-center gap-2">
          Health Score Trajectory
        </h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trajectoryData}>
              <CartesianGrid stroke="#1E3A5F20" strokeDasharray="3 3" />
              <XAxis dataKey="idx" tick={{ fill: C.muted, fontSize: 9 }} axisLine={{ stroke: 'rgba(0,194,255,0.1)' }} tickLine={false} />
              <YAxis domain={[0, 105]} tick={{ fill: C.muted, fontSize: 9 }} axisLine={{ stroke: 'rgba(0,194,255,0.1)' }} tickLine={false} />
              <Tooltip content={<CustomTooltip title="Tick" />} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={20} stroke={C.red} strokeDasharray="3 3" label={{ value: 'Critical threshold', fill: C.red, fontSize: 8, position: 'top' }} />
              <Line type="monotone" dataKey="Turbine blade" stroke={C.blue} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Compressor" stroke={C.green} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Bearing" stroke={C.amber} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Status Breakdown */}
      <div className="lg:col-span-4 panel p-4">
        <h3 className="text-sm font-semibold text-slate-300 font-sans mb-3">
          Status Breakdown
        </h3>
        <div className="h-44 flex items-center justify-between">
          <div className="w-[55%] h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={52}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip title="Status" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend Details */}
          <div className="w-[42%] flex flex-col gap-2 text-[10px] text-slate-400 pr-1">
            {statusBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.fill }} />
                  {item.name}
                </span>
                <span className="font-bold text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      {/* 3. Health Score Distribution */}
      <div className="lg:col-span-3 panel p-4">
        <h3 className="text-sm font-semibold text-slate-300 font-sans mb-3">
          Health Score Distribution
        </h3>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={healthDistribution} margin={{ bottom: -10 }}>
              <CartesianGrid stroke="#1E3A5F20" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip title="Score Range" />} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {healthDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Vibration Comparison */}
      <div className="lg:col-span-3 panel p-4">
        <h3 className="text-sm font-semibold text-slate-300 font-sans mb-3">
          Vibration Comparison
        </h3>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vibrationData} margin={{ bottom: -10 }}>
              <CartesianGrid stroke="#1E3A5F20" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip title="Vibration" />} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {vibrationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Remaining Useful Life */}
      <div className="lg:col-span-4 panel p-4">
        <h3 className="text-sm font-semibold text-slate-300 font-sans mb-3">
          Remaining Useful Life
        </h3>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rulData} layout="vertical" margin={{ left: -10, bottom: -10 }}>
              <CartesianGrid stroke="#1E3A5F20" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: C.muted, fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: C.muted, fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip title="Component" />} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={12}>
                {rulData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
