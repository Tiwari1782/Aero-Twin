import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GiJetFighter, GiSatelliteCommunication } from 'react-icons/gi';
import { AiOutlineRobot } from 'react-icons/ai';
import { MdOutlineWarningAmber, MdRocketLaunch } from 'react-icons/md';
import { FiDatabase, FiArrowRight, FiActivity, FiShield, FiZap } from 'react-icons/fi';
import {
  SiFlask, SiPostgresql, SiScikitlearn, SiReact,
  SiSocketdotio, SiThreedotjs, SiTailwindcss,
} from 'react-icons/si';
import { BsCpu } from 'react-icons/bs';
import { HiOutlineChip } from 'react-icons/hi';
import AnimatedCounter from '../components/AnimatedCounter';

const API_URL = 'http://localhost:5000';

/* ─── Turbine SVG background ────────────────────────────── */
function TurbineOrb() {
  return (
    <svg
      viewBox="0 0 600 600"
      className="absolute select-none pointer-events-none"
      style={{ width: '100%', height: '100%' }}
      aria-hidden
    >
      <defs>
        {/* Core glow */}
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#00C2FF" stopOpacity="0.25" />
          <stop offset="40%"  stopColor="#0066CC" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0A1628"  stopOpacity="0" />
        </radialGradient>
        {/* Ring gradients */}
        <radialGradient id="ring1Grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="85%"  stopColor="#00C2FF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="ring2Grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="85%"  stopColor="#0099DD" stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="ring3Grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="85%"  stopColor="#006699" stopOpacity="0.2" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="blueGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Atmospheric backdrop */}
      <circle cx="300" cy="300" r="280" fill="url(#coreGlow)" />

      {/* Outer ring - slow spin */}
      <motion.g
        style={{ originX: '300px', originY: '300px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="300" cy="300" r="230"
          fill="none" stroke="#00C2FF" strokeWidth="1"
          strokeDasharray="12 8" opacity="0.35" />
        {/* Tick marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = 225, r2 = 235;
          return (
            <line key={i}
              x1={300 + Math.cos(a) * r1} y1={300 + Math.sin(a) * r1}
              x2={300 + Math.cos(a) * r2} y2={300 + Math.sin(a) * r2}
              stroke="#00C2FF" strokeWidth="1.5" opacity="0.5" />
          );
        })}
      </motion.g>

      {/* Middle ring - counter spin */}
      <motion.g
        style={{ originX: '300px', originY: '300px' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="300" cy="300" r="168"
          fill="none" stroke="#00AAEE" strokeWidth="1.5"
          strokeDasharray="6 10" opacity="0.45" />
        {/* Blade shapes — 6 fan blades */}
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const cos = Math.cos(a), sin = Math.sin(a);
          const x1 = 300 + cos * 80, y1 = 300 + sin * 80;
          const x2 = 300 + Math.cos(a + 0.5) * 155, y2 = 300 + Math.sin(a + 0.5) * 155;
          const x3 = 300 + Math.cos(a - 0.1) * 160, y3 = 300 + Math.sin(a - 0.1) * 160;
          return (
            <path key={i} d={`M${x1},${y1} Q${x2},${y2} ${x3},${y3} Z`}
              fill="#00C2FF" fillOpacity="0.07"
              stroke="#00C2FF" strokeWidth="0.8" strokeOpacity="0.4" />
          );
        })}
      </motion.g>

      {/* Inner ring */}
      <motion.g
        style={{ originX: '300px', originY: '300px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="300" cy="300" r="100"
          fill="none" stroke="#00E5FF" strokeWidth="2"
          strokeDasharray="4 6" opacity="0.5" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <line key={i}
              x1={300 + Math.cos(a) * 96} y1={300 + Math.sin(a) * 96}
              x2={300 + Math.cos(a) * 104} y2={300 + Math.sin(a) * 104}
              stroke="#00E5FF" strokeWidth="2" opacity="0.7" />
          );
        })}
      </motion.g>

      {/* Core glow circle */}
      <circle cx="300" cy="300" r="48"
        fill="#001830" stroke="#00C2FF" strokeWidth="2" opacity="0.9" />
      <circle cx="300" cy="300" r="44"
        fill="none" stroke="#00E5FF" strokeWidth="1" opacity="0.6"
        strokeDasharray="3 3" />
      <motion.circle cx="300" cy="300" r="22"
        fill="#00C2FF" fillOpacity="0.15"
        animate={{ r: [22, 28, 22], fillOpacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
      <circle cx="300" cy="300" r="8" fill="#00C2FF" opacity="0.9" filter="url(#blueGlow)" />

      {/* Glowing dots on outer ring */}
      {[0, 90, 180, 270].map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return (
          <motion.circle key={i}
            cx={300 + Math.cos(a) * 230} cy={300 + Math.sin(a) * 230} r="4"
            fill="#00E5FF" filter="url(#blueGlow)"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }} />
        );
      })}
    </svg>
  );
}

/* ─── Glass card ─────────────────────────────────────────── */
function GlassCard({ children, className = '', hover = true, style = {} }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, boxShadow: '0 20px 60px rgba(0,194,255,0.15)' } : {}}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(0,194,255,0.18)',
        backdropFilter: 'blur(12px)',
        ...style,
      }}
    >
      {/* Inner highlight */}
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,194,255,0.4), transparent)' }} />
      {children}
    </motion.div>
  );
}

const features = [
  {
    icon: GiJetFighter,
    accent: '#00C2FF',
    title: 'Real-Time Telemetry',
    desc: 'Live sensor feeds from turbine blades, compressors, and bearings. Temperature, vibration & RPM at 2-second resolution.',
    badge: 'LIVE',
  },
  {
    icon: AiOutlineRobot,
    accent: '#A78BFA',
    title: 'ML-Powered RUL Prediction',
    desc: 'scikit-learn model trained on NASA C-MAPSS turbofan data — 91–94% accuracy predicting remaining useful engine life.',
    badge: '94%',
  },
  {
    icon: MdOutlineWarningAmber,
    accent: '#FBBF24',
    title: 'Anomaly Escalation',
    desc: 'Z-score detection with four-tier severity — GREEN → AMBER → RED → CRITICAL — with crew-ready action prompts.',
    badge: '<2s',
  },
  {
    icon: FiDatabase,
    accent: '#34D399',
    title: 'Full Audit Trail',
    desc: 'Every sensor reading, ML prediction, and maintenance event committed to PostgreSQL for complete MRO traceability.',
    badge: 'SQL',
  },
];

const techStack = [
  { icon: SiFlask,               name: 'Flask',       color: '#E8F4FF' },
  { icon: SiPostgresql,          name: 'PostgreSQL',  color: '#336791' },
  { icon: SiScikitlearn,         name: 'scikit-learn',color: '#F7931E' },
  { icon: SiReact,               name: 'React',       color: '#61DAFB' },
  { icon: SiSocketdotio,         name: 'Socket.IO',   color: '#E8F4FF' },
  { icon: GiSatelliteCommunication, name: 'C-MAPSS',  color: '#00C2FF' },
  { icon: SiThreedotjs,          name: 'Three.js',    color: '#E8F4FF' },
  { icon: SiTailwindcss,         name: 'Tailwind',    color: '#38BDF8' },
];

const stats = [
  { label: 'Anomaly Detection', value: 2, suffix: 's', prefix: '<', icon: FiZap, accent: '#00C2FF' },
  { label: 'Model Accuracy',    value: 94, suffix: '%',              icon: HiOutlineChip, accent: '#A78BFA' },
  { label: 'MRO Market Size',   value: 33, suffix: 'B', prefix: '$', icon: FiShield, accent: '#34D399' },
];

/* ═══════════════════════════════════════════════════════════ */
export default function IntroPage() {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState('checking');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const check = async () => {
      try {
        await axios.get(`${API_URL}/api/health`, { timeout: 3000 });
        setBackendStatus('connected');
      } catch { setBackendStatus('disconnected'); }
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 2000);
    return () => clearInterval(t);
  }, []);

  /* Fake live telemetry values */
  const egt  = (842 + (tick % 9) * 4).toFixed(0);
  const n1   = (98.2 + (tick % 5) * 0.3 - 0.6).toFixed(1);
  const rul  = (218 - tick % 14).toFixed(0);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #071325 0%, #0A1C35 35%, #081828 65%, #060F1E 100%)',
        fontFamily: "'Inter', 'Space Grotesk', system-ui, sans-serif",
        color: '#C8DFF0',
      }}
    >
      {/* ── Ambient background blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Top-left teal blob */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-8%',
          width: '55vw', height: '55vw',
          background: 'radial-gradient(circle, rgba(0,180,220,0.10) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        {/* Bottom-right blue blob */}
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-10%',
          width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, rgba(0,100,200,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        {/* Center subtle glow */}
        <div style={{
          position: 'absolute', top: '25%', left: '50%',
          transform: 'translateX(-50%)',
          width: '70vw', height: '50vh',
          background: 'radial-gradient(ellipse, rgba(0,160,220,0.05) 0%, transparent 70%)',
        }} />
      </div>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20">

        {/* Turbine backdrop */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 'min(680px, 90vw)',
            height: 'min(680px, 90vw)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -52%)',
            opacity: 0.55,
          }}
        >
          <TurbineOrb />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">

          {/* Top status pill */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 mb-10 px-4 py-2 rounded-full"
            style={{
              background: 'rgba(0,194,255,0.08)',
              border: '1px solid rgba(0,194,255,0.25)',
            }}
          >
            <motion.span
              className="w-2 h-2 rounded-full"
              style={{ background: '#00C2FF' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span style={{ color: '#00C2FF', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em' }}>
              IIC 3.0 International Innovation Challenge - MU, Jaipur
            </span>
          </motion.div>

          {/* Brand lockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex items-center justify-center gap-4 mb-6"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0066CC 0%, #00AAFF 100%)',
                boxShadow: '0 0 28px rgba(0,170,255,0.45)',
              }}
            >
              <GiJetFighter className="text-2xl text-white" />
            </div>
            <h1
              className="text-5xl md:text-6xl font-black tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #80D8FF 50%, #00C2FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
              }}
            >
              AeroTwin
            </h1>
          </motion.div>

          {/* Typed tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="h-8 flex items-center justify-center mb-10"
          >
            <TypeAnimation
              sequence={[
                'Real-Time Digital Twin for Predictive Aircraft Engine Health',
                4000,
                'ML-Powered RUL Prediction · 91–94% Accuracy',
                3000,
                'Anomaly Detection in Under 2 Seconds',
                3000,
                'Full Sensor Audit Trail · PostgreSQL Backed',
                3000,
              ]}
              wrapper="p"
              speed={55}
              repeat={Infinity}
              style={{ color: '#7EB8D4', fontSize: 15, fontWeight: 500, letterSpacing: '0.02em' }}
            />
          </motion.div>

          {/* Live telemetry strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mx-auto mb-10 rounded-2xl overflow-hidden"
            style={{
              maxWidth: 480,
              background: 'linear-gradient(135deg, rgba(0,25,55,0.85) 0%, rgba(0,15,35,0.9) 100%)',
              border: '1px solid rgba(0,194,255,0.2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,194,255,0.12)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid rgba(0,194,255,0.1)' }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#00FF88' }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span style={{ color: '#7EB8D4', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em' }}>
                  ENGINE-01 · LIVE TELEMETRY
                </span>
              </div>
              <FiActivity style={{ color: '#00C2FF', fontSize: 13 }} />
            </div>
            {/* Readouts */}
            <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'rgba(0,194,255,0.1)' }}>
              {[
                { label: 'EGT TEMP', value: `${egt}°C`, color: '#FBBF24' },
                { label: 'N1 SPEED', value: `${n1}%`,  color: '#00C2FF' },
                { label: 'RUL EST',  value: `${rul}cy`, color: '#34D399' },
              ].map((r) => (
                <div key={r.label} className="px-4 py-4 text-center"
                  style={{ borderRight: '1px solid rgba(0,194,255,0.1)' }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: r.color, fontFamily: 'monospace' }}>
                    {r.value}
                  </div>
                  <div style={{ fontSize: 9, color: '#4A7A9B', fontWeight: 600, letterSpacing: '0.12em', marginTop: 3 }}>
                    {r.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stat trio */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.12 }}
                className="flex items-center gap-3 px-5 py-3.5 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${s.accent}12 0%, ${s.accent}06 100%)`,
                  border: `1px solid ${s.accent}30`,
                  minWidth: 140,
                }}
              >
                <s.icon style={{ color: s.accent, fontSize: 20, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.accent, lineHeight: 1, fontFamily: 'monospace' }}>
                    {s.prefix || ''}<AnimatedCounter value={s.value} duration={2} />{s.suffix}
                  </div>
                  <div style={{ fontSize: 10, color: '#4A7A9B', fontWeight: 600, letterSpacing: '0.1em', marginTop: 3 }}>
                    {s.label.toUpperCase()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.button
            onClick={() => navigate('/dashboard')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            whileHover={{ scale: 1.04, boxShadow: '0 0 48px rgba(0,194,255,0.4)' }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #0077DD 0%, #00AAFF 50%, #00C2FF 100%)',
              fontSize: 16,
              letterSpacing: '0.04em',
              boxShadow: '0 0 32px rgba(0,170,255,0.3), 0 8px 24px rgba(0,0,0,0.3)',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <MdRocketLaunch className="text-xl" />
            Launch Dashboard
            <FiArrowRight className="text-lg group-hover:translate-x-1 transition-transform duration-200" />
          </motion.button>
        </div>
      </section>

      {/* ── ANGLED DIVIDER ─────────────────────────────────── */}
      <div className="relative z-10 -mt-8">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full" style={{ height: 60 }}>
          <path d="M0,0 L1440,40 L1440,60 L0,60 Z"
            fill="rgba(0,194,255,0.04)" />
          <path d="M0,0 L1440,40"
            fill="none" stroke="rgba(0,194,255,0.15)" strokeWidth="1" />
        </svg>
      </div>

      {/* ── WHAT AEROTWIN DOES ──────────────────────────────── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p style={{ color: '#00C2FF', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', marginBottom: 12 }}>
              SYSTEM CAPABILITIES
            </p>
            <h2
              className="text-3xl md:text-4xl font-black"
              style={{
                color: '#E8F4FF',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              What AeroTwin Does
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-7 h-full">
                  <div className="flex items-start gap-5">
                    {/* Icon block */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${feat.accent}22 0%, ${feat.accent}10 100%)`,
                        border: `1px solid ${feat.accent}35`,
                      }}
                    >
                      <feat.icon style={{ color: feat.accent, fontSize: 22 }} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          className="text-base font-bold"
                          style={{ color: '#E8F4FF', fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {feat.title}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{
                            background: `${feat.accent}18`,
                            color: feat.accent,
                            border: `1px solid ${feat.accent}30`,
                            fontSize: 10,
                            letterSpacing: '0.08em',
                          }}
                        >
                          {feat.badge}
                        </span>
                      </div>
                      <p style={{ color: '#7EB8D4', fontSize: 14, lineHeight: 1.65 }}>
                        {feat.desc}
                      </p>
                    </div>
                  </div>

                  {/* Bottom accent line */}
                  <div
                    className="mt-5 h-px rounded-full"
                    style={{ background: `linear-gradient(90deg, ${feat.accent}40, transparent)` }}
                  />
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p style={{ color: '#00C2FF', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', marginBottom: 12 }}>
              TECHNOLOGY STACK
            </p>
            <h2
              className="text-3xl md:text-4xl font-black"
              style={{
                color: '#E8F4FF',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Built With
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {techStack.map((tech, i) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, type: 'spring', bounce: 0.3 }}
              >
                <GlassCard className="p-6 text-center">
                  <tech.icon
                    className="mx-auto mb-3 text-3xl"
                    style={{ color: tech.color }}
                  />
                  <p className="font-bold text-sm" style={{ color: '#E8F4FF', marginBottom: 4 }}>
                    {tech.name}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom spacer for status bar */}
      <div style={{ height: 60 }} />

      {/* ── STATUS BAR ──────────────────────────────────────── */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: 'rgba(6, 15, 30, 0.92)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,194,255,0.15)',
        }}
      >
        <span style={{ color: '#2A4A6A', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }}>
          AEROTWIN · BUILD 1.0 · IIC 3.0 MU JAIPUR
        </span>

        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{
              background:
                backendStatus === 'connected' ? '#00FF88' :
                backendStatus === 'checking'   ? '#FBBF24' : '#FF453A',
            }}
            animate={backendStatus !== 'connected' ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ color: '#4A7A9B', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em' }}>
            {backendStatus === 'connected'    ? 'Backend Connected · Socket.IO Active' :
             backendStatus === 'checking'     ? 'Establishing connection…' :
                                               'Awaiting server on :5000'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <BsCpu style={{ color: '#2A4A6A', fontSize: 12 }} />
          <span style={{ color: '#2A4A6A', fontSize: 11, fontFamily: 'monospace' }}>
            {(Math.random() * 0.3 + 0.6).toFixed(1)}ms
          </span>
        </div>
      </motion.div>
    </div>
  );
}