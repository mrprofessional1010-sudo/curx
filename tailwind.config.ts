import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: "#06080B",
        "surface-dark": "#0B0F14",
        "surface-card": "rgba(16, 22, 30, 0.75)",
        "surface-border": "rgba(255, 255, 255, 0.08)",
        "curx-cyan": "#00F0D0",
        "curx-cyan-dim": "rgba(0, 240, 208, 0.15)",
        "curx-amber": "#FFB020",
        "curx-orange": "#FF6B00",
        "curx-red": "#E63946",
        "curx-text-dim": "#8E9BAE",
      },
      fontFamily: {
        sans: ['var(--font-sans)', '"Plus Jakarta Sans"', 'sans-serif'],
        display: ['var(--font-display)', '"Space Grotesk"', 'sans-serif'],
        mono: ['var(--font-mono)', '"JetBrains Mono"', 'monospace'],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 30s linear infinite",
        "spin-reverse": "spin 24s linear infinite reverse",
        float: "float 6s ease-in-out infinite",
        radar: "radar 3s ease-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        radar: {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
