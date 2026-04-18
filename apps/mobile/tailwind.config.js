/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
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
