import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F3F5F4",
        surface: "#FFFFFF",
        line: "#DDE4E1",
        ink: "#13201D",
        muted: "#5C6B67",
        faint: "#8C9A96",
        teal: {
          DEFAULT: "#0B7C73",
          dark: "#075C56",
          light: "#E3F1EF",
        },
        amber: {
          DEFAULT: "#B6651B",
          light: "#F6E9DC",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(19, 32, 29, 0.04), 0 1px 0 rgba(19, 32, 29, 0.03)",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
        riseIn: "riseIn 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
