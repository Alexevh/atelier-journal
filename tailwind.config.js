/** @type {import('tailwindcss').Config} */
export default {
  // Follow Atelier's own theme switch (it sets data-theme on <html>)
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Preflight OFF: Atelier already ships its own base reset; we only want
  // Tailwind's utilities for the ported Pigment Match components.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--pm-border))',
        input: 'hsl(var(--pm-input))',
        ring: 'hsl(var(--pm-ring))',
        background: 'hsl(var(--pm-background))',
        foreground: 'hsl(var(--pm-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--pm-primary))',
          foreground: 'hsl(var(--pm-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--pm-secondary))',
          foreground: 'hsl(var(--pm-secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--pm-muted))',
          foreground: 'hsl(var(--pm-muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--pm-accent))',
          foreground: 'hsl(var(--pm-accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--pm-card))',
          foreground: 'hsl(var(--pm-card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--pm-radius)',
        md: 'calc(var(--pm-radius) - 2px)',
        sm: 'calc(var(--pm-radius) - 4px)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
