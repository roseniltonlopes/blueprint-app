import { FONT_FAMILY, SHADOWS, THEMES, TYPOGRAPHY } from "../styles/theme";

describe("tokens do tema", () => {
  it("claro e escuro têm exatamente os mesmos papéis", () => {
    expect(Object.keys(THEMES.dark).sort()).toEqual(Object.keys(THEMES.light).sort());
    expect(Object.keys(SHADOWS.dark).sort()).toEqual(Object.keys(SHADOWS.light).sort());
  });

  it("segue os valores de docs/04", () => {
    expect(THEMES.light.bg).toBe("#DDDDDD");
    expect(THEMES.dark.bg).toBe("#000000");
    expect(THEMES.light.accentText).toBe("#4607CD");
    expect(THEMES.dark.accentText).toBe("#FF4B00");
    expect(THEMES.dark.gradient[0]).toBe("#7A4DFF");
  });

  it("rampa tem 4 níveis terminando no laranja da marca", () => {
    for (const tema of [THEMES.light, THEMES.dark]) {
      expect(tema.ramp).toHaveLength(4);
      expect(tema.ramp[3]).toBe("#FF4B00");
    }
  });

  it("não usa laranja como texto de destaque no modo claro", () => {
    expect(THEMES.light.accentText).not.toBe(THEMES.light.accent);
  });

  it("toda variante tipográfica aponta para uma fonte carregada", () => {
    for (const spec of Object.values(TYPOGRAPHY)) {
      expect(FONT_FAMILY[spec.weight]).toBeDefined();
      expect(spec.lineHeight).toBeGreaterThanOrEqual(spec.fontSize);
    }
  });
});
