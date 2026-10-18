import { nova } from "./utils";
import type { Acao } from "../domain/acoes";
import type { CategoriaId } from "../domain/categorias";
import { formatarIntervalo, inicioDaSemana, rotuloDoDia, somarDias } from "../domain/datas";
import {
  agruparPorDia,
  contarPorDia,
  indiceDoMelhorDia,
  semanaDoGrafico,
  sequenciaAtual,
} from "../domain/estatisticas";

const HOJE = new Date(2026, 9, 17, 15, 58); // sábado

function em(diasAtras: number, hora = 10, categoria: CategoriaId = "estudo"): Acao {
  const quando = somarDias(HOJE, -diasAtras);
  quando.setHours(hora, 0);
  return nova(categoria, quando);
}

describe("semana", () => {
  it("começa no domingo e formata o intervalo como no design", () => {
    const domingo = inicioDaSemana(HOJE);
    expect(domingo.getDate()).toBe(11);
    expect(formatarIntervalo(domingo, somarDias(domingo, 6))).toBe("11 a 17 de outubro");
    expect(formatarIntervalo(new Date(2026, 8, 27), new Date(2026, 9, 3))).toBe(
      "27 de setembro a 3 de outubro",
    );
    expect(formatarIntervalo(new Date(2026, 11, 27), new Date(2027, 0, 2))).toBe(
      "27 de dezembro de 2026 a 2 de janeiro de 2027",
    );
  });

  it("marca hoje e os dias futuros do gráfico", () => {
    const quarta = new Date(2026, 9, 14, 12);
    const dias = semanaDoGrafico(inicioDaSemana(quarta), contarPorDia([em(3)]), quarta);
    expect(dias.map((d) => d.ehHoje)).toEqual([false, false, false, true, false, false, false]);
    expect(dias.map((d) => d.futuro)).toEqual([false, false, false, false, true, true, true]);
    expect(dias[3].total).toBe(1);
  });
});

describe("sequência (docs/05)", () => {
  it("conta dias consecutivos até hoje", () => {
    expect(sequenciaAtual(contarPorDia([em(0), em(1), em(2), em(4)]), HOJE)).toBe(3);
  });

  it("hoje sem registro não zera: conta a partir de ontem", () => {
    expect(sequenciaAtual(contarPorDia([em(1), em(2)]), HOJE)).toBe(2);
  });

  it("zera se hoje e ontem estão vazios", () => {
    expect(sequenciaAtual(contarPorDia([em(2), em(3)]), HOJE)).toBe(0);
  });

  it("respeita a virada do dia (23:59 e 00:00 são dias diferentes)", () => {
    const ontemTarde = em(1, 23);
    ontemTarde.criadoEm = new Date(2026, 9, 16, 23, 59).toISOString();
    const hojeCedo = em(0, 0);
    expect(sequenciaAtual(contarPorDia([ontemTarde, hojeCedo]), HOJE)).toBe(2);
  });
});

describe("melhor dia", () => {
  it("é o dia com mais ações; empate fica com o mais recente", () => {
    expect(indiceDoMelhorDia([{ total: 2 }, { total: 5 }, { total: 5 }, { total: 1 }])).toBe(2);
  });

  it("é null quando a semana está vazia", () => {
    expect(indiceDoMelhorDia([{ total: 0 }, { total: 0 }])).toBeNull();
  });
});

describe("lista agrupada", () => {
  it("agrupa por dia, do mais recente para o mais antigo, com títulos Hoje e Ontem", () => {
    const grupos = agruparPorDia([em(1, 9), em(0, 8), em(3, 12), em(0, 14)], HOJE);
    expect(grupos.map((g) => g.titulo)).toEqual(["Hoje", "Ontem", "Quarta-feira, 14 de outubro"]);
    expect(grupos[0].total).toBe(2);
    const horas = grupos[0].data.map((a) => new Date(a.criadoEm).getHours());
    expect(horas).toEqual([14, 8]);
  });

  it("rótulo do dia", () => {
    expect(rotuloDoDia(HOJE, HOJE)).toBe("Hoje");
    expect(rotuloDoDia(somarDias(HOJE, -1), HOJE)).toBe("Ontem");
  });
});
