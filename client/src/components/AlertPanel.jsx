import { motion, AnimatePresence } from 'framer-motion';
import {
  MdOutlineWarningAmber,
  MdErrorOutline,
  MdCheckCircleOutline,
  MdOutlineNotificationsActive,
} from 'react-icons/md';
import { FiAlertTriangle, FiShield } from 'react-icons/fi';

const SEVERITY_CONFIG = {
  GREEN: { icon: MdCheckCircleOutline, color: '#00FF88', bg: '#00FF8810' },
  AMBER: { icon: MdOutlineWarningAmber, color: '#FFB800', bg: '#FFB80010' },
  RED: { icon: FiAlertTriangle, color: '#FF3B3B', bg: '#FF3B3B10' },
  CRITICAL: { icon: MdErrorOutline, color: '#FF0000', bg: '#FF000015' },
};

function formatTime(ts) {
  if (!ts) return '--:--:--';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false });
  } catch {
    return '--:--:--';
  }
}

function formatComponentName(id) {
  if (!id) return 'Unknown';
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AlertPanel({ alerts }) {
  return (
    <div className="panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300 font-sans flex items-center gap-2">
          <MdOutlineNotificationsActive className="text-aero-amber" />
          Live Alerts
        </h3>
        <span className="text-[10px] font-mono text-slate-500">
          {alerts.length} total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-32 text-center"
            >
              <FiShield className="text-3xl text-aero-green/40 mb-2" />
              <p className="text-xs text-slate-600 font-sans">All systems nominal</p>
              <p className="text-[10px] text-slate-700 font-mono">No alerts triggered</p>
            </motion.div>
          ) : (
            alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.GREEN;
              const Icon = config.icon;
              const isCritical = alert.severity === 'CRITICAL';

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ type: 'spring', bounce: 0.2 }}
                  className={`p-3 rounded-lg border ${
                    isCritical ? 'animate-pulse-critical' : ''
                  }`}
                  style={{
                    backgroundColor: config.bg,
                    borderColor: `${config.color}40`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="text-lg flex-shrink-0 mt-0.5" style={{ color: config.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-xs font-mono font-bold"
                          style={{ color: config.color }}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white mt-1 truncate">
                        {formatComponentName(alert.component_id)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                        {alert.recommended_action}
                      </p>
                      {alert.anomaly_flag && (
                        <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-aero-red/10 text-aero-red border border-aero-red/20">
                          ANOMALY
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

