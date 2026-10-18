import { nova } from "./utils";

import { gradeDoMes, somarDias } from "../domain/datas";
import {
  contarPorDia,
  mapaDeCalor,
  nivelDeIntensidade,
  resumoDoMes,
  totalGeral,
} from "../domain/estatisticas";
import { nomeDoFuso } from "../domain/fuso";
import { iniciais, plural } from "../domain/texto";
import { THEMES } from "../styles/theme";
import { aplicarDestaque } from "../theme/ThemeProvider";

const HOJE = new Date(2026, 9, 17, 15, 58); // sábado

describe("gradeDoMes (F11)", () => {
  it.each([
    [2026, 9, 5], // outubro de 2026
    [2026, 7, 6], // agosto de 2026 começa no sábado
    [2026, 1, 5], // fevereiro de 2026: 28 dias começando no domingo
  ])("%i/%i tem %i linhas", (ano, mes, linhas) => {
    const grade = gradeDoMes(ano, mes);
    expect(grade).toHaveLength(linhas);
    expect(grade.every((semana) => semana.length === 7 && semana[0].data.getDay() === 0)).toBe(
      true,
    );
  });

  it("marca os dias vizinhos como fora do mês", () => {
    const grade = gradeDoMes(2026, 9);
    expect(grade[0][0].data.getDate()).toBe(27); // 27 de setembro
    expect(grade[0][0].doMes).toBe(false);
    expect(grade[0][4].doMes).toBe(true); // 1º de outubro é quinta
  });
});

describe("intensidade (docs/04)", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [6, 4],
    [20, 4],
  ])("%i ações → nível %i", (total, nivel) => {
    expect(nivelDeIntensidade(total)).toBe(nivel);
  });
});

describe("resumos", () => {
  const acoes = [
    nova("estudo", new Date(2026, 9, 1, 9)),
    nova("estudo", new Date(2026, 9, 1, 10)),
    nova("estudo", new Date(2026, 9, 17, 10)),
    nova("estudo", new Date(2026, 8, 30, 10)),
  ];
  const porDia = contarPorDia(acoes);

  it("resume o mês sem misturar meses vizinhos", () => {
    expect(resumoDoMes(porDia, 2026, 9)).toEqual({ total: 3, diasComRegistro: 2 });
    expect(resumoDoMes(porDia, 2026, 8)).toEqual({ total: 1, diasComRegistro: 1 });
  });

  it("total geral soma tudo", () => {
    expect(totalGeral(porDia)).toBe(4);
  });

  it("mapa de calor tem 12 colunas de 7 dias e termina na semana atual", () => {
    const colunas = mapaDeCalor(porDia, HOJE);
    expect(colunas).toHaveLength(12);
    expect(colunas.every((c) => c.length === 7)).toBe(true);
    const ultima = colunas[11];
    expect(ultima[6].data.getDate()).toBe(17);
    expect(ultima[6].total).toBe(1);
    expect(colunas[0][0].data.getTime()).toBe(somarDias(new Date(2026, 9, 11), -77).getTime());
  });

  it("marca dias futuros no mapa", () => {
    const quarta = new Date(2026, 9, 14, 12);
    const ultima = mapaDeCalor(porDia, quarta)[11];
    expect(ultima.map((c) => c.futuro)).toEqual([false, false, false, false, true, true, true]);
  });
});

describe("textos e preferências", () => {
  it("iniciais e plural", () => {
    expect(iniciais("Ana Souza")).toBe("AS");
    expect(iniciais("ana maria souza")).toBe("AS");
    expect(iniciais("Convidado")).toBe("C");
    expect(iniciais("  ")).toBe("?");
    expect(plural(1, "dia", "dias")).toBe("1 dia");
    expect(plural(7, "dia", "dias")).toBe("7 dias");
  });

  it("nome do fuso", () => {
    expect(nomeDoFuso("America/Sao_Paulo")).toBe("América/São Paulo");
    expect(nomeDoFuso("Europe/Lisbon")).toBe("Europe/Lisbon");
    expect(nomeDoFuso("America/Argentina/Buenos_Aires")).toBe("America/Argentina/Buenos Aires");
    expect(nomeDoFuso(null)).toBe("Horário do aparelho");
  });

  it("cor de destaque troca só o gradiente", () => {
    const laranja = aplicarDestaque(THEMES.light, "laranja");
    expect(laranja.gradient).toEqual(["#FF4B00", "#FF4B00"]);
    expect(laranja.ramp).toEqual(THEMES.light.ramp);
    expect(aplicarDestaque(THEMES.dark, "indigo").gradient).toEqual(["#7A4DFF", "#7A4DFF"]);
    expect(aplicarDestaque(THEMES.light, "gradiente")).toBe(THEMES.light);
  });
});
