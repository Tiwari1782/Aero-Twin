import { motion } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import { GiThermometerHot } from 'react-icons/gi';
import { MdVibration } from 'react-icons/md';
import { BsSpeedometer } from 'react-icons/bs';
import AnimatedCounter from './AnimatedCounter';

const COMPONENTS = ['turbine_blade', 'compressor', 'bearing'];
const SENSORS = [
  { key: 'temperature', label: 'Temperature', icon: GiThermometerHot, unit: '°C', color: '#FF6B6B' },
  { key: 'vibration', label: 'Vibration', icon: MdVibration, unit: 'g', color: '#00A8E8' },
  { key: 'rpm', label: 'RPM', icon: BsSpeedometer, unit: 'rpm', color: '#00FF88' },
];

const COMP_LABELS = {
  turbine_blade: 'Turbine',
  compressor: 'Compressor',
  bearing: 'Bearing',
};

function getTrend(history, key) {
  if (!history || history.length < 5) return 'stable';
  const recent = history.slice(-5);
  const first = recent[0]?.[key] ?? 0;
  const last = recent[recent.length - 1]?.[key] ?? 0;
  const diff = last - first;
  const threshold = Math.abs(first) * 0.005;
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}

function TrendIcon({ trend }) {
  if (trend === 'up') return <FiTrendingUp className="text-aero-red text-xs" />;
  if (trend === 'down') return <FiTrendingDown className="text-aero-green text-xs" />;
  return <FiMinus className="text-slate-600 text-xs" />;
}

function SparkLine({ data, dataKey, color }) {
  const chartData = (data || []).slice(-50).map((d, i) => ({ i, v: d[dataKey] ?? 0 }));

  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TelemetryGrid({ sensorData, sensorHistory }) {
  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-slate-300 font-sans mb-3">
        Live Sensor Telemetry
      </h3>
      <div className="grid grid-cols-3 lg:grid-cols-9 gap-2">
        {COMPONENTS.map((compId) =>
          SENSORS.map((sensor, si) => {
            const value = sensorData[compId]?.[sensor.key] ?? 0;
            const history = sensorHistory[compId] || [];
            const trend = getTrend(history, sensor.key);

            return (
              <motion.div
                key={`${compId}-${sensor.key}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: si * 0.05 }}
                className="panel p-2 flex flex-col gap-1"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <sensor.icon className="text-xs" style={{ color: sensor.color }} />
                    <span className="text-[9px] font-sans text-slate-500 truncate">
                      {COMP_LABELS[compId]}
                    </span>
                  </div>
                  <TrendIcon trend={trend} />
                </div>

                {/* Sparkline */}
                <SparkLine data={history} dataKey={sensor.key} color={sensor.color} />

                {/* Value */}
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-mono font-bold text-white">
                    <AnimatedCounter value={value} decimals={1} />
                  </span>
                  <span className="text-[8px] font-mono text-slate-600">{sensor.unit}</span>
                </div>

                {/* Sensor Label */}
                <span className="text-[8px] text-slate-600 font-sans">{sensor.label}</span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

