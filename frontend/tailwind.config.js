/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '360px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        porcelaine: '#F6F7F5',
        surface: '#FFFFFF',
        'text-primary': '#1B1D1F',
        'text-secondary': '#6B7178',
        accent: '#1F4D3A',
        'accent-light': '#2A6B4F',
        'accent-hover': '#173D2D',
        'brand-orange': '#E8751A',
        'brand-orange-light': '#F5A623',
        'brand-orange-dark': '#C75C0A',
        stock: {
          normal: '#2F7A4D',
          faible: '#B8791A',
          critique: '#C2571F',
          rupture: '#B3402A',
        },
        border: {
          DEFAULT: 'rgba(0,0,0,0.06)',
          dark: 'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        heading: ['Sora', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        button: '10px',
        badge: '6px',
      },
      spacing: {
        sidebar: '260px',
      },
      fontSize: {
        'fluid-xs': 'clamp(0.75rem, 0.7rem + 0.15vw, 0.8rem)',
        'fluid-sm': 'clamp(0.8125rem, 0.75rem + 0.2vw, 0.875rem)',
        'fluid-base': 'clamp(0.875rem, 0.8rem + 0.25vw, 1rem)',
        'fluid-lg': 'clamp(1rem, 0.9rem + 0.35vw, 1.125rem)',
        'fluid-xl': 'clamp(1.125rem, 1rem + 0.5vw, 1.25rem)',
        'fluid-2xl': 'clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)',
        'fluid-3xl': 'clamp(1.5rem, 1.2rem + 1vw, 1.875rem)',
        'fluid-4xl': 'clamp(1.875rem, 1.4rem + 1.5vw, 2.25rem)',
      },
    },
  },
  plugins: [],
}
