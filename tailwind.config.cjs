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
        // Historically a jungle/green theme; remapped to a clean, neutral,
        // light "professional dashboard" palette. Class names (jungle-*,
        // wood-brown) are kept as-is across components so this file is the
        // single place that controls the admin's look.
        'jungle-deep': '#f8fafc',   // page background (was near-black)
        'jungle-surface': '#ffffff', // card/panel background (was dark teal)
        'jungle-accent': '#2563eb', // primary accent (was mint green)
        'jungle-lime': '#3b82f6',   // secondary accent / highlights (was lime)
        'jungle-text': '#334155',   // body text (was light mint)
        'wood-brown': '#e2e8f0',    // subtle borders (was dark brown)
      },
      fontFamily: {
        sans: ['var(--font-assistant)', '"Assistant"', 'sans-serif'],
        display: ['var(--font-assistant)', '"Assistant"', 'sans-serif'],
      },
      boxShadow: {
        'jungle-glow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};