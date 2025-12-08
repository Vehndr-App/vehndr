// Brand colors aligned with design-system.json
// Vehndr Design System v1.0.0

export const brand = {
  // Primary - Violet scale
  violet: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#8B5CF6",
    600: "#7C3AED",
    700: "#6D28D9",
    800: "#5B21B6",
    900: "#4C1D95",
  },
  
  // Primary - Magenta scale
  magenta: {
    50: "#FDF4FF",
    100: "#FAE8FF",
    200: "#F5D0FE",
    300: "#F0ABFC",
    400: "#E879F9",
    500: "#D946EF",
    600: "#C026D3",
    700: "#A21CAF",
    800: "#86198F",
    900: "#701A75",
  },
  
  // Accent colors
  accent: {
    coral: {
      500: "#FF6B6B",
      600: "#EE5A5A",
    },
    mint: {
      500: "#10B981",
      600: "#059669",
    },
    amber: {
      500: "#F59E0B",
      600: "#D97706",
    },
  },
  
  // Neutral - Warm Grays (not cool grays)
  neutral: {
    white: "#FFFFFF",
    offWhite: "#FAFAFA",
    cream: "#FFF9F0",
    50: "#FAFAF9",
    100: "#F5F5F4",
    200: "#E7E5E4",
    300: "#D6D3D1",
    400: "#A8A29E",
    500: "#78716C",
    600: "#57534E",
    700: "#44403C",
    800: "#292524",
    900: "#1C1917",
  },
  
  // Semantic colors
  semantic: {
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  
  // Gradients (as CSS values)
  gradients: {
    primary: "linear-gradient(135deg, #7C3AED 0%, #C026D3 50%, #F472B6 100%)",
    secondary: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
    warm: "linear-gradient(180deg, #FFF9F0 0%, #FFE4E1 100%)",
    cool: "linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%)",
    sunset: "linear-gradient(135deg, #F472B6 0%, #FB923C 100%)",
  },
  
  // Semantic mappings for convenience
  primary: "#7C3AED",    // violet-600
  secondary: "#C026D3",  // magenta-600
  background: "#FAFAF9", // neutral-50
  surface: "#FFFFFF",
  text: "#1C1917",       // neutral-900
  textMuted: "#78716C",  // neutral-500
};

// Shadow tokens
export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
  card: "0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
  cardHover: "0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)",
  colored: "0 8px 32px rgba(124, 58, 237, 0.2)",
  button: "0 4px 12px rgba(124, 58, 237, 0.25)",
};

// Border radius tokens
export const radii = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  "3xl": "24px",
  full: "9999px",
};

// Typography
export const typography = {
  fontFamily: {
    display: "var(--font-cabinet), system-ui, sans-serif",
    body: "var(--font-jakarta), system-ui, sans-serif",
  },
  fontSize: {
    h1: "32px",
    h2: "24px",
    h3: "20px",
    h4: "18px",
    bodyLarge: "16px",
    bodyMedium: "14px",
    bodySmall: "12px",
    caption: "11px",
  },
};

export default brand;
