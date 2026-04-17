import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
            },
            fontSize: {
                "hero-sm": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.025em" }],
                "hero-md": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em" }],
                "hero-lg": ["3rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
                "heading-1": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.025em" }],
                "heading-2-sm": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.025em" }],
                "heading-2-lg": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.025em" }],
                h3: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.02em" }],
                h4: ["1.125rem", { lineHeight: "1.75rem" }],
                h5: ["1rem", { lineHeight: "1.5rem" }],
                h6: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.05em" }],
                "card-title": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.025em" }],
                "lead-sm": ["1.125rem", { lineHeight: "1.75rem" }],
                "lead-md": ["1.25rem", { lineHeight: "1.875rem" }],
                caption: ["0.625rem", { lineHeight: "0.875rem" }],
                "marketing-tagline-sm": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.025em" }],
                "marketing-tagline-lg": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em" }],
            },
            colors: {
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
                scanner: {
                    video: "var(--scanner-video)",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            minWidth: {
                "table-nombre": "220px",
                "table-descripcion": "280px",
                "table-sku": "130px",
                "table-barcode": "200px",
                "table-fecha": "11rem",
                "table-acciones": "8.5rem",
                "negocio-select": "200px",
                "menu-popover": "8rem",
            },
            maxHeight: {
                "dropdown-available": "var(--radix-dropdown-menu-content-available-height)",
            },
            minHeight: {
                "dashboard-tab": "320px",
                "scanner-frame": "40vh",
            },
            maxWidth: {
                "auth-greet": "200px",
            },
            aspectRatio: {
                hero: "16 / 9",
            },
            padding: {
                "safe-bottom": "max(1rem, env(safe-area-inset-bottom))",
            },
            transformOrigin: {
                "dropdown-content": "var(--radix-dropdown-menu-content-transform-origin)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 350ms ease-out",
                "accordion-up": "accordion-up 350ms ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config;
