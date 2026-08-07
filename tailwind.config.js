/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F1729",
          light: "#1A2540",
          soft: "#2A3554",
        },
        porcelain: "#F6F7FB",
        cloud: "#EDEFF6",
        line: "#E2E5F0",
        emerald: {
          DEFAULT: "#00C48C",
          soft: "#D6F5E9",
        },
        coral: {
          DEFAULT: "#FF6B5D",
          soft: "#FFE3E0",
        },
        amber: {
          DEFAULT: "#FFB020",
          soft: "#FFF1D6",
        },
        violet: {
          DEFAULT: "#6C63FF",
          soft: "#E7E5FF",
        },
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 41, 0.04), 0 8px 24px -12px rgba(15, 23, 41, 0.12)",
        cardDark: "0 1px 2px rgba(0,0,0,0.2), 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
