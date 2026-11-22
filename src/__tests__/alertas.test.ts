import type { Agenda, Atividade, Compromisso, DadosAgenda } from "../domain/agenda";
import { formatarAntecedencia, lerDadosDoAlerta, planejarAlertas } from "../domain/alertas";
import type { RegistroCompromisso } from "../domain/registros";

/** Sábado, 17 de outubro de 2026, 15:58. */
const AGORA = new Date(2026, 9, 17, 15, 58);

const academia: Atividade = {
  id: "academia",
  nome: "Academia",
  icone: "exercicio",
  categoria: "exercicio",
  criadaEm: "2026-10-01T00:00:00.000Z",
};

function compromisso(id: string, parcial: Partial<Compromisso>): Compromisso {
  return {
    id,
    atividadeId: "academia",
    dias: [0, 1, 2, 3, 4, 5, 6],
    inicio: "05:00",
    fim: null,
    ...parcial,
  };
}

function dados(compromissos: Compromisso[], registros: RegistroCompromisso[] = []): DadosAgenda {
  const outubro: Agenda = {
    id: "out",
    nome: "Outubro de 2026",
    inicio: "2026-10-01",
    fim: "2026-10-31",
    compromissos,
  };
  return { atividades: [academia], agendas: [outubro], avulsos: [], registros };
}

function quando(alerta: { quando: Date }) {
  const d = alerta.quando;
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

describe("planejarAlertas", () => {
  it("só agenda compromissos com antecedência e cujo aviso ainda não passou", () => {
    const alertas = planejarAlertas(
      dados([
        compromisso("c1", { inicio: "05:00", antecedenciaMin: 15 }),
        compromisso("c2", { inicio: "07:00" }),
      ]),
      AGORA,
      2,
    );
    // Hoje às 04:45 já passou; amanhã (domingo, 18) entra.
    expect(alertas.map(quando)).toEqual(["18/10 04:45"]);
    expect(alertas[0]).toMatchObject({
      id: "agenda:c1@2026-10-18",
      chaveDaOcorrencia: "agenda:c1",
      data: "2026-10-18",
      titulo: "Academia às 05:00",
      corpo: "Começa em 15 min.",
    });
  });

  it("com antecedência zero avisa na hora e inclui o detalhe", () => {
    const [alerta] = planejarAlertas(
      dados([compromisso("c1", { inicio: "16:30", antecedenciaMin: 0, detalhe: "Montese" })]),
      AGORA,
      1,
    );
    expect(quando(alerta)).toBe("17/10 16:30");
    expect(alerta.corpo).toBe("Está na hora. Montese");
  });

  it("aviso de compromisso logo depois da meia-noite cai na véspera", () => {
    const [alerta] = planejarAlertas(
      dados([compromisso("c1", { dias: [0], inicio: "00:10", antecedenciaMin: 20 })]),
      AGORA,
      2,
    );
    expect(quando(alerta)).toBe("17/10 23:50");
    expect(alerta.data).toBe("2026-10-18");
  });

  it("não agenda o que já foi marcado naquele dia", () => {
    const registro: RegistroCompromisso = {
      id: "r1",
      origem: "agenda",
      origemId: "c1",
      atividadeId: "academia",
      nomeAtividade: "Academia",
      categoria: "exercicio",
      data: "2026-10-17",
      inicio: "18:00",
      fim: null,
      status: "nao_fui",
      acaoId: null,
      registradoEm: AGORA.toISOString(),
    };
    const alertas = planejarAlertas(
      dados([compromisso("c1", { inicio: "18:00", antecedenciaMin: 30 })], [registro]),
      AGORA,
      2,
    );
    expect(alertas.map((a) => a.data)).toEqual(["2026-10-18"]);
  });

  it("para no fim da agenda, ordena por horário e respeita o máximo", () => {
    const todos = planejarAlertas(
      dados([
        compromisso("tarde", { inicio: "18:00", antecedenciaMin: 0 }),
        compromisso("manha", { inicio: "06:00", antecedenciaMin: 0 }),
      ]),
      AGORA,
      30,
    );
    // Hoje só a tarde; de 18 a 31 de outubro, manhã e tarde.
    expect(todos).toHaveLength(1 + 14 * 2);
    expect(todos.slice(0, 3).map(quando)).toEqual(["17/10 18:00", "18/10 06:00", "18/10 18:00"]);
    expect(todos.at(-1)?.data).toBe("2026-10-31");

    const limitados = planejarAlertas(
      dados([compromisso("manha", { inicio: "06:00", antecedenciaMin: 0 })]),
      AGORA,
      30,
      3,
    );
    expect(limitados).toHaveLength(3);
  });
});

describe("formatarAntecedencia", () => {
  it("usa minutos e horas", () => {
    expect(formatarAntecedencia(15)).toBe("15 min");
    expect(formatarAntecedencia(60)).toBe("1 h");
    expect(formatarAntecedencia(90)).toBe("1 h 30 min");
  });
});

describe("lerDadosDoAlerta", () => {
  it("aceita só o formato que o app grava", () => {
    expect(lerDadosDoAlerta({ chave: "agenda:c1", data: "2026-10-17" })).toEqual({
      chave: "agenda:c1",
      data: "2026-10-17",
    });
    expect(lerDadosDoAlerta({ chave: "avulso:v1", data: "2026-10-17", extra: 1 })).not.toBeNull();
    expect(lerDadosDoAlerta(null)).toBeNull();
    expect(lerDadosDoAlerta({ chave: "outro:c1", data: "2026-10-17" })).toBeNull();
    expect(lerDadosDoAlerta({ chave: "agenda:c1", data: "17/10/2026" })).toBeNull();
    expect(lerDadosDoAlerta({ chave: 1, data: "2026-10-17" })).toBeNull();
  });
});
