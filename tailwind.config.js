// tailwind.config.js — move all your theme config here
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',      // ✅ scoped to src only
    './*.{ts,tsx}',             // ✅ root level files
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#fafafa',
        foreground: '#0a0a0a',
        card: '#ffffff',
        'card-foreground': '#1a1a1a',
        primary: '#f59e0b',
        'primary-foreground': '#000000',
        muted: '#f5f5f5',
        'muted-foreground': '#525252',
        border: '#e5e5e5',
        skin: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          accent: 'var(--color-text-accent)',
          text: 'var(--color-text-base)',
          'button-text': 'var(--color-button-text)',
          border: 'var(--color-border)',
          hover: 'var(--color-bg-hover)',
        }
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        lora: ['Lora', 'serif'],
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 1s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        pulseGlow: { '0%, 100%': { opacity: '1', boxShadow: '0 0 20px var(--color-primary-glow)' }, '50%': { opacity: '0.8', boxShadow: '0 0 10px var(--color-primary-glow)' } },
      }
    }
  },
  plugins: [],
}
