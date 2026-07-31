import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1200px" },
    },
    fontFamily: {
      sans: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
      mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        "surface-muted": "hsl(var(--surface-muted))",
        card: "hsl(var(--surface))",
        "card-foreground": "hsl(var(--foreground))",
        popover: "hsl(var(--surface))",
        "popover-foreground": "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        "accent-muted": "hsl(var(--accent-muted))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        positive: "hsl(var(--positive))",
        negative: "hsl(var(--negative))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--accent) / 0.25), 0 0 24px -6px hsl(var(--accent) / 0.45)",
        "glow-lg":
          "0 0 0 1px hsl(var(--accent) / 0.2), 0 0 48px -12px hsl(var(--accent) / 0.35)",
        inset: "inset 0 1px 0 0 hsl(var(--border))",
      },
      keyframes: {
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        grow: {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.6" },
          "94%": { opacity: "1" },
          "96%": { opacity: "0.85" },
        },
      },
      animation: {
        blink: "blink 1.1s steps(1) infinite",
        grow: "grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        rise: "rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        flicker: "flicker 6s linear infinite",
      },
    },
  },
  plugins: [],
};
