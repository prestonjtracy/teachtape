/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#F25C1F',    // TeachTape Orange
          secondary: '#123A72',  // Navy Blue  
          accent: '#FF8A65',     // Lighter orange for hover
          50: '#FFF3E0',
          100: '#FFE0B2', 
          500: '#F25C1F',
          600: '#E64A19',
          700: '#D84315',
          900: '#BF360C',
        },
        neutral: {
          text: '#111827',
          'text-secondary': '#374151', 
          'text-muted': '#6B7280',
        },
        background: {
          light: '#FFFFFF',
          subtle: '#F8FAFC',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'brand': '10px',
      },
      boxShadow: {
        'brand-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'brand-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}