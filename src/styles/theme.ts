/**
 * Design tokens do Blueprint (v2).
 * Fonte única de cores, tipografia, formas, sombras e movimento.
 * Referência: docs/04-design-tokens-e-motion.md
 */

export const BRAND = {
  black: "#000000",
  offWhite: "#DDDDDD",
  orange: "#FF4B00",
  indigo: "#4607CD",
} as const;

export type ColorScheme = "light" | "dark";

export type ThemeColors = {
  /** Fundo da tela */
  bg: string;
  /** Cartões e barra de abas */
  card: string;
  /** Trilhas, chips e círculos de ícone */
  sunk: string;
  /** Texto principal e botão primário */
  ink: string;
  /** Texto sobre o botão primário */
  onInk: string;
  /** Texto secundário */
  mute: string;
  /** Segmentos vazios e contorno de campos */
  hair: string;
  /** Preenchimentos de destaque (nunca texto no modo claro) */
  accent: string;
  /** Texto de destaque */
  accentText: string;
  placeholder: string;
  /** Fundo do bottom sheet */
  overlay: string;
  /** Gradiente de 180deg: início e fim */
  gradient: readonly [string, string];
  /** Rampa de intensidade, do nível 1 ao 4 */
  ramp: readonly [string, string, string, string];
};

export const THEMES: Record<ColorScheme, ThemeColors> = {
  light: {
    bg: "#DDDDDD",
    card: "#F2F2F2",
    sunk: "#D0D0D0",
    ink: "#000000",
    onInk: "#DDDDDD",
    mute: "#474747",
    hair: "rgba(0,0,0,0.16)",
    accent: BRAND.orange,
    accentText: BRAND.indigo,
    placeholder: "#5E5E5E",
    overlay: "rgba(0,0,0,0.50)",
    gradient: [BRAND.indigo, BRAND.orange],
    ramp: [BRAND.indigo, "#841E89", "#C13444", BRAND.orange],
  },
  dark: {
    bg: "#000000",
    card: "#141414",
    sunk: "#222222",
    ink: "#DDDDDD",
    onInk: "#000000",
    mute: "#9C9C9C",
    hair: "rgba(221,221,221,0.20)",
    accent: BRAND.orange,
    accentText: BRAND.orange,
    placeholder: "#8F8F8F",
    overlay: "rgba(0,0,0,0.62)",
    gradient: ["#7A4DFF", BRAND.orange],
    ramp: ["#7A4DFF", "#A64CAA", "#D34C55", BRAND.orange],
  },
};

export type ThemeShadows = {
  card: string;
  glow: string;
  tabBar: string;
  sheet: string;
};

/** Sombras no formato CSS, aplicadas com a prop de estilo `boxShadow` (nova arquitetura). */
export const SHADOWS: Record<ColorScheme, ThemeShadows> = {
  light: {
    card: "0px 8px 24px rgba(0,0,0,0.07), 0px 1px 3px rgba(0,0,0,0.05)",
    glow: "0px 10px 26px rgba(255,75,0,0.30)",
    tabBar: "0px -10px 28px rgba(0,0,0,0.07)",
    sheet: "0px -16px 40px rgba(0,0,0,0.22)",
  },
  dark: {
    card: "none",
    glow: "0px 10px 26px rgba(255,75,0,0.32)",
    tabBar: "none",
    sheet: "0px -16px 40px rgba(0,0,0,0.22)",
  },
};

export const RADIUS = {
  progress: 28,
  card: 24,
  category: 22,
  button: 18,
  field: 16,
  pill: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** Margem lateral padrão da tela */
  screen: 16,
  /** Margem lateral do cadastro */
  screenAuth: 20,
  /** Espaço entre cartões */
  gap: 12,
} as const;

export const SIZES = {
  touchMin: 44,
  button: 56,
  field: 52,
  categoryCard: 108,
  categoryRow: 76,
  iconCircle: 42,
} as const;

export type FontWeight = 300 | 400 | 500 | 600 | 700;

/**
 * Famílias carregadas com expo-font, uma por peso (o Android não sintetiza pesos
 * de fontes customizadas). Para usar a Nohemi licenciada, carregue os arquivos
 * em App.tsx com estes mesmos nomes.
 */
export const FONT_FAMILY: Record<FontWeight, string> = {
  300: "Sora_300Light",
  400: "Sora_400Regular",
  500: "Sora_500Medium",
  600: "Sora_600SemiBold",
  700: "Sora_700Bold",
};

export type TextVariant =
  | "ring"
  | "wordmark"
  | "h1"
  | "sheetTitle"
  | "cardTitle"
  | "section"
  | "body"
  | "support"
  | "caption";

type TypeSpec = {
  fontSize: number;
  lineHeight: number;
  weight: FontWeight;
  /** Espaçamento de letras em em, convertido para pontos no componente Text */
  letterSpacingEm: number;
};

export const TYPOGRAPHY: Record<TextVariant, TypeSpec> = {
  ring: { fontSize: 48, lineHeight: 48, weight: 300, letterSpacingEm: -0.03 },
  wordmark: { fontSize: 40, lineHeight: 44, weight: 300, letterSpacingEm: -0.04 },
  h1: { fontSize: 30, lineHeight: 36, weight: 400, letterSpacingEm: -0.02 },
  sheetTitle: { fontSize: 26, lineHeight: 32, weight: 400, letterSpacingEm: -0.02 },
  cardTitle: { fontSize: 19, lineHeight: 24, weight: 400, letterSpacingEm: -0.02 },
  section: { fontSize: 17, lineHeight: 24, weight: 600, letterSpacingEm: 0 },
  body: { fontSize: 16, lineHeight: 22, weight: 500, letterSpacingEm: 0 },
  support: { fontSize: 14, lineHeight: 20, weight: 400, letterSpacingEm: 0 },
  caption: { fontSize: 13, lineHeight: 18, weight: 400, letterSpacingEm: 0 },
};

export const MOTION = {
  /** cubic-bezier(0.2, 0.8, 0.2, 1) */
  easing: [0.2, 0.8, 0.2, 1] as const,
  enter: { duration: 600, stagger: 60, offsetY: 10 },
  ring: { duration: 800, delay: 200, stagger: 100 },
  ringNumber: { duration: 600, delay: 250 },
  bars: { duration: 850, stagger: 70 },
  cells: { duration: 500, staggerMin: 30, staggerMax: 45, fromScale: 0.6 },
  sheet: { duration: 600 },
  toast: { duration: 550, delay: 300 },
  press: { duration: 220, offset: 2, scale: 0.99 },
} as const;
