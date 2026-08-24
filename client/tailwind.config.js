/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aero-bg': '#030712',
        'aero-panel': '#0D1B2A',
        'aero-border': '#1E3A5F',
        'aero-blue': '#00A8E8',
        'aero-green': '#00FF88',
        'aero-amber': '#FFB800',
        'aero-red': '#FF3B3B',
        'aero-critical': '#FF0000',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-critical': 'pulseCritical 1.5s ease-in-out infinite',
        'radar-sweep': 'radarSweep 6s linear infinite',
        'border-glow': 'borderGlow 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
      },
      keyframes: {
        pulseCritical: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 0, 0, 0.3), inset 0 0 5px rgba(255, 0, 0, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 0, 0, 0.6), inset 0 0 10px rgba(255, 0, 0, 0.3)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        borderGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 168, 232, 0.3), 0 0 10px rgba(0, 168, 232, 0.1)' },
          '50%': { boxShadow: '0 0 15px rgba(0, 168, 232, 0.6), 0 0 30px rgba(0, 168, 232, 0.2)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
