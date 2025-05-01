import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    fontFamily:{
      'Shantell-Sans':['Shantell Sans','cursive']
    },
    extend: {
      colors:{
        primary:"rgba(var(--primary))",
        "primary-dark":"rgba(var(--primary-dark))",
        secondary:"rgba(var(--secondary))",
        "secondary-dark":"rgba(var(--secondary-dark))",
        "secondary-darker":"rgba(var(--secondary-darker))",
        background:"rgba(var(--background))",
        text:"rgba(var(--text))"
      },
      fontSize: {
        'fluid-h1': 'clamp(2.5rem, 5vw + 1rem, 4rem)',
        'fluid-h2': 'clamp(2rem, 4vw + 1rem, 3rem)',
        'fluid-h3': 'clamp(1.75rem, 3vw + 1rem, 2.5rem)',
        'fluid-h4': 'clamp(2rem, 2.5vw + 1rem, 2.5rem)',
        'fluid-h5': 'clamp(1.25rem, 2vw + 1rem, 1.75rem)',
        'fluid-h6': 'clamp(1rem, 1.5vw + 1rem, 1.5rem)',
        'fluid-p': 'clamp(1rem, .6vw + 0.2rem, 1.25rem)',
      }
    },
  },
  plugins: [],
} satisfies Config;
