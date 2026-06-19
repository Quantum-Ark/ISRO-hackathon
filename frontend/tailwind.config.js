/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sf: {
          bg: '#0D1117',
          surface: '#161B22',
          elevated: '#21262D',
          border: '#30363D',
          'border-focus': '#58A6FF',
          text: '#E6EDF3',
          'text-secondary': '#8B949E',
          'text-muted': '#484F58',
          quiet: '#3FB950',
          watch: '#D29922',
          warning: '#E05C1A',
          active: '#F85149',
          recovery: '#388BFD',
          'soft-xray': '#D79B27',
          'hard-xray': '#5B8DC8',
          hardness: '#56A64B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
