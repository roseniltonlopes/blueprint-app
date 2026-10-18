import { coresDosSegmentos, interpolarCor } from "../styles/cores";
import { THEMES } from "../styles/theme";

describe("cores do anel", () => {
  it("interpola nas pontas e no meio", () => {
    expect(interpolarCor("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(interpolarCor("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
    // 127,5 arredonda para o par mais próximo (128)
    expect(interpolarCor("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("reproduz os segmentos do canvas nos dois temas", () => {
    expect(coresDosSegmentos(THEMES.light.gradient, 5)).toEqual([
      "#4607CD",
      "#74189A",
      "#A22966",
      "#D13A33",
      "#FF4B00",
    ]);
    expect(coresDosSegmentos(THEMES.dark.gradient, 5).slice(0, 4)).toEqual([
      "#7A4DFF",
      "#9B4CBF",
      "#BC4C80",
      "#DE4C40",
    ]);
  });

  it("aceita meta de 1 segmento", () => {
    expect(coresDosSegmentos(THEMES.light.gradient, 1)).toEqual(["#4607CD"]);
  });

  it("recusa cor inválida", () => {
    expect(() => interpolarCor("vermelho", "#FFFFFF", 0)).toThrow("Cor hexadecimal inválida");
  });
});
