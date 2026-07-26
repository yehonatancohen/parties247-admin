/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}", 
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/services/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Historically a jungle/green theme; remapped to a neutral, dark
        // "professional dashboard" palette (slate, not green). Class names
        // (jungle-*, wood-brown) are kept as-is across components so this
        // file is the single place that controls the admin's look.
        'jungle-deep': '#0f172a',    // page background (slate-900)
        'jungle-surface': '#1e293b', // card/panel background (slate-800)
        'jungle-accent': '#3b82f6',  // primary accent (blue-500)
        'jungle-lime': '#38bdf8',    // secondary accent / highlights (sky-400)
        'jungle-text': '#cbd5e1',    // body text (slate-300)
        'wood-brown': '#334155',     // subtle borders (slate-700)
      },
      fontFamily: {
        sans: ['var(--font-assistant)', '"Assistant"', 'sans-serif'],
        display: ['var(--font-assistant)', '"Assistant"', 'sans-serif'],
      },
      boxShadow: {
        'jungle-glow': '0 0 0 1px rgba(59, 130, 246, 0.15)',
      },
    },
  },
  plugins: [],
};