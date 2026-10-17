/**
 * Design Tokens & Tema Visual — App Blueprint (Plano de Ação Diário)
 * Paleta Oficial: Creme (#FFFDF2) e Preto Puro (#000000) com suporte a Light & Dark Mode
 */

export const COLORS = {
  // Paleta Principal (Light Mode — Base Creme #FFFDF2)
  creamBackground: "#FFFDF2",   // Fundo principal claro (Creme oficial)
  creamSurface: "#F4F1E1",      // Superfície de cards e inputs no modo claro
  creamBorder: "#D8D5C5",       // Bordas sutis no modo claro
  pureBlack: "#000000",         // Cor primária de contraste, botões ativos e fundo Dark Mode
  charcoalSpecial: "#2D2A24",   // Destaque especial diferenciado para a opção "Outro"
  textMuted: "#52514C",         // Textos secundários e legendas

  // Aliases semânticos usados nos componentes
  primaryNavy: "#000000",
  blueprintBlue: "#000000",
  specialPurple: "#2D2A24",
  backgroundSlate: "#FFFDF2",
  surfaceWhite: "#F4F1E1",
  buttonDefault: "#F4F1E1",
  textPrimary: "#000000",
  textSecondary: "#52514C",
  textOnPrimary: "#FFFDF2",
};

export const THEMES = {
  light: {
    background: "#FFFDF2",
    card: "#F4F1E1",
    text: "#000000",
    subtext: "#52514C",
    primaryButton: "#000000",
    primaryButtonText: "#FFFDF2",
    border: "#D8D5C5",
  },
  dark: {
    background: "#000000",
    card: "#1C1B18",
    cardHighlight: "#FFFDF2",
    text: "#FFFDF2",
    subtext: "#A8A496",
    primaryButton: "#FFFDF2",
    primaryButtonText: "#000000",
    border: "#2D2A24",
  },
};
