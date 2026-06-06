/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        base: ["15px", { lineHeight: "1.6" }],
        lg: ["17px", { lineHeight: "1.6" }],
        xl: ["20px", { lineHeight: "1.5" }],
        "2xl": ["24px", { lineHeight: "1.4" }],
        "3xl": ["28px", { lineHeight: "1.3" }],
      },
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#0f2347",
        },
        content: {
          bg: "#dce3ec",
          surface: "#ffffff",
          border: "#c5ced9",
          text: "#1e293b",
          muted: "#475569",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
