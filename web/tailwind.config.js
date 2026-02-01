/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Custom premium palette extensions if needed
            }
        },
    },
    plugins: [
        require('daisyui'),
    ],
    daisyui: {
        themes: [
            "light",
            "dark",
            "bumblebee",
            "emerald",
            "corporate",
            "synthwave",
            // Cyberpunk already has font settings in default theme
            "cyberpunk",
            "halloween",
            "garden",
            "forest",
            "aqua",
            "lofi",
            "pastel",
            "fantasy",
            "wireframe",
            "black",
            "dracula",
            "cmyk",
            "autumn",
            "business",
            "acid",
            "lemonade",
            "night",
            "winter",
            // Custom Overrides for Fonts
            {
                "cupcake": {
                    "color-scheme": "light",
                    "primary": "#65c3c8",
                    "secondary": "#ef9fbc",
                    "accent": "#eeaf3a",
                    "neutral": "#291334",
                    "base-100": "#faf7f5",
                    "base-200": "#efeae6",
                    "base-300": "#e7e2df",
                    "base-content": "#291334",
                    "--rounded-btn": "1.9rem",
                    "--tab-border": "2px",
                    "--tab-radius": "0.7rem",
                    "fontFamily": "Quicksand, sans-serif"
                }
            },
            {
                "valentine": {
                    "color-scheme": "light",
                    "primary": "#e96d7b",
                    "secondary": "#a991f7",
                    "accent": "#66b1b3",
                    "neutral": "#af4670",
                    "neutral-content": "#f0d6e8",
                    "base-100": "#fae7f4",
                    "base-content": "#632c3b",
                    "info": "#2563eb",
                    "success": "#16a34a",
                    "warning": "#d97706",
                    "error": "oklch(73.07% 0.207 27.33)",
                    "--rounded-btn": "1.9rem",
                    "--tab-radius": "0.7rem",
                    "fontFamily": "Quicksand, sans-serif"
                }
            },
            {
                "luxury": {
                    "color-scheme": "dark",
                    "primary": "oklch(100% 0 0)",
                    "secondary": "#152747",
                    "accent": "#513448",
                    "neutral": "#331800",
                    "neutral-content": "#FFE7A3",
                    "base-100": "#09090b",
                    "base-200": "#171618",
                    "base-300": "#2e2d2f",
                    "base-content": "#dca54c",
                    "info": "#66c6ff",
                    "success": "#87d039",
                    "warning": "#e2d562",
                    "error": "#ff6f6f",
                    "fontFamily": "Playfair Display, serif"
                }
            },
            {
                "retro": {
                    "color-scheme": "light",
                    "primary": "#ef9995",
                    "primary-content": "#282425",
                    "secondary": "#a4cbb4",
                    "secondary-content": "#282425",
                    "accent": "#DC8850",
                    "accent-content": "#282425",
                    "neutral": "#2E282A",
                    "neutral-content": "#EDE6D4",
                    "base-100": "#ece3ca",
                    "base-200": "#e4d8b4",
                    "base-300": "#DBCA9A",
                    "base-content": "#282425",
                    "info": "#2563eb",
                    "success": "#16a34a",
                    "warning": "#d97706",
                    "error": "oklch(65.72% 0.199 27.33)",
                    "--rounded-box": "0.4rem",
                    "--rounded-btn": "0.4rem",
                    "--rounded-badge": "0.4rem",
                    "--tab-radius": "0.4rem",
                    "fontFamily": "Playfair Display, serif"
                }
            },
            {
                "coffee": {
                    "color-scheme": "dark",
                    "primary": "#DB924B",
                    "secondary": "#263E3F",
                    "accent": "#10576D",
                    "neutral": "#120C12",
                    "base-100": "#20161F",
                    "base-content": "#c59f60",
                    "info": "#8DCAC1",
                    "success": "#9DB787",
                    "warning": "#FFD25F",
                    "error": "#FC9581",
                    "fontFamily": "Playfair Display, serif"
                }
            }
        ],
    },
}
