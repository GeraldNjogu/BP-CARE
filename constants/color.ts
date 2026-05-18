export const palette = {
  // Primary
  primary: "#0D7377",
  primaryLight: "#14A098",
  primaryDark: "#094D50",

  // Secondary / Accent
  accent: "#32E0C4",
  accentSoft: "#B8F0E6",

  // Semantic
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",

  // Neutrals
  white: "#FFFFFF",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1E293B",
  gray900: "#0F172A",

  // Dark theme specific
  darkBg: "#0B1220",
  darkCard: "#111D2E",
  darkElevated: "#162236",
} as const;

export type ThemeColors = {
  background: string;
  card: string;
  cardElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  tint: string;
  tintLight: string;
  tabIconDefault: string;
  tabIconSelected: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  inputBackground: string;
  inputBorder: string;
  overlay: string;
  gradientStart: string;
  gradientEnd: string;
};

export const lightTheme: ThemeColors = {
  background: palette.gray50,
  card: palette.white,
  cardElevated: palette.gray50,
  text: palette.gray900,
  textSecondary: palette.gray600,
  textMuted: palette.gray400,
  border: palette.gray200,
  tint: palette.primary,
  tintLight: palette.primaryLight,
  tabIconDefault: palette.gray400,
  tabIconSelected: palette.primary,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,
  inputBackground: palette.gray100,
  inputBorder: palette.gray200,
  overlay: "rgba(15,23,42,0.4)",
  gradientStart: palette.primary,
  gradientEnd: palette.primaryLight,
};

export const darkTheme: ThemeColors = {
  background: palette.darkBg,
  card: palette.darkCard,
  cardElevated: palette.darkElevated,
  text: palette.gray100,
  textSecondary: palette.gray300,
  textMuted: palette.gray500,
  border: "#1E3A4A",
  tint: palette.primaryLight,
  tintLight: palette.accent,
  tabIconDefault: palette.gray500,
  tabIconSelected: palette.accent,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,
  inputBackground: palette.darkElevated,
  inputBorder: "#1E3A4A",
  overlay: "rgba(0,0,0,0.6)",
  gradientStart: palette.primary,
  gradientEnd: palette.accent,
};
