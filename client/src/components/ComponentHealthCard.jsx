import { motion } from 'framer-motion';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { GiGearHammer, GiTurbine, GiCircuitry } from 'react-icons/gi';
import { FiChevronRight } from 'react-icons/fi';
import AnimatedCounter from './AnimatedCounter';

const COMP_CONFIG = {
  turbine_blade: { label: 'Turbine Blade', icon: GiTurbine, color: '#00A8E8' },
  compressor: { label: 'Compressor', icon: GiGearHammer, color: '#00FF88' },
  bearing: { label: 'Bearing', icon: GiCircuitry, color: '#FFB800' },
};

const SEVERITY_COLORS = {
  GREEN: '#00FF88',
  AMBER: '#FFB800',
  RED: '#FF3B3B',
  CRITICAL: '#FF0000',
};

export default function ComponentHealthCard({ componentId, healthData, sensorData, onClick }) {
  const config = COMP_CONFIG[componentId] || {};
  const Icon = config.icon || GiTurbine;
  const health = healthData?.health_score ?? 100;
  const severity = healthData?.severity ?? 'GREEN';
  const rul = healthData?.predicted_rul ?? 500;
  const fatigue = healthData?.fatigue_score ?? 0;
  const sevColor = SEVERITY_COLORS[severity] || '#00FF88';

  const gaugeData = [
    { name: 'health', value: health, fill: sevColor },
  ];

  const isCritical = severity === 'CRITICAL';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`panel p-4 cursor-pointer transition-all duration-300 hover:border-aero-blue ${
        isCritical ? 'animate-pulse-critical' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${config.color}15`, border: `1px solid ${config.color}30` }}
          >
            <Icon className="text-lg" style={{ color: config.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-sans">{config.label}</h3>
            <span
              className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
              style={{
                color: sevColor,
                backgroundColor: `${sevColor}15`,
                border: `1px solid ${sevColor}30`,
              }}
            >
              {severity}
            </span>
          </div>
        </div>
        <FiChevronRight className="text-slate-600" />
      </div>

      <div className="flex items-center gap-3">
        {/* Radial Gauge */}
        <div className="w-20 h-20 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              data={gaugeData}
              barSize={8}
            >
              <RadialBar
                background={{ fill: '#1E3A5F20' }}
                dataKey="value"
                cornerRadius={4}
                animationDuration={800}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="relative -mt-[54px] text-center">
            <span className="text-lg font-mono font-bold" style={{ color: sevColor }}>
              <AnimatedCounter value={health} decimals={1} />
            </span>
            <span className="text-[8px] text-slate-500 block -mt-1">%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-500 font-sans block">RUL</span>
            <span className="text-sm font-mono font-bold text-white">
              <AnimatedCounter value={rul} decimals={0} />
              <span className="text-[10px] text-slate-500 ml-1">hrs</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-sans block">Fatigue</span>
            <span className="text-sm font-mono font-bold text-slate-300">
              <AnimatedCounter value={fatigue} decimals={2} />
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-sans block">Temp</span>
            <span className="text-xs font-mono text-slate-300">
              <AnimatedCounter value={sensorData?.temperature ?? 0} decimals={1} />°
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-sans block">Vib</span>
            <span className="text-xs font-mono text-slate-300">
              <AnimatedCounter value={sensorData?.vibration ?? 0} decimals={2} />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

