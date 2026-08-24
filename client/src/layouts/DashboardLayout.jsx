import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  MdDashboard,
  MdOutlineWarningAmber,
  MdHistory,
  MdFlight,
} from 'react-icons/md';
import { BsCpu } from 'react-icons/bs';
import { FiWifiOff } from 'react-icons/fi';
import useSocket from '../hooks/useSocket';
import ModeToggle from '../components/ModeToggle';

/* ── Design tokens ── */
const C = {
  blue:    '#00C2FF',
  green:   '#00FF88',
  amber:   '#FBBF24',
  red:     '#FF453A',
  text:    '#C8DFF0',
  muted:   '#4A7A9B',
  border:  'rgba(0,194,255,0.12)',
  surface: 'rgba(255,255,255,0.04)',
};

const navItems = [
  { path: '/dashboard',         icon: MdDashboard,           label: 'Dashboard' },
  { path: '/dashboard/alerts',  icon: MdOutlineWarningAmber, label: 'Alerts'    },
  { path: '/dashboard/history', icon: MdHistory,             label: 'History'   },
];

const PAGE_TITLES = {
  '/dashboard':         'Engine Health Dashboard',
  '/dashboard/alerts':  'Alert History',
  '/dashboard/history': 'Sensor History',
};

export default function DashboardLayout() {
  const location = useLocation();
  const socket   = useSocket();
  const [clock, setClock] = useState(new Date());
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt     = (d) => d.toLocaleTimeString('en-US',  { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtDate = (d) => d.toLocaleDateString('en-US',  { month: 'short', day: '2-digit', year: 'numeric' });

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'AeroTwin';

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #071325 0%, #0A1C35 35%, #081828 65%, #060F1E 100%)',
        fontFamily: "'Inter', 'Space Grotesk', system-ui, sans-serif",
        color: C.text,
      }}
    >
      {/* ── Ambient background blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div style={{
          position: 'absolute', top: '-10%', left: '-8%',
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(0,170,220,0.07) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-10%',
          width: '55vw', height: '55vw',
          background: 'radial-gradient(circle, rgba(0,90,190,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      {/* ════════════════════════════════════════
          SLIDE IN / OUT HOVER SIDEBAR
      ════════════════════════════════════════ */}
      <motion.aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={false}
        animate={{ width: isHovered ? 210 : 68 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="fixed left-0 top-0 bottom-0 z-50 flex flex-col justify-between py-5 overflow-hidden"
        style={{
          background: isHovered
            ? 'linear-gradient(180deg, rgba(8,20,44,0.98) 0%, rgba(4,10,24,0.99) 100%)'
            : 'linear-gradient(180deg, rgba(8,20,42,0.97) 0%, rgba(5,12,26,0.99) 100%)',
          borderRight: '1px solid rgba(0,194,255,0.12)',
          backdropFilter: 'blur(28px)',
          boxShadow: isHovered
            ? '8px 0 32px rgba(0,0,0,0.6), 2px 0 10px rgba(0,194,255,0.1)'
            : '4px 0 24px rgba(0,0,0,0.35)',
        }}
      >
        {/* ── TOP: Logo + Navigation ── */}
        <div className="flex flex-col gap-6 w-full px-2.5">

          {/* Logo Mark */}
          <div className="flex items-center gap-3 px-1 h-11">
            <motion.div
              className="relative flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                background: 'linear-gradient(135deg, #0055BB 0%, #0099EE 50%, #00C2FF 100%)',
                boxShadow: '0 0 20px rgba(0,170,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.25 }}
            >
              <MdFlight
                style={{
                  color: '#fff',
                  fontSize: 22,
                  transform: 'rotate(45deg)',
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
                }}
              />
            </motion.div>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col leading-tight whitespace-nowrap overflow-hidden"
                >
                  <span style={{ color: '#E8F4FF', fontSize: 14, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
                    AeroTwin
                  </span>
                  <span style={{ color: C.muted, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em' }}>
                    ENGINE DIGITAL TWIN
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,194,255,0.25), transparent)' }} />

          {/* Nav items */}
          <nav className="flex flex-col gap-1.5 w-full">
            {navItems.map((item) => {
              const isActive =
                item.path === '/dashboard'
                  ? location.pathname === '/dashboard'
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink key={item.path} to={item.path} className="relative w-full">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    className="relative flex items-center gap-3.5 rounded-xl transition-all duration-200"
                    style={{
                      height: 44,
                      padding: '0 12px',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(0,194,255,0.18) 0%, rgba(0,194,255,0.08) 100%)'
                        : 'transparent',
                      border: isActive
                        ? '1px solid rgba(0,194,255,0.28)'
                        : '1px solid transparent',
                      boxShadow: isActive ? '0 0 16px rgba(0,194,255,0.12), inset 0 1px 0 rgba(0,194,255,0.1)' : 'none',
                      color: isActive ? C.blue : C.muted,
                    }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeBar"
                        className="absolute rounded-full"
                        style={{
                          left: -1,
                          top: '20%',
                          bottom: '20%',
                          width: 3,
                          background: `linear-gradient(180deg, ${C.blue}, #0066FF)`,
                          boxShadow: `0 0 10px ${C.blue}, 0 0 4px ${C.blue}`,
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    <item.icon style={{ fontSize: 20, flexShrink: 0 }} />

                    <AnimatePresence>
                      {isHovered && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "'Space Grotesk', sans-serif",
                            color: isActive ? '#E8F4FF' : C.text,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* ── BOTTOM: Status + Clock ── */}
        <div className="flex flex-col gap-3 w-full px-2.5">
          {/* Divider */}
          <div style={{ width: '100%', height: 1, background: 'rgba(0,194,255,0.1)' }} />

          {/* Connection status */}
          <div className="flex items-center gap-3 px-1">
            <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28 }}>
              {socket.isConnected && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 28,
                    height: 28,
                    border: `1px solid ${C.green}`,
                    opacity: 0,
                  }}
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: socket.isConnected ? C.green : C.red,
                  boxShadow: `0 0 8px ${socket.isConnected ? C.green : C.red}`,
                }}
              />
            </div>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col leading-tight whitespace-nowrap"
                >
                  <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 800, color: socket.isConnected ? C.green : C.red, letterSpacing: '0.06em' }}>
                    {socket.isConnected ? 'SYSTEM CONNECTED' : 'DISCONNECTED'}
                  </span>
                  <span style={{ fontSize: 8.5, fontFamily: 'monospace', color: C.muted }}>
                    PORT 5000 ACTIVE
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mode badge */}
          <div
            className="rounded-lg text-center py-1 px-1.5 transition-all"
            style={{
              background: socket.mode === 'live'
                ? 'linear-gradient(135deg, rgba(0,255,136,0.12) 0%, rgba(0,255,136,0.05) 100%)'
                : 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.05) 100%)',
              border: `1px solid ${socket.mode === 'live' ? 'rgba(0,255,136,0.25)' : 'rgba(251,191,36,0.25)'}`,
              boxShadow: `0 0 12px ${socket.mode === 'live' ? 'rgba(0,255,136,0.08)' : 'rgba(251,191,36,0.08)'}`,
            }}
          >
            <span style={{
              fontSize: 8.5,
              fontFamily: 'monospace',
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: socket.mode === 'live' ? C.green : C.amber,
              whiteSpace: 'nowrap',
            }}>
              {isHovered ? `MODE: ${socket.mode.toUpperCase()}` : socket.mode.toUpperCase()}
            </span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex-shrink-0" style={{ width: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 8.5, fontFamily: 'monospace', fontWeight: 700, color: C.blue }}>
                {fmt(clock).slice(0, 5)}
              </div>
            </div>
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap leading-tight"
                >
                  <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: C.blue }}>
                    {fmt(clock)}
                  </div>
                  <div style={{ fontSize: 8.5, fontFamily: 'monospace', color: C.muted }}>
                    {fmtDate(clock)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* ════════════════════════════════════════
          MAIN CONTENT — with 68px left margin to prevent any content overlap
      ════════════════════════════════════════ */}
      <main className="relative flex-1 flex flex-col overflow-hidden z-10" style={{ marginLeft: 68 }}>

        {/* ── Top bar ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5"
          style={{
            height: 52,
            background: 'rgba(5,13,28,0.75)',
            borderBottom: '1px solid rgba(0,194,255,0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 1px 0 rgba(0,194,255,0.06)',
          }}
        >
          {/* Left: page title + badges */}
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.h2
                key={pageTitle}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.22 }}
                style={{
                  color: '#E8F4FF',
                  fontSize: 14,
                  fontWeight: 800,
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '-0.01em',
                }}
              >
                {pageTitle}
              </motion.h2>
            </AnimatePresence>

            {/* FH pill */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(0,194,255,0.07)',
                border: '1px solid rgba(0,194,255,0.18)',
              }}
            >
              <BsCpu style={{ color: C.blue, fontSize: 10 }} />
              <span style={{ color: C.muted, fontSize: 9.5, fontFamily: 'monospace', fontWeight: 600 }}>FH</span>
              <span style={{ color: C.blue, fontSize: 11, fontWeight: 900, fontFamily: 'monospace' }}>
                {socket.flightHour}
              </span>
            </div>

            {/* Live / Offline pill */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: socket.isConnected ? 'rgba(0,255,136,0.07)' : 'rgba(255,69,58,0.07)',
                border: `1px solid ${socket.isConnected ? 'rgba(0,255,136,0.2)' : 'rgba(255,69,58,0.2)'}`,
              }}
            >
              <motion.div
                className="rounded-full"
                style={{
                  width: 6, height: 6,
                  background: socket.isConnected ? C.green : C.red,
                  boxShadow: `0 0 6px ${socket.isConnected ? C.green : C.red}`,
                }}
                animate={{ opacity: socket.isConnected ? [1, 0.3, 1] : 1 }}
                transition={{ duration: 1.3, repeat: Infinity }}
              />
              <span style={{
                color: socket.isConnected ? C.green : C.red,
                fontSize: 9.5,
                fontWeight: 800,
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
              }}>
                {socket.isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Right: mode toggle */}
          <ModeToggle mode={socket.mode} setMode={socket.setMode} />
        </div>

        {/* ── Connection toast ── */}
        <AnimatePresence>
          {!socket.isConnected && (
            <motion.div
              key="disconnected-toast"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
              className="absolute z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
              style={{
                top: 62,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255,69,58,0.09)',
                border: '1px solid rgba(255,69,58,0.32)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 24px rgba(255,69,58,0.12)',
              }}
            >
              <FiWifiOff style={{ color: C.red, fontSize: 13 }} />
              <span style={{ color: C.red, fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }}>
                Backend Disconnected — Reconnecting…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Route content ── */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '14px 16px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              className="h-full"
            >
              <Outlet context={socket} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}