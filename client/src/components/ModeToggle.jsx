import { motion } from 'framer-motion';
import { FiDatabase } from 'react-icons/fi';
import { BsCpu } from 'react-icons/bs';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:5000';

const modes = [
  { key: 'csv', label: 'CSV Replay', icon: FiDatabase },
  { key: 'live', label: 'Live Sim', icon: BsCpu },
];

export default function ModeToggle({ mode, setMode }) {
  const handleToggle = async (newMode) => {
    if (newMode === mode) return;
    try {
      await axios.post(`${API_URL}/api/mode`, { mode: newMode });
      setMode(newMode);
      toast.success(`Mode switched to ${newMode.toUpperCase()}`, { id: 'mode-switch' });
    } catch (err) {
      toast.error('Failed to switch mode');
    }
  };

  return (
    <div className="flex items-center bg-aero-bg/60 border border-aero-border rounded-full p-0.5 relative">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => handleToggle(m.key)}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-colors duration-200 ${
            mode === m.key ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {mode === m.key && (
            <motion.div
              layoutId="mode-bg"
              className="absolute inset-0 bg-gradient-to-r from-aero-blue/30 to-cyan-600/20 border border-aero-blue/40 rounded-full"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <m.icon className="text-sm relative z-10" />
          <span className="relative z-10 hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
