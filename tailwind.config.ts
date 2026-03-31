import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Existing FLIGHTHOUR CSS variable colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // NextAdmin colors
        stroke: "#E6EBF1",
        "stroke-dark": "#27303E",
        "gray-dark": "#122031",
        "dark-2": "#1F2A37",
        "dark-3": "#374151",
        "dark-4": "#4B5563",
        "dark-5": "#6B7280",
        "dark-6": "#9CA3AF",
        green: { DEFAULT: "#219653", light: "#10B981" },
        red: { DEFAULT: "#F23030", light: "#F56060" },
        "orange-light": "#FF9C55",
      },
      boxShadow: {
        "1": "0px 1px 3px 0px rgba(84, 87, 118, 0.12)",
        "2": "0px 2px 4px 0px rgba(84, 87, 118, 0.15)",
        "card": "0px 1px 2px 0px rgba(0, 0, 0, 0.08)",
        "card-2": "0px 8px 13px -3px rgba(0, 0, 0, 0.07)",
        "card-3": "0px 2px 3px 0px rgba(183, 183, 183, 0.50)",
        "switch-1": "0px 0px 4px 0px rgba(0, 0, 0, 0.10)",
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "7.5": "1.875rem",
        "8.5": "2.125rem",
        "10.5": "2.625rem",
        "11.5": "2.875rem",
        "12.5": "3.125rem",
        "13": "3.25rem",
        "14.5": "3.625rem",
        "15": "3.75rem",
      },
      fontSize: {
        "heading-1": ["3.75rem", { lineHeight: "4.5rem", fontWeight: "700" }],
        "heading-2": ["3rem", { lineHeight: "3.625rem", fontWeight: "700" }],
        "heading-3": ["2.5rem", { lineHeight: "3rem", fontWeight: "700" }],
        "heading-4": ["2.1875rem", { lineHeight: "2.8125rem", fontWeight: "700" }],
        "heading-5": ["1.75rem", { lineHeight: "2.5rem", fontWeight: "700" }],
        "heading-6": ["1.5rem", { lineHeight: "1.875rem", fontWeight: "700" }],
        "body-2xlg": ["1.375rem", { lineHeight: "1.75rem" }],
        "body-sm": ["0.875rem", { lineHeight: "1.375rem" }],
        "body-xs": ["0.75rem", { lineHeight: "1.25rem" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      screens: {
        "2xsm": "375px",
        xsm: "425px",
        "3xl": "2000px",
      },
      borderWidth: {
        "6": "6px",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};

export default config;
