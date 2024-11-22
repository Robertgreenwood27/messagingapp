import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        ripple: {
          '0%': {
            transform: 'scale(0) translate(-50%, -50%)',
            opacity: '0.4',
          },
          '100%': {
            transform: 'scale(1) translate(-50%, -50%)',
            opacity: '0',
          }
        }
      },
      animation: {
        ripple: 'ripple 2s ease-out forwards',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;