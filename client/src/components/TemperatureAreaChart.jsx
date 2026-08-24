import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const COMP_COLORS = {
  turbine_blade: { stroke: '#00A8E8', fill: '#00A8E820' },
  compressor: { stroke: '#00FF88', fill: '#00FF8820' },
  bearing: { stroke: '#FFB800', fill: '#FFB80020' },
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-aero-panel border border-aero-border rounded-lg p-3 shadow-xl">
      <p className="text-[10px] font-mono text-aero-blue mb-1">Tick #{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs font-mono" style={{ color: entry.stroke }}>
          {entry.name}: {Number(entry.value).toFixed(1)}°
        </p>
      ))}
    </div>
  );
}

export default function TemperatureAreaChart({ sensorHistory }) {
  const chartData = useMemo(() => {
    const maxLen = Math.max(
      sensorHistory.turbine_blade?.length || 0,
      sensorHistory.compressor?.length || 0,
      sensorHistory.bearing?.length || 0
    );

    const data = [];
    for (let i = 0; i < maxLen; i++) {
      data.push({
        idx: i,
        turbine_blade: sensorHistory.turbine_blade?.[i]?.temperature ?? null,
        compressor: sensorHistory.compressor?.[i]?.temperature ?? null,
        bearing: sensorHistory.bearing?.[i]?.temperature ?? null,
      });
    }
    return data;
  }, [sensorHistory]);

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-slate-300 font-sans mb-3">
        Temperature Trends
      </h3>
      <div className="h-48 lg:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
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
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {Object.entries(COMP_COLORS).map(([key, colors]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={key.replace('_', ' ')}
                stroke={colors.stroke}
                fill={colors.fill}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

