/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 主色调：禅意医疗治愈风
        cream: {
          50: "#FDFBF7",
          100: "#F8F5F0", // 主背景
          200: "#F1ECE3",
          300: "#E8E0D5", // 卡片背景
          400: "#D9CFBE",
        },
        sage: {
          50: "#F0F4F1",
          100: "#DDE8E1",
          200: "#B7CDC0",
          300: "#9DB9A2",
          400: "#7A9B7E", // 鼠尾草绿
          500: "#5A8060",
          600: "#466B4C",
          700: "#365439",
        },
        teal: {
          50: "#EAF5F4",
          100: "#C8E5E2",
          200: "#8FC9C4",
          300: "#5DA8A2",
          400: "#3E847E",
          500: "#2D5F5D", // 深青主色
          600: "#234A48",
          700: "#1A3635",
        },
        clay: {
          50: "#FBF1ED",
          100: "#F5DAD0",
          200: "#EAB59F",
          300: "#E08E6F",
          400: "#D97757", // 陶土橙预警
          500: "#B85A3D",
          600: "#8E4530",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 4px 16px -2px rgba(45, 95, 93, 0.06)",
        "soft-lg": "0 12px 32px -4px rgba(45, 95, 93, 0.1)",
        "soft-inner": "inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
