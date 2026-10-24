/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#10B981',
          600: '#059669', // Emerald Commerce Green
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        ink: {
          950: '#0E1318', // Deep organic slate, not harsh pitch black
          900: '#171E26',
          800: '#232C37',
          700: '#354150',
          600: '#4B596A',
          400: '#8A99AC',
          200: '#D5DCE5',
          100: '#ECEFF4',
          50: '#F7F8FA',
        },
        warm: {
          50: '#FAF8F5',  // Warm paper background
          100: '#F4EFEB',
          200: '#E7DDD3',
          300: '#D7C7B7',
          900: '#2C2520',
        },
        alert: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706', // Warm amber for restock dates
          700: '#B45309',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Outfit"', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'elevated': '0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        'card': '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -2px rgba(15, 23, 42, 0.03)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
