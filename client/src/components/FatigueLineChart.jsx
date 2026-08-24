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
} from 'recharts';

const COMP_COLORS = {
  turbine_blade: '#00A8E8',
  compressor: '#00FF88',
  bearing: '#FFB800',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-aero-panel border border-aero-border rounded-lg p-3 shadow-xl">
      <p className="text-[10px] font-mono text-aero-blue mb-1">Tick #{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs font-mono" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toFixed(3)}
        </p>
      ))}
    </div>
  );
}

export default function FatigueLineChart({ healthHistory }) {
  const chartData = useMemo(() => {
    const maxLen = Math.max(
      healthHistory.turbine_blade?.length || 0,
      healthHistory.compressor?.length || 0,
      healthHistory.bearing?.length || 0
    );

    const data = [];
    for (let i = 0; i < maxLen; i++) {
      data.push({
        idx: i,
        turbine_blade: healthHistory.turbine_blade?.[i]?.fatigue_score ?? null,
        compressor: healthHistory.compressor?.[i]?.fatigue_score ?? null,
        bearing: healthHistory.bearing?.[i]?.fatigue_score ?? null,
      });
    }
    return data;
  }, [healthHistory]);

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-slate-300 font-sans mb-3">
        Fatigue Score — All Components
      </h3>
      <div className="h-48 lg:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#1E3A5F30" strokeDasharray="3 3" />
            <XAxis
              dataKey="idx"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#1E3A5F' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#1E3A5F' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, fontFamily: 'Inter' }}
            />
            {Object.entries(COMP_COLORS).map(([key, color]) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key.replace('_', ' ')}
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

