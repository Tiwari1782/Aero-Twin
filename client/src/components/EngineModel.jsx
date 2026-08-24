import { useRef, useEffect, Suspense, useCallback, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Health → color tier ─────────────────────────────────────────────────── */
function getHealthTier(health) {
  if (health === null || health === undefined) return 'nominal';
  if (health > 70)  return 'nominal';
  if (health > 40)  return 'caution';
  if (health > 20)  return 'warning';
  return 'critical';
}

const TIER_COLORS = {
  nominal:  { hex: '#00FF88', emissiveHex: '#000000', emissiveIntensity: 0     },
  caution:  { hex: '#FFA500', emissiveHex: '#FF6600', emissiveIntensity: 0.08  },
  warning:  { hex: '#FF4444', emissiveHex: '#FF2222', emissiveIntensity: 0.12  },
  critical: { hex: '#FF0000', emissiveHex: '#FF0000', emissiveIntensity: 0.45  },
};

/* Pre-build Three.js Color objects once — reuse every frame */
const COLOR_CACHE = Object.fromEntries(
  Object.entries(TIER_COLORS).map(([tier, v]) => [
    tier,
    {
      color:   new THREE.Color(v.hex),
      emissive: new THREE.Color(v.emissiveHex),
      emissiveIntensity: v.emissiveIntensity,
    },
  ])
);

/* ─── Inner 3-D mesh component ────────────────────────────────────────────── */
function EngineMesh({ turbineHealth }) {
  const groupRef       = useRef();
  const accentMeshes   = useRef([]);   // ← cached refs to accent-yellow meshes only
  const currentTier    = useRef(null); // ← tracks last applied tier to skip no-ops
  const { scene }      = useGLTF('/assets/engine/scene.gltf');

  /* ── One-time setup: clone scene + cache accent-yellow mesh refs ── */
  useEffect(() => {
    if (!scene || !groupRef.current) return;

    /* Clear previous children */
    while (groupRef.current.children.length) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    const cloned = scene.clone(true);

    /* Walk ONCE — clone materials, cache accent-yellow meshes */
    const found = [];
    cloned.traverse((node) => {
      if (!node.isMesh) return;
      node.material = node.material.clone(); // isolate from GLTF cache
      if (node.material.name === 'accent-yellow') {
        found.push(node);
      }
    });

    accentMeshes.current = found;
    currentTier.current  = null; // force first color apply
    groupRef.current.add(cloned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  /* ── Apply color ONLY when tier changes ── */
  const applyColor = useCallback((health) => {
    const tier = getHealthTier(health);
    if (tier === currentTier.current) return; // same tier → no work
    currentTier.current = tier;

    const { color, emissive, emissiveIntensity } = COLOR_CACHE[tier];

    accentMeshes.current.forEach((mesh) => {
      mesh.material.color.copy(color);
      if (mesh.material.emissive) mesh.material.emissive.copy(emissive);
      mesh.material.emissiveIntensity = emissiveIntensity;
      // NOTE: DO NOT set needsUpdate=true for color-only changes.
      // needsUpdate triggers full shader recompile — very expensive.
    });
  }, []);

  /* ── Run on health prop change ── */
  useEffect(() => {
    applyColor(turbineHealth);
  }, [turbineHealth, applyColor]);

  /* ── Smooth auto-rotation — purely GPU side, no JS overhead ── */
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.22;
  });

  return (
    <group
      ref={groupRef}
      scale={[1.15, 1.15, 1.15]}
      position={[0, -0.1, 0]}
      rotation={[0.08, 0, 0]}
    />
  );
}

/* ─── Wire-frame loading spinner ─────────────────────────────────────────── */
function EngineLoader() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.8;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.55, 0.18, 16, 50]} />
      <meshStandardMaterial color="#00C2FF" wireframe />
    </mesh>
  );
}

/* ─── DOM health badge ────────────────────────────────────────────────────── */
function HealthBadge({ label, value }) {
  const tier = getHealthTier(value);
  const { hex } = TIER_COLORS[tier];
  const val    = value !== null && value !== undefined ? Math.round(value) : '---';
  const STATUS = { nominal: 'NOMINAL', caution: 'CAUTION', warning: 'WARNING', critical: 'CRITICAL' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{
        color: '#4A7A9B', fontSize: 8, fontWeight: 700,
        letterSpacing: '0.12em', fontFamily: 'monospace',
      }}>
        {label}
      </span>
      <div style={{
        background: `${hex}18`,
        border: `1px solid ${hex}55`,
        borderRadius: 6, padding: '3px 9px',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: hex, boxShadow: `0 0 6px ${hex}`, flexShrink: 0,
        }} />
        <span style={{ color: hex, fontSize: 13, fontWeight: 900, fontFamily: 'monospace' }}>
          {val}%
        </span>
      </div>
      <span style={{
        color: hex, fontSize: 7, fontWeight: 800,
        letterSpacing: '0.14em', fontFamily: 'monospace', opacity: 0.75,
      }}>
        {STATUS[tier]}
      </span>
    </div>
  );
}

/* ─── Exported component ──────────────────────────────────────────────────── */
export default function EngineModel({
  turbineHealth    = null,
  compressorHealth = null,
  bearingHealth    = null,
  onClick          = null,   // ← new: triggers expand modal
}) {
  const isCritical = turbineHealth !== null && turbineHealth <= 20;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: 260 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >

      <Canvas
        camera={{ position: [0, 0.5, 3.4], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        frameloop="always"    /* keep RAF running — avoids startup stutter */
        dpr={[1, 1.5]}        /* cap pixel ratio for performance */
        shadows={false}       /* shadows off — not needed here */
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]}   intensity={1.3} />
        <directionalLight position={[-5, 3, -5]} intensity={0.45} color="#00C2FF" />
        <pointLight       position={[0, 2, 3]}   intensity={0.65} color="#ffffff" />

        {/* Critical-mode red glow */}
        {isCritical && (
          <pointLight position={[0, 0, 0]} intensity={2} color="#FF0000" distance={4} decay={2} />
        )}

        <Environment preset="city" />

        <Suspense fallback={<EngineLoader />}>
          {/* Only turbineHealth drives material color per spec */}
          <EngineMesh turbineHealth={turbineHealth} />
        </Suspense>

        <ContactShadows
          position={[0, -1.05, 0]}
          opacity={0.22}
          scale={4}
          blur={2.5}
          far={1.5}
          frames={1}          /* render shadow once, not every frame */
          color="#000814"
        />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={1.5}
          maxDistance={7}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI * 0.72}
        />
      </Canvas>

      {/* Health badges */}
      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 20,
        pointerEvents: 'none',
      }}>
        <HealthBadge label="TURBINE"    value={turbineHealth} />
        <HealthBadge label="COMPRESSOR" value={compressorHealth} />
        <HealthBadge label="BEARING"    value={bearingHealth} />
      </div>

      {/* Corner label */}
      <div style={{
        position: 'absolute', top: 10, left: 12,
        color: 'rgba(0,194,255,0.45)',
        fontSize: 8, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.18em',
        pointerEvents: 'none',
      }}>
        CFM56 TWIN-SPOOL · LIVE 3D
      </div>

      {/* Drag hint */}
      <div style={{
        position: 'absolute', top: 10, right: 12,
        color: 'rgba(74,122,155,0.45)',
        fontSize: 7, fontFamily: 'monospace', letterSpacing: '0.1em',
        pointerEvents: 'none',
      }}>
        DRAG · SCROLL TO ZOOM
      </div>

      {/* Expand-on-click hover hint */}
      {onClick && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}>
          <div style={{
            background: 'rgba(0,194,255,0.12)',
            border: '1px solid rgba(0,194,255,0.3)',
            borderRadius: 8, padding: '5px 14px',
            color: '#00C2FF', fontSize: 9, fontWeight: 800,
            fontFamily: 'monospace', letterSpacing: '0.15em',
            backdropFilter: 'blur(4px)',
          }}>
            ⤢ CLICK TO EXPAND
          </div>
        </div>
      )}
    </div>
  );
}

useGLTF.preload('/assets/engine/scene.gltf');

