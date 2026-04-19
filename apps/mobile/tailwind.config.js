/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: "#fc4c02",
        bg: "#F2F1EE",
        surface: "#FFFFFF",
        "surface-alt": "#F7F6F3",
        border: "#E2E0DB",
        text: "#1A1916",
        muted: "#6B6A67",
        faint: "#A8A7A3",
        success: "#2D7A1F",
        warning: "#C26020",
        premium: "#6C31B0",
        info: "#4F98A3",
        // Backwards compat
        strava: "#fc4c02",
        slate: {
          900: "#1a1d23",
          700: "#2f3640",
          500: "#5a6068",
        },
      },
    },
  },
  plugins: [],
};
