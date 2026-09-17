import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Manrope", "Geist", "system-ui", "sans-serif"],
      },
      borderRadius: {
        glass: "24px",
      },
      colors: {
        abyss: "#030014",
        deep: "#07111F",
      },
    },
  },
  plugins: [],
};

export default config;
