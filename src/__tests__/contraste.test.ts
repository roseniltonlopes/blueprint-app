import { THEMES, type ColorScheme, type ThemeColors } from "../styles/theme";

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const canal = parseInt(hex.slice(i, i + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Pares texto e fundo que o app realmente usa. Mínimo WCAG AA para texto: 4,5. */
const PARES: [string, (t: ThemeColors) => string, (t: ThemeColors) => string][] = [
  ["texto principal no fundo", (t) => t.ink, (t) => t.bg],
  ["texto principal no cartão", (t) => t.ink, (t) => t.card],
  ["texto secundário no fundo", (t) => t.mute, (t) => t.bg],
  ["texto secundário no cartão", (t) => t.mute, (t) => t.card],
  ["texto secundário no bloco rebaixado", (t) => t.mute, (t) => t.sunk],
  ["texto de destaque no fundo", (t) => t.accentText, (t) => t.bg],
  ["texto de destaque no cartão", (t) => t.accentText, (t) => t.card],
  ["texto do botão primário", (t) => t.onInk, (t) => t.ink],
  ["placeholder no cartão", (t) => t.placeholder, (t) => t.card],
];

describe("contraste dos temas", () => {
  for (const esquema of ["light", "dark"] as ColorScheme[]) {
    it.each(PARES)(`${esquema}: %s tem no mínimo 4,5:1`, (_nome, texto, fundo) => {
      const tema = THEMES[esquema];
      expect(contraste(texto(tema), fundo(tema))).toBeGreaterThanOrEqual(4.5);
    });
  }
});
