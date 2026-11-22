import * as Haptics from "expo-haptics";
import {
  cargaDaSemana,
  resumoDoCompromisso,
  resumoDosDias,
  type Ocorrencia,
} from "../domain/agenda";
import { contarPorDia, faixasDoMes } from "../domain/estatisticas";
import { destaqueDoDia, formatarDuracao, saudacao } from "../domain/hoje";
import { criarAcao } from "../domain/acoes";
import type { RegistroCompromisso } from "../domain/registros";
import { efeitoDaHaptica } from "../services/haptica";
import { BRAND, THEMES } from "../styles/theme";
import { contraste, textoSobre } from "../styles/cores";

const DATA = "2026-11-23";

function ocorrencia(id: string, inicio: string, fim: string | null): Ocorrencia {
  return {
    chave: `agenda:${id}`,
    origem: "agenda",
    id,
    agendaId: "a1",
    atividade: { id: `at-${id}`, nome: id, icone: "outro", categoria: null, criadaEm: "" },
    inicio,
    fim,
  };
}

function registro(o: Ocorrencia, status: RegistroCompromisso["status"]): RegistroCompromisso {
  return {
    id: `r-${o.id}`,
    origem: "agenda",
    origemId: o.id,
    atividadeId: o.atividade.id,
    nomeAtividade: o.atividade.nome,
    categoria: null,
    data: DATA,
    inicio: o.inicio,
    fim: o.fim,
    status,
    acaoId: null,
    registradoEm: "",
  };
}

const ACORDAR = ocorrencia("acordar", "04:30", null);
const ACADEMIA = ocorrencia("academia", "05:00", "06:00");
const TRABALHO = ocorrencia("trabalho", "12:00", "18:00");
const AULA = ocorrencia("aula", "19:00", "21:00");
const DIA = [ACORDAR, ACADEMIA, TRABALHO, AULA];

function as(hora: number, minuto: number): Date {
  return new Date(2026, 10, 23, hora, minuto);
}

describe("saudação e duração", () => {
  it.each([
    [4, "Boa noite"],
    [5, "Bom dia"],
    [11, "Bom dia"],
    [12, "Boa tarde"],
    [17, "Boa tarde"],
    [18, "Boa noite"],
  ])("às %ih diz %s", (hora, esperado) => {
    expect(saudacao(as(hora, 0))).toBe(esperado);
  });

  it.each([
    [0, "0 min"],
    [40, "40 min"],
    [60, "1h"],
    [220, "3h40"],
    [125, "2h05"],
  ])("%i minutos viram %s", (minutos, esperado) => {
    expect(formatarDuracao(minutos)).toBe(esperado);
  });
});

describe("destaque do dia (cartão Agora)", () => {
  it("mostra o compromisso em curso com o tempo que falta e o seguinte", () => {
    const destaque = destaqueDoDia(DIA, [], DATA, as(14, 20));
    expect(destaque).toMatchObject({
      tipo: "agora",
      ocorrencia: TRABALHO,
      minutosRestantes: 220,
      depois: AULA,
    });
    expect(destaque?.tipo === "agora" && destaque.progresso).toBeCloseTo(140 / 360);
  });

  it("compromisso sem término conta como agora por 30 minutos", () => {
    expect(destaqueDoDia(DIA, [], DATA, as(4, 45))).toMatchObject({
      tipo: "agora",
      ocorrencia: ACORDAR,
      minutosRestantes: 15,
    });
  });

  it("entre compromissos, mostra o próximo e quanto falta para começar", () => {
    expect(destaqueDoDia(DIA, [], DATA, as(8, 0))).toMatchObject({
      tipo: "proximo",
      ocorrencia: TRABALHO,
      minutosParaComecar: 240,
      depois: AULA,
    });
  });

  it("pula o que já foi marcado, seja Feito ou Não fui", () => {
    const registros = [registro(TRABALHO, "feito")];
    expect(destaqueDoDia(DIA, registros, DATA, as(14, 20))).toMatchObject({
      tipo: "proximo",
      ocorrencia: AULA,
      depois: null,
    });
    const naoFui = [registro(AULA, "nao_fui"), registro(TRABALHO, "feito")];
    expect(destaqueDoDia(DIA, naoFui, DATA, as(14, 20))).toBeNull();
  });

  it("depois do último compromisso não há destaque", () => {
    expect(destaqueDoDia(DIA, [], DATA, as(22, 0))).toBeNull();
    expect(destaqueDoDia([], [], DATA, as(10, 0))).toBeNull();
  });
});

describe("carga da semana", () => {
  it("conta compromissos por dia da semana, sem contar dia repetido duas vezes", () => {
    expect(
      cargaDaSemana([{ dias: [0, 1, 2, 3, 4, 5, 6] }, { dias: [1, 2, 3, 4, 5] }, { dias: [1, 1] }]),
    ).toEqual([1, 3, 2, 2, 2, 2, 1]);
    expect(cargaDaSemana([])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("resumo do formulário de compromisso", () => {
  it("nomeia os grupos de dias comuns e abrevia o resto", () => {
    expect(resumoDosDias([5, 4, 3, 2, 1])).toBe("Seg a sex");
    expect(resumoDosDias([6, 0])).toBe("Fim de semana");
    expect(resumoDosDias([0, 1, 2, 3, 4, 5, 6])).toBe("Todos os dias");
    expect(resumoDosDias([5, 1, 3])).toBe("seg, qua, sex");
    expect(resumoDosDias([])).toBe("Nenhum dia");
  });

  it("junta dias, horário e lembrete", () => {
    expect(
      resumoDoCompromisso({
        dias: [1, 2, 3, 4, 5],
        inicio: "05:00",
        fim: "06:00",
        antecedenciaMin: 15,
      }),
    ).toBe("Seg a sex, 05:00 a 06:00 · avisa 15 min antes");
    expect(resumoDoCompromisso({ dias: [0], inicio: "04:30", fim: null, antecedenciaMin: 0 })).toBe(
      "dom, 04:30 · avisa na hora",
    );
    expect(resumoDoCompromisso({ dias: [], inicio: null, fim: null, antecedenciaMin: null })).toBe(
      "Nenhum dia, sem horário",
    );
  });
});

describe("faixas do mês (Histórico)", () => {
  it("divide o mês em faixas de 7 dias e marca a atual e as futuras", () => {
    const acoes = [
      criarAcao("estudo", new Date(2026, 10, 2, 10)),
      criarAcao("estudo", new Date(2026, 10, 9, 10)),
      criarAcao("estudo", new Date(2026, 10, 10, 10)),
      criarAcao("estudo", new Date(2026, 10, 23, 10)),
      criarAcao("estudo", new Date(2026, 9, 31, 10)),
    ];
    const faixas = faixasDoMes(contarPorDia(acoes), 2026, 10, as(14, 0));
    expect(faixas.map((f) => [f.inicio, f.fim, f.total])).toEqual([
      [1, 7, 1],
      [8, 14, 2],
      [15, 21, 0],
      [22, 28, 1],
      [29, 30, 0],
    ]);
    expect(faixas.map((f) => f.atual)).toEqual([false, false, false, true, false]);
    expect(faixas.map((f) => f.futura)).toEqual([false, false, false, false, true]);
  });

  it("fevereiro de 28 dias tem só quatro faixas", () => {
    expect(faixasDoMes(new Map(), 2027, 1, as(14, 0))).toHaveLength(4);
  });
});

describe("texto sobre a rampa do calendário", () => {
  it("escolhe a cor de texto com mais contraste e sempre passa de 4,5:1", () => {
    for (const tema of [THEMES.light, THEMES.dark]) {
      for (const fundo of tema.ramp) {
        const texto = textoSobre(fundo, BRAND.white, BRAND.black);
        expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(textoSobre(BRAND.orange, BRAND.white, BRAND.black)).toBe(BRAND.black);
    expect(textoSobre(BRAND.indigo, BRAND.white, BRAND.black)).toBe(BRAND.white);
  });
});

describe("retorno tátil", () => {
  it("no Android usa o motor háptico do sistema, sem permissão de vibrar", () => {
    expect(efeitoDaHaptica("selecao", "android")).toEqual({
      api: "android",
      tipo: Haptics.AndroidHaptics.Segment_Tick,
    });
    expect(efeitoDaHaptica("confirmar", "android")).toEqual({
      api: "android",
      tipo: Haptics.AndroidHaptics.Confirm,
    });
    expect(efeitoDaHaptica("rejeitar", "android")).toEqual({
      api: "android",
      tipo: Haptics.AndroidHaptics.Reject,
    });
  });

  it("no iOS usa seleção e notificação; na web não faz nada", () => {
    expect(efeitoDaHaptica("selecao", "ios")).toEqual({ api: "selecao" });
    expect(efeitoDaHaptica("confirmar", "ios")).toEqual({
      api: "notificacao",
      tipo: Haptics.NotificationFeedbackType.Success,
    });
    expect(efeitoDaHaptica("selecao", "web")).toBeNull();
  });
});
