import { useRef, useEffect, useCallback, Suspense, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  Environment,
  Html,
  ContactShadows,
} from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { FiX, FiCpu, FiZap, FiThermometer, FiActivity } from "react-icons/fi";
import { GiTurbine, GiGearHammer, GiCircuitry } from "react-icons/gi";

/* health tier */
function getHealthTier(v) {
  if (v === null || v === undefined) return "nominal";
  if (v > 70) return "nominal";
  if (v > 40) return "caution";
  if (v > 20) return "warning";
  return "critical";
}

const TIER = {
  nominal:  { hex: "#00FF88", label: "NOMINAL",  bg: "rgba(0,255,136,0.08)",  border: "rgba(0,255,136,0.25)"  },
  caution:  { hex: "#FFA500", label: "CAUTION",  bg: "rgba(255,165,0,0.08)",  border: "rgba(255,165,0,0.25)"  },
  warning:  { hex: "#FF4444", label: "WARNING",  bg: "rgba(255,68,68,0.08)",  border: "rgba(255,68,68,0.25)"  },
  critical: { hex: "#FF0000", label: "CRITICAL", bg: "rgba(255,0,0,0.10)",    border: "rgba(255,0,0,0.35)"    },
};

const COLOR_CACHE = Object.fromEntries(
  [
    ["nominal",  { hex: "#00FF88", emHex: "#000000", emI: 0 }],
    ["caution",  { hex: "#FFA500", emHex: "#FF6600", emI: 0.08 }],
    ["warning",  { hex: "#FF4444", emHex: "#FF2222", emI: 0.12 }],
    ["critical", { hex: "#FF0000", emHex: "#FF0000", emI: 0.45 }],
  ].map(([t, v]) => [t, {
    color:    new THREE.Color(v.hex),
    emissive: new THREE.Color(v.emHex),
    emissiveIntensity: v.emI,
  }])
);

const COMP_CONFIG = {
  turbine_blade: {
    label: "Turbine Blade",
    Icon:  GiTurbine,
    labelPos:    [1.6,  0.5,  0],
    focusTarget: new THREE.Vector3(1.2, 0, 0),
    focusCamera: new THREE.Vector3(1.2, 0.4, 3.5),
    ringPos:     [1.4, -0.1,  0],
  },
  compressor: {
    label: "Compressor",
    Icon:  GiGearHammer,
    labelPos:    [0.1,  0.5,  0],
    focusTarget: new THREE.Vector3(0.1, 0, 0),
    focusCamera: new THREE.Vector3(0.1, 0.4, 3.5),
    ringPos:     [0.1, -0.1,  0],
  },
  bearing: {
    label: "Bearing Housing",
    Icon:  GiCircuitry,
    labelPos:    [-1.3, 0.5,  0],
    focusTarget: new THREE.Vector3(-1.1, 0, 0),
    focusCamera: new THREE.Vector3(-1.1, 0.4, 3.5),
    ringPos:     [-1.1, -0.1, 0],
  },
};

/* Pulse ring */
function PulseRing({ position, color, active }) {
  const ref      = useRef();
  const scaleRef = useRef(1);
  const opacRef  = useRef(1);
  useFrame((_, delta) => {
    if (!ref.current || !active) return;
    scaleRef.current += delta * 0.8;
    opacRef.current   = Math.max(0, 1 - (scaleRef.current - 1) / 1.5);
    if (scaleRef.current > 2.5) { scaleRef.current = 1; opacRef.current = 1; }
    ref.current.scale.setScalar(scaleRef.current);
    ref.current.material.opacity = opacRef.current * 0.65;
  });
  if (!active) return null;
  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.22, 0.011, 12, 60]} />
      <meshBasicMaterial color={color} transparent opacity={0.65} depthWrite={false} />
    </mesh>
  );
}

/* Engine mesh */
function EngineMesh3D({ turbineHealth }) {
  const groupRef     = useRef();
  const accentMeshes = useRef([]);
  const currentTier  = useRef(null);
  const { scene }    = useGLTF("/assets/engine/scene.gltf");

  useEffect(() => {
    if (!scene || !groupRef.current) return;
    while (groupRef.current.children.length) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    const cloned = scene.clone(true);
    const found  = [];
    cloned.traverse((node) => {
      if (!node.isMesh) return;
      node.material = node.material.clone();
      if (node.material.name === "accent-yellow") found.push(node);
    });
    accentMeshes.current = found;
    currentTier.current  = null;
    groupRef.current.add(cloned);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const applyColor = useCallback((health) => {
    const tier = getHealthTier(health);
    if (tier === currentTier.current) return;
    currentTier.current = tier;
    const { color, emissive, emissiveIntensity } = COLOR_CACHE[tier];
    accentMeshes.current.forEach((mesh) => {
      mesh.material.color.copy(color);
      if (mesh.material.emissive) mesh.material.emissive.copy(emissive);
      mesh.material.emissiveIntensity = emissiveIntensity;
    });
  }, []);

  useEffect(() => { applyColor(turbineHealth); }, [turbineHealth, applyColor]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.18;
  });

  return (
    <group
      ref={groupRef}
      scale={[0.82, 0.82, 0.82]}
      position={[0, -0.08, 0]}
      rotation={[0.05, 0, 0]}
    />
  );
}

/* Loading fallback */
function Loader3D() {
  const r = useRef();
  useFrame((_, d) => { if (r.current) r.current.rotation.y += d * 2; });
  return (
    <mesh ref={r}>
      <torusGeometry args={[0.55, 0.18, 16, 50]} />
      <meshStandardMaterial color="#00C2FF" wireframe />
    </mesh>
  );
}

/* Radial SVG gauge */
function RadialGauge({ value, color, size = 72 }) {
  const pct  = Math.max(0, Math.min(100, value ?? 0));
  const r    = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dasharray 0.8s ease" }}
      />
    </svg>
  );
}

function SensorCell({ icon: Icon, label, value, unit, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", borderRadius: 8,
      padding: "6px 8px", textAlign: "center",
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <Icon style={{ color, fontSize: 11, marginBottom: 2 }} />
      <div style={{ color: "#E8F4FF", fontSize: 10, fontWeight: 800, fontFamily: "monospace" }}>
        {value}{unit && <span style={{ color: "#4A7A9B", fontSize: 8 }}> {unit}</span>}
      </div>
      <div style={{ color: "#4A7A9B", fontSize: 7, fontWeight: 700, letterSpacing: "0.1em" }}>{label}</div>
    </div>
  );
}

function CompDetailCard({ compId, healthData, sensorData, selected, onClick }) {
  const cfg    = COMP_CONFIG[compId];
  const health = healthData?.health_score ?? 100;
  const rul    = healthData?.predicted_rul ?? 0;
  const fat    = healthData?.fatigue_score ?? 0;
  const tier   = getHealthTier(health);
  const t      = TIER[tier];
  const Icon   = cfg.Icon;
  const temp   = sensorData?.temperature;
  const vib    = sensorData?.vibration;
  const rpm    = sensorData?.rpm;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      style={{
        background:   selected ? t.bg                   : "rgba(255,255,255,0.025)",
        border:       `1px solid ${selected ? t.border : "rgba(0,194,255,0.1)"}`,
        borderRadius: 14, padding: "14px 16px",
        cursor: "pointer", transition: "all 0.25s ease",
        boxShadow: selected ? `0 0 18px ${t.hex}22` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${t.hex}14`, border: `1px solid ${t.hex}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ color: t.hex, fontSize: 15 }} />
          </div>
          <div>
            <div style={{ color: "#E8F4FF", fontSize: 11, fontWeight: 700 }}>{cfg.label}</div>
            <div style={{ color: "#4A7A9B", fontSize: 8, fontWeight: 600, letterSpacing: "0.1em" }}>
              {compId.replace("_", " ").toUpperCase()}
            </div>
          </div>
        </div>
        <div style={{
          background: t.bg, border: `1px solid ${t.border}`,
          borderRadius: 6, padding: "2px 8px",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.hex, boxShadow: `0 0 5px ${t.hex}` }} />
          <span style={{ color: t.hex, fontSize: 8, fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.1em" }}>
            {t.label}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <RadialGauge value={health} color={t.hex} size={68} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            transform: "rotate(90deg)",
          }}>
            <span style={{ color: t.hex, fontSize: 14, fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
              {Math.round(health)}
            </span>
            <span style={{ color: "#4A7A9B", fontSize: 7, fontWeight: 700, letterSpacing: "0.08em" }}>HEALTH</span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ color: "#4A7A9B", fontSize: 8, fontWeight: 600, letterSpacing: "0.08em" }}>RUL</span>
              <span style={{ color: "#E8F4FF", fontSize: 9, fontWeight: 800, fontFamily: "monospace" }}>{Math.round(rul)} hrs</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                width: `${Math.min(100, (rul / 800) * 100)}%`,
                background: `linear-gradient(90deg, ${t.hex}88, ${t.hex})`,
                transition: "width 0.8s ease",
              }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ color: "#4A7A9B", fontSize: 8, fontWeight: 600, letterSpacing: "0.08em" }}>FATIGUE</span>
              <span style={{ color: "#E8F4FF", fontSize: 9, fontWeight: 800, fontFamily: "monospace" }}>{fat.toFixed(1)}%</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                width: `${Math.min(100, fat)}%`,
                background: "linear-gradient(90deg, #FF4444aa, #FF0000)",
                transition: "width 0.8s ease",
              }} />
            </div>
          </div>
        </div>
      </div>

      {(temp !== undefined || vib !== undefined || rpm !== undefined) && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6,
          borderTop: "1px solid rgba(0,194,255,0.08)", paddingTop: 10,
        }}>
          {temp !== undefined && <SensorCell icon={FiThermometer} label="TEMP" value={Math.round(temp)} unit="K"  color="#FF9500" />}
          {vib  !== undefined && <SensorCell icon={FiActivity}    label="VIB"  value={vib.toFixed(1)}   unit="g"  color="#00C2FF" />}
          {rpm  !== undefined && <SensorCell icon={FiZap}         label="RPM"  value={Math.round(rpm).toLocaleString()} unit="" color="#00FF88" />}
        </div>
      )}
    </motion.div>
  );
}

/* ── Main export ── */
export default function EngineExpandModal({
  isOpen,
  onClose,
  turbineHealth    = null,
  compressorHealth = null,
  bearingHealth    = null,
  healthData       = {},
  sensorData       = {},
  flightHour       = 0,
}) {
  const [focusedComp, setFocusedComp] = useState(null);
  const orbitRef = useRef();

  const healthMap = {
    turbine_blade: turbineHealth,
    compressor:    compressorHealth,
    bearing:       bearingHealth,
  };

  /* Escape to close */
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  useEffect(() => { if (!isOpen) setFocusedComp(null); }, [isOpen]);

  /* Camera focus via OrbitControls ref — does NOT break scroll zoom */
  const handleFocusComp = (compId) => {
    const next = focusedComp === compId ? null : compId;
    setFocusedComp(next);

    const controls = orbitRef.current;
    if (!controls) return;

    if (!next) {
      /* reset to overview */
      controls.object.position.set(0, 0.3, 5.5);
      controls.target.set(0, 0, 0);
    } else {
      const cfg = COMP_CONFIG[next];
      controls.object.position.copy(cfg.focusCamera);
      controls.target.copy(cfg.focusTarget);
    }
    controls.update();
  };

  const worstHealth = Math.min(turbineHealth ?? 100, compressorHealth ?? 100, bearingHealth ?? 100);
  const overallTier = getHealthTier(worstHealth);
  const overallT    = TIER[overallTier];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="emodal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            backdropFilter: "blur(10px)",
            background: "rgba(0,0,0,0.82)",
            display: "flex",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="emodal-inner"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            style={{
              flex: 1, display: "flex", margin: 16,
              borderRadius: 20, overflow: "hidden",
              background: "linear-gradient(135deg, rgba(6,15,30,0.97) 0%, rgba(3,7,18,0.99) 100%)",
              border: `1px solid ${overallT.border}`,
              boxShadow: `0 30px 100px rgba(0,0,0,0.7), 0 0 50px ${overallT.hex}18`,
              position: "relative",
            }}
          >
            {/* top glow line */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1, zIndex: 10,
              background: `linear-gradient(90deg, transparent, ${overallT.hex}55, transparent)`,
              pointerEvents: "none",
            }} />

            {/* LEFT 65% — 3D canvas */}
            <div style={{ flex: "0 0 65%", position: "relative", borderRight: "1px solid rgba(0,194,255,0.08)" }}>

              {/* header */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, zIndex: 5,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px",
                background: "linear-gradient(180deg, rgba(3,7,18,0.85) 0%, transparent 100%)",
                pointerEvents: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FiCpu style={{ color: "#00C2FF", fontSize: 13 }} />
                  <span style={{ color: "#4A7A9B", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", fontFamily: "monospace" }}>
                    ENGINE DIGITAL TWIN — EXPANDED VIEW
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#4A7A9B", fontSize: 8, fontFamily: "monospace" }}>
                    FH <span style={{ color: "#00C2FF", fontWeight: 900 }}>{Math.round(flightHour)}</span>
                  </span>
                  <div style={{
                    background: overallT.bg, border: `1px solid ${overallT.border}`,
                    borderRadius: 6, padding: "2px 8px",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: overallT.hex, boxShadow: `0 0 6px ${overallT.hex}` }} />
                    <span style={{ color: overallT.hex, fontSize: 8, fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.1em" }}>
                      {overallT.label}
                    </span>
                  </div>
                </div>
              </div>

              <Canvas
                camera={{ position: [0, 0.3, 5.5], fov: 50 }}
                gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                style={{ width: "100%", height: "100%", background: "transparent" }}
                frameloop="always"
                dpr={[1, 1.5]}
              >
                <ambientLight intensity={0.45} />
                <directionalLight position={[5, 8, 5]}   intensity={1.4} />
                <directionalLight position={[-5, 3, -5]} intensity={0.5}  color="#00C2FF" />
                <pointLight       position={[0, 2, 3]}   intensity={0.7}  color="#ffffff" />
                {overallTier === "critical" && (
                  <pointLight position={[0, 0, 0]} intensity={2} color="#FF0000" distance={5} decay={2} />
                )}

                <Environment preset="warehouse" />

                <Suspense fallback={<Loader3D />}>
                  <EngineMesh3D turbineHealth={turbineHealth} />

                  {/* HTML labels */}
                  {Object.entries(COMP_CONFIG).map(([compId, cfg]) => {
                    const h    = healthMap[compId];
                    const tier = getHealthTier(h);
                    const t    = TIER[tier];
                    return (
                      <Html
                        key={compId}
                        position={cfg.labelPos}
                        center
                        distanceFactor={5}
                        occlude={false}
                        style={{ pointerEvents: "none" }}
                      >
                        <div style={{
                          background: `${t.hex}14`,
                          border: `1px solid ${t.hex}44`,
                          borderRadius: 6, padding: "4px 10px",
                          whiteSpace: "nowrap",
                          backdropFilter: "blur(6px)",
                          position: "relative",
                        }}>
                          <div style={{ color: t.hex, fontSize: 9, fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.1em" }}>
                            {cfg.label.toUpperCase()}
                          </div>
                          <div style={{ color: "#E8F4FF", fontSize: 12, fontWeight: 900, fontFamily: "monospace", textAlign: "center" }}>
                            {h !== null && h !== undefined ? `${Math.round(h)}%` : "--"}
                          </div>
                          <div style={{ color: t.hex, fontSize: 7, fontWeight: 700, fontFamily: "monospace", textAlign: "center", opacity: 0.8 }}>
                            {t.label}
                          </div>
                          <div style={{
                            position: "absolute", bottom: -8, left: "50%",
                            transform: "translateX(-50%)",
                            width: 1, height: 8, background: `${t.hex}55`,
                          }} />
                        </div>
                      </Html>
                    );
                  })}

                  {/* Pulse rings */}
                  {Object.entries(COMP_CONFIG).map(([compId, cfg]) => {
                    const h    = healthMap[compId];
                    const tier = getHealthTier(h);
                    return (
                      <PulseRing
                        key={compId}
                        position={cfg.ringPos}
                        color={TIER[tier].hex}
                        active={h !== null && h <= 70}
                      />
                    );
                  })}
                </Suspense>

                <ContactShadows
                  position={[0, -1.05, 0]}
                  opacity={0.2}
                  scale={5}
                  blur={3}
                  far={1.5}
                  frames={1}
                  color="#000814"
                />

                {/* OrbitControls with ref — zoom works, focus via ref.update() */}
                <OrbitControls
                  ref={orbitRef}
                  enablePan={false}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={2}
                  maxDistance={12}
                  minPolarAngle={Math.PI / 10}
                  maxPolarAngle={Math.PI * 0.75}
                  zoomSpeed={1.2}
                  rotateSpeed={0.8}
                />
              </Canvas>

              {/* bottom hints */}
              <div style={{
                position: "absolute", bottom: 12, left: 0, right: 0,
                display: "flex", justifyContent: "center", gap: 20,
                pointerEvents: "none",
              }}>
                {["DRAG TO ROTATE", "SCROLL TO ZOOM", "CLICK CARD TO FOCUS"].map((h) => (
                  <span key={h} style={{ color: "rgba(74,122,155,0.35)", fontSize: 7, fontFamily: "monospace", letterSpacing: "0.1em" }}>
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT 35% — detail panel */}
            <div style={{
              flex: "0 0 35%", display: "flex", flexDirection: "column",
              overflowY: "auto", padding: "14px 16px", gap: 10,
            }}>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div>
                  <div style={{ color: "#E8F4FF", fontSize: 13, fontWeight: 800 }}>Engine Health Monitor</div>
                  <div style={{ color: "#4A7A9B", fontSize: 9, letterSpacing: "0.1em", fontFamily: "monospace", marginTop: 1 }}>
                    CFM56 TWIN-SPOOL • LIVE TELEMETRY
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#4A7A9B", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <FiX size={16} />
                </motion.button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ height: 1, flex: 1, background: "rgba(0,194,255,0.1)" }} />
                <span style={{ color: "#4A7A9B", fontSize: 8, fontWeight: 700, letterSpacing: "0.15em", fontFamily: "monospace" }}>
                  COMPONENT STATUS — CLICK TO FOCUS
                </span>
                <div style={{ height: 1, flex: 1, background: "rgba(0,194,255,0.1)" }} />
              </div>

              {Object.keys(COMP_CONFIG).map((compId) => (
                <CompDetailCard
                  key={compId}
                  compId={compId}
                  healthData={healthData[compId]}
                  sensorData={sensorData[compId]}
                  selected={focusedComp === compId}
                  onClick={() => handleFocusComp(compId)}
                />
              ))}

              <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid rgba(0,194,255,0.08)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {[
                    { label: "FLIGHT HRS",   value: Math.round(flightHour),          unit: "h",  color: "#00C2FF"    },
                    { label: "WORST HEALTH", value: `${Math.round(worstHealth)}%`,   unit: "",   color: overallT.hex },
                    { label: "SYSTEM",       value: overallT.label,                  unit: "",   color: overallT.hex },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(0,194,255,0.08)",
                      borderRadius: 10, padding: "8px 10px", textAlign: "center",
                    }}>
                      <div style={{ color, fontSize: 13, fontWeight: 900, fontFamily: "monospace", lineHeight: 1 }}>
                        {value}<span style={{ fontSize: 9 }}>{unit}</span>
                      </div>
                      <div style={{ color: "#4A7A9B", fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", marginTop: 3 }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
