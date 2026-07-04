
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
                ink: {
                    DEFAULT: '#051424', // Void base — page background
                    soft: '#0d1c2d'
                },
                oxford: {
                    DEFAULT: '#0d1c2d', // Surface blue-black — cards, header
                    50: '#e8edf4',
                    100: '#c2cfe0',
                    200: '#93aac6',
                    300: '#6485ab',
                    400: '#3d6390',
                    500: '#1c2b3c',
                    600: '#122131',
                    700: '#0d1c2d',
                    800: '#08172a',
                    900: '#051424'
                },
                paper: {
                    DEFAULT: '#d4e4fa' // Light blue-white — high-contrast text on ink
                },
                amber: {
                    DEFAULT: '#E8A33D', // Monetary amounts ONLY — never decorative
                    soft: '#F2C069',
                    deep: '#C4832A',
                    50: '#fdf6ea',
                    100: '#f9e8c8',
                    200: '#f4d69d',
                    300: '#eec06c',
                    400: '#E8A33D',
                    500: '#d98f26',
                    600: '#c4832a',
                    700: '#9c6620',
                    800: '#7a4f1a',
                    900: '#5c3b14'
                },
                parrot: {
                    DEFAULT: '#00E600', // Action green — the single high-energy accent
                    50: '#e8ffe6',
                    100: '#c2ffbd',
                    200: '#96ff8e',
                    300: '#76ff60',
                    400: '#2ae500',
                    500: '#00E600',
                    600: '#01b300',
                    700: '#028a00',
                    800: '#026100',
                    900: '#013a00'
                },
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
                'fade-in': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(10px)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)'
                    }
                },
                'slide-in-right': {
                    '0%': {
                        transform: 'translateX(100%)',
                        opacity: '0'
                    },
                    '100%': {
                        transform: 'translateX(0)',
                        opacity: '1'
                    }
                },
                'slide-in-left': {
                    '0%': {
                        transform: 'translateX(-100%)',
                        opacity: '0'
                    },
                    '100%': {
                        transform: 'translateX(0)',
                        opacity: '1'
                    }
                },
                'pulse-subtle': {
                    '0%, 100%': {
                        opacity: '1',
                    },
                    '50%': {
                        opacity: '0.8',
                    }
                }
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.5s ease-out forwards',
                'slide-in-right': 'slide-in-right 0.3s ease-out',
                'slide-in-left': 'slide-in-left 0.3s ease-out',
                'pulse-subtle': 'pulse-subtle 2s infinite ease-in-out'
			},
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Montserrat', 'Inter', 'sans-serif'],
                serif: ['"DM Serif Display"', 'Georgia', 'serif'],
                mono: ['"Geist Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace']
            }
		}
	},
	plugins: [],
} satisfies Config;
