import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slatebg: '#0F172A',
        slatepanel: '#1E293B',
        slateelev: '#334155',
        indigoTrust: '#4338CA',
        blueTrust: '#2563EB',
        amberWarn: '#F59E0B',
        pinkAccent: '#EC4899',
        emeraldOk: '#10B981',
        roseError: '#F43F5E',
        offwhite: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 10px 30px rgba(2, 6, 23, 0.35)',
      },
      backgroundImage: {
        trust: 'linear-gradient(135deg, #4338CA 0%, #2563EB 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config
