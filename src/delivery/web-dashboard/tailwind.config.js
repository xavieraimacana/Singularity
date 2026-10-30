/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nebula: {
          950: '#090b10',
          900: '#0f141c',
          850: '#151b26',
          800: '#1c2433',
          700: '#2c374d',
          accent: '#10b981', // Emerald Mission Control
          cyber: '#06b6d4',  // Cyan telemetry
          warning: '#f59e0b',// Amber alert
          danger: '#ef4444', // Red crash
          purple: '#8b5cf6'  // Prism violet
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
};
