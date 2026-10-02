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
        // "Running order" world: ink-indigo ground, hairline grid rules, and
        // exactly three data inks. Legacy class names (jungle-*, wood-brown)
        // stay mapped here so pages not yet rewritten inherit the new look
        // without class edits; this file is the single place that controls it.
        'jungle-deep': '#0E1330',    // page ground
        'jungle-surface': '#161C45', // raised panel
        'jungle-accent': '#4F5FF5',  // primary action (white text passes AA)
        'jungle-lime': '#FFD23F',    // sun-yellow: sales / highlight
        'jungle-text': '#E3E6FF',    // body text on ink
        'wood-brown': '#2A3270',     // hairline rules
        // data inks (one meaning each, everywhere)
        'ink-sales': '#FFD23F',      // confirmed sales + commission
        'ink-click': '#FF6A3D',      // clicks out to GoOut
        'ink-view': '#8E9BFF',       // site views / visits
        'ink-dim': '#A4ABD9',        // secondary text (AA on ground)
        'ink-cell': '#1E2655',       // empty grid cell
      },
      borderRadius: {
        // Square-ish across the admin; legacy rounded-xl/2xl classes shrink with it.
        md: '3px',
        lg: '4px',
        xl: '5px',
        '2xl': '6px',
      },
      boxShadow: {
        lg: 'none',
        xl: 'none',
        'jungle-glow': 'none',
      },
      fontFamily: {
        sans: ['var(--font-rubik)', '"Rubik"', 'sans-serif'],
        display: ['var(--font-rubik)', '"Rubik"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
