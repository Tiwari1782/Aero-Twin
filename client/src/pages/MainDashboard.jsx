import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useState, createElement } from 'react';
import { FiRefreshCw, FiAlertTriangle, FiActivity, FiUploadCloud, FiBarChart2, FiDownload } from 'react-icons/fi';
import { BsCpu } from 'react-icons/bs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import AnimatedCounter from '../components/AnimatedCounter';
import ComponentHealthCard from '../components/ComponentHealthCard';
import FatigueLineChart from '../components/FatigueLineChart';
import TemperatureAreaChart from '../components/TemperatureAreaChart';
import AlertPanel from '../components/AlertPanel';
import TelemetryGrid from '../components/TelemetryGrid';
import ComponentDetailModal from '../components/ComponentDetailModal';
import CSVUploadModal from '../components/CSVUploadModal';
import SystemDiagnostics from '../components/SystemDiagnostics';
import EngineModel from '../components/EngineModel';
import EngineExpandModal from '../components/EngineExpandModal';

const API_URL    = 'http://localhost:5000';
const COMPONENTS = ['turbine_blade', 'compressor', 'bearing'];

const C = {
  blue:   '#00C2FF',
  green:  '#00FF88',
  amber:  '#FBBF24',
  muted:  '#4A7A9B',
  border: 'rgba(0,194,255,0.12)',
};

/* Reusable glass panel wrapper */
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
      {/* Top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,194,255,0.3), transparent)' }} />
      {children}
    </div>
  );
}

export default function MainDashboard() {
  const socket = useOutletContext();
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState('telemetry');
  const [showEngineModal, setShowEngineModal] = useState(false);

  const handleReset = async () => {
    try {
      await axios.post(`${API_URL}/api/reset`);
      toast.success('Simulation reset to baseline', { id: 'reset' });
    } catch {
      toast.error('Reset failed');
    }
  };

  const handleInjectAnomaly = async () => {
    try {
      await axios.post(`${API_URL}/api/anomaly`, { type: 'vibration' });
      toast('Anomaly injected — vibration spike', {
        icon: createElement(FiAlertTriangle, { size: 16 }),
        id: 'anomaly',
        style: { borderColor: C.amber },
      });
    } catch {
      toast.error('Anomaly injection failed — must be in LIVE mode');
    }
  };

  const handleExportPDF = async () => {
    const dashboardElement = document.getElementById('dashboard-content');
    if (!dashboardElement) return;

    try {
      toast.loading('Generating PDF...', { id: 'pdf-export' });
      const canvas = await html2canvas(dashboardElement, {
        backgroundColor: '#030712',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`AeroTwin-Report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('PDF Exported', { id: 'pdf-export' });
    } catch {
      toast.error('Failed to export PDF', { id: 'pdf-export' });
    }
  };

  return (
    <div id="dashboard-content" className="flex flex-col gap-3 h-full bg-[#030712] p-1">

      {/* ── Control Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            {/* Left: FH + mode + connection */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <FiActivity style={{ color: C.blue, fontSize: 16 }} />
                <span style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>
                  FLIGHT HOURS
                </span>
                <span style={{ color: C.blue, fontSize: 24, fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                  <AnimatedCounter value={socket.flightHour} duration={0.5} />
                </span>
              </div>

              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: socket.mode === 'live' ? 'rgba(0,255,136,0.08)' : 'rgba(251,191,36,0.08)',
                  border: `1px solid ${socket.mode === 'live' ? 'rgba(0,255,136,0.25)' : 'rgba(251,191,36,0.25)'}`,
                }}
              >
                <BsCpu style={{
                  color: socket.mode === 'live' ? C.green : C.amber,
                  fontSize: 11,
                }} />
                <span style={{
                  color: socket.mode === 'live' ? C.green : C.amber,
                  fontSize: 10, fontWeight: 800, fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                }}>
                  {socket.mode.toUpperCase()}
                </span>
              </div>

              {/* CSV Upload button */}
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 16px rgba(0,194,255,0.25)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(0,194,255,0.08)',
                  border: '1px solid rgba(0,194,255,0.2)',
                  cursor: 'pointer',
                }}
              >
                <FiUploadCloud style={{ color: C.blue, fontSize: 12 }} />
                <span style={{ color: C.blue, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
                  UPLOAD CSV
                </span>
              </motion.button>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-3">
              {/* Tab Selector */}
              <div className="flex items-center bg-[#071325]/60 border border-aero-border/40 rounded-xl p-0.5" style={{ border: '1px solid rgba(0,194,255,0.13)' }}>
                <button
                  onClick={() => setActiveTab('telemetry')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-tech transition-all cursor-pointer ${
                    activeTab === 'telemetry' ? 'text-white bg-aero-blue/20' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  style={{
                    background: activeTab === 'telemetry' ? 'rgba(0,194,255,0.15)' : 'transparent',
                    border: activeTab === 'telemetry' ? '1px solid rgba(0,194,255,0.25)' : '1px solid transparent',
                  }}
                >
                  <FiActivity size={12} />
                  <span>Live Streams</span>
                </button>
                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-tech transition-all cursor-pointer ${
                    activeTab === 'diagnostics' ? 'text-white bg-aero-blue/20' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  style={{
                    background: activeTab === 'diagnostics' ? 'rgba(0,194,255,0.15)' : 'transparent',
                    border: activeTab === 'diagnostics' ? '1px solid rgba(0,194,255,0.25)' : '1px solid transparent',
                  }}
                >
                  <FiBarChart2 size={12} />
                  <span>System Diagnostics</span>
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{
                  background: 'rgba(0,194,255,0.07)',
                  border: '1px solid rgba(0,194,255,0.2)',
                  color: C.muted,
                  fontFamily: 'monospace',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.blue; e.currentTarget.style.borderColor = 'rgba(0,194,255,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = 'rgba(0,194,255,0.2)'; }}
              >
                <FiDownload style={{ fontSize: 13 }} />
                Export PDF
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{
                  background: 'rgba(0,194,255,0.07)',
                  border: '1px solid rgba(0,194,255,0.2)',
                  color: C.muted,
                  fontFamily: 'monospace',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = C.blue; e.currentTarget.style.borderColor = 'rgba(0,194,255,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = 'rgba(0,194,255,0.2)'; }}
              >
                <FiRefreshCw style={{ fontSize: 13 }} />
                Reset
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(251,191,36,0.25)' }}
                whileTap={{ scale: 0.96 }}
                onClick={handleInjectAnomaly}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  color: C.amber,
                  fontFamily: 'monospace',
                }}
              >
                <FiAlertTriangle style={{ fontSize: 13 }} />
                Inject Anomaly
              </motion.button>
            </div>
          </div>
        </GlassPanel>
      </motion.div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 flex-1 min-h-0">

        {/* Left: Component health cards */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto">
          <div className="flex items-center gap-2 px-1">
            <div className="h-px flex-1" style={{ background: C.border }} />
            <span style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em' }}>
              COMPONENT HEALTH
            </span>
            <div className="h-px flex-1" style={{ background: C.border }} />
          </div>

          {COMPONENTS.map((compId, i) => (
            <motion.div
              key={compId}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <ComponentHealthCard
                componentId={compId}
                healthData={socket.healthData[compId]}
                sensorData={socket.sensorData[compId]}
                onClick={() => setSelectedComponent(compId)}
              />
            </motion.div>
          ))}
        </div>

        {activeTab === 'telemetry' ? (
          <>
            {/* Center: 3-D Engine + Charts stacked */}
            <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto">

              {/* ── 3D Engine Model Panel ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <GlassPanel style={{ height: 300 }}>
                  {/* Panel header */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px',
                    background: 'linear-gradient(180deg, rgba(3,7,18,0.6) 0%, transparent 100%)',
                  }}>
                    <span style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                      ENGINE DIGITAL TWIN
                    </span>
                    <span style={{
                      color: C.blue, fontSize: 8, fontWeight: 800, letterSpacing: '0.1em',
                      fontFamily: 'monospace',
                      background: 'rgba(0,194,255,0.08)',
                      border: '1px solid rgba(0,194,255,0.2)',
                      borderRadius: 4, padding: '1px 6px',
                    }}>
                      LIVE
                    </span>
                  </div>

                  {/* Engine canvas */}
                  <EngineModel
                    turbineHealth={socket.healthData?.turbine_blade?.health_score ?? null}
                    compressorHealth={socket.healthData?.compressor?.health_score ?? null}
                    bearingHealth={socket.healthData?.bearing?.health_score ?? null}
                    onClick={() => setShowEngineModal(true)}
                  />
                </GlassPanel>
              </motion.div>

              {/* Charts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex-1"
              >
                <FatigueLineChart healthHistory={socket.healthHistory} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex-1"
              >
                <TemperatureAreaChart sensorHistory={socket.sensorHistory} />
              </motion.div>
            </div>

            {/* Right: Alert panel */}
            <div className="lg:col-span-3 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="h-full"
              >
                <AlertPanel alerts={socket.alerts} />
              </motion.div>
            </div>
          </>
        ) : (
          <div className="lg:col-span-7 overflow-y-auto pr-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <SystemDiagnostics 
                healthHistory={socket.healthHistory}
                healthData={socket.healthData}
                sensorData={socket.sensorData}
              />
            </motion.div>
          </div>
        )}
      </div>

      {/* ── Telemetry Grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <TelemetryGrid sensorData={socket.sensorData} sensorHistory={socket.sensorHistory} />
      </motion.div>

      {/* ── Detail Modal ── */}
      <ComponentDetailModal
        componentId={selectedComponent}
        healthData={socket.healthData[selectedComponent]}
        sensorData={socket.sensorData[selectedComponent]}
        sensorHistory={socket.sensorHistory[selectedComponent] || []}
        healthHistory={socket.healthHistory[selectedComponent] || []}
        onClose={() => setSelectedComponent(null)}
      />

      {/* ── CSV Upload Modal ── */}
      <CSVUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={(data) => {
          console.log('Dataset uploaded:', data);
        }}
      />

      {/* ── Engine Expand Modal ── */}
      <EngineExpandModal
        isOpen={showEngineModal}
        onClose={() => setShowEngineModal(false)}
        turbineHealth={socket.healthData?.turbine_blade?.health_score ?? null}
        compressorHealth={socket.healthData?.compressor?.health_score ?? null}
        bearingHealth={socket.healthData?.bearing?.health_score ?? null}
        healthData={socket.healthData}
        sensorData={socket.sensorData}
        flightHour={socket.flightHour}
      />
    </div>
  );
}
