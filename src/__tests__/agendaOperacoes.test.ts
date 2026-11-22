import {
  agendaDaData,
  agendaEmCurso,
  atividadeEmUso,
  chavesEmConflito,
  dividirAPartirDe,
  duplicarParaProximoMes,
  nomeDeAgendaDoMes,
  ocorrenciasDoDia,
  periodoLivreDoMes,
  validarAgenda,
  type Agenda,
  type Atividade,
  type DadosAgenda,
  type Ocorrencia,
} from "../domain/agenda";

function contador() {
  let n = 0;
  return () => `id${++n}`;
}

function atividade(id: string, nome: string): Atividade {
  return { id, nome, icone: "outro", categoria: null, criadaEm: "2026-11-01T00:00:00.000Z" };
}

const academia = atividade("academia", "Academia");
const trabalho = atividade("trabalho", "Trabalho");
const aula = atividade("aula", "Aula");

function novembro(): Agenda {
  return {
    id: "nov",
    nome: "Novembro de 2026",
    inicio: "2026-11-01",
    fim: "2026-11-30",
    compromissos: [
      { id: "c1", atividadeId: "academia", dias: [1, 2], inicio: "05:00", fim: "06:00" },
      { id: "c2", atividadeId: "trabalho", dias: [1], inicio: "12:00", fim: "18:00" },
      { id: "c3", atividadeId: "aula", dias: [1], inicio: "07:30", fim: null },
      { id: "c4", atividadeId: "aula", dias: [2], inicio: "19:00", fim: "21:00" },
    ],
  };
}

function dados(extra: Partial<DadosAgenda> = {}): DadosAgenda {
  return {
    atividades: [academia, trabalho, aula],
    agendas: [novembro()],
    avulsos: [],
    registros: [],
    ...extra,
  };
}

// 2026-11-16 é segunda-feira; 2026-11-17, terça.
const SEGUNDA = new Date(2026, 10, 16);
const TERCA = new Date(2026, 10, 17);

describe("agendaDaData", () => {
  it("acha a agenda no primeiro dia, no meio e no último dia do período", () => {
    const agendas = [novembro()];
    expect(agendaDaData(agendas, new Date(2026, 10, 1))?.id).toBe("nov");
    expect(agendaDaData(agendas, new Date(2026, 10, 15))?.id).toBe("nov");
    expect(agendaDaData(agendas, new Date(2026, 10, 30))?.id).toBe("nov");
  });

  it("devolve undefined fora de qualquer período", () => {
    const agendas = [novembro()];
    expect(agendaDaData(agendas, new Date(2026, 9, 31))).toBeUndefined();
    expect(agendaDaData(agendas, new Date(2026, 11, 1))).toBeUndefined();
  });
});

describe("ocorrenciasDoDia", () => {
  it("devolve só os compromissos do dia da semana, em ordem de horário", () => {
    const ocorrencias = ocorrenciasDoDia(dados(), SEGUNDA);
    expect(ocorrencias.map((o) => `${o.inicio} ${o.atividade.nome}`)).toEqual([
      "05:00 Academia",
      "07:30 Aula",
      "12:00 Trabalho",
    ]);
    expect(ocorrenciasDoDia(dados(), TERCA).map((o) => o.atividade.nome)).toEqual([
      "Academia",
      "Aula",
    ]);
  });

  it("junta os avulsos da data, marcados como avulso", () => {
    const avulso = {
      id: "v1",
      atividadeId: "academia",
      data: "2026-11-16",
      inicio: "06:30",
      fim: null,
    };
    const ocorrencias = ocorrenciasDoDia(dados({ avulsos: [avulso] }), SEGUNDA);
    const doAvulso = ocorrencias.find((o) => o.origem === "avulso");
    expect(doAvulso).toMatchObject({ id: "v1", agendaId: null, chave: "avulso:v1" });
    expect(ocorrencias.map((o) => o.inicio)).toEqual(["05:00", "06:30", "07:30", "12:00"]);
  });

  it("desempata por término (sem término primeiro) e por nome", () => {
    const base = dados();
    base.agendas[0].compromissos = [
      { id: "x1", atividadeId: "trabalho", dias: [1], inicio: "08:00", fim: "09:00" },
      { id: "x2", atividadeId: "aula", dias: [1], inicio: "08:00", fim: null },
      { id: "x3", atividadeId: "academia", dias: [1], inicio: "08:00", fim: "09:00" },
    ];
    expect(ocorrenciasDoDia(base, SEGUNDA).map((o) => o.atividade.nome)).toEqual([
      "Aula",
      "Academia",
      "Trabalho",
    ]);
  });

  it("devolve só os avulsos quando a data está fora de qualquer agenda", () => {
    const fora = new Date(2026, 11, 7);
    const avulso = {
      id: "v1",
      atividadeId: "aula",
      data: "2026-12-07",
      inicio: "19:00",
      fim: null,
    };
    const ocorrencias = ocorrenciasDoDia(dados({ avulsos: [avulso] }), fora);
    expect(ocorrencias).toHaveLength(1);
    expect(ocorrencias[0].origem).toBe("avulso");
    expect(ocorrenciasDoDia(dados(), fora)).toEqual([]);
  });

  it("ignora itens cuja atividade não existe", () => {
    const base = dados({ atividades: [academia] });
    expect(ocorrenciasDoDia(base, SEGUNDA).map((o) => o.atividade.nome)).toEqual(["Academia"]);
  });
});

describe("chavesEmConflito", () => {
  function ocorrencia(id: string, inicio: string, fim: string | null): Ocorrencia {
    return {
      chave: `agenda:${id}`,
      origem: "agenda",
      id,
      agendaId: "nov",
      atividade: academia,
      inicio,
      fim,
    };
  }

  it("marca intervalos que se sobrepõem", () => {
    const chaves = chavesEmConflito([
      ocorrencia("a", "15:30", "19:00"),
      ocorrencia("b", "18:00", "20:00"),
    ]);
    expect([...chaves].sort()).toEqual(["agenda:a", "agenda:b"]);
  });

  it("não marca intervalos que apenas se encostam", () => {
    expect(
      chavesEmConflito([ocorrencia("a", "15:30", "19:00"), ocorrencia("b", "19:00", "20:00")]).size,
    ).toBe(0);
  });

  it("trata evento sem término como um instante", () => {
    expect(
      chavesEmConflito([ocorrencia("a", "15:30", "19:00"), ocorrencia("b", "20:00", null)]).size,
    ).toBe(0);
    expect(
      chavesEmConflito([ocorrencia("a", "15:30", "19:00"), ocorrencia("b", "16:00", null)]).size,
    ).toBe(2);
  });
});

describe("nomeDeAgendaDoMes", () => {
  it("escreve o mês com inicial maiúscula", () => {
    expect(nomeDeAgendaDoMes(2026, 10)).toBe("Novembro de 2026");
  });
});

describe("duplicarParaProximoMes", () => {
  it("cria o mês seguinte com ids novos e as mesmas atividades", () => {
    const resultado = duplicarParaProximoMes(dados(), "nov", contador());
    if (!resultado.ok) throw new Error(resultado.erro);
    const nova = resultado.valor;
    expect(nova).toMatchObject({
      nome: "Dezembro de 2026",
      inicio: "2026-12-01",
      fim: "2026-12-31",
    });
    expect(nova.compromissos.map((c) => c.atividadeId)).toEqual(
      novembro().compromissos.map((c) => c.atividadeId),
    );
    const idsAntigos = novembro().compromissos.map((c) => c.id);
    expect(nova.compromissos.every((c) => !idsAntigos.includes(c.id))).toBe(true);
    expect(new Set([nova.id, ...nova.compromissos.map((c) => c.id)]).size).toBe(5);
    expect(nova.compromissos[0]).toMatchObject({ dias: [1, 2], inicio: "05:00", fim: "06:00" });
  });

  it("vira o ano: dezembro gera janeiro do ano seguinte", () => {
    const dezembro: Agenda = { ...novembro(), id: "dez", inicio: "2026-12-01", fim: "2026-12-31" };
    const resultado = duplicarParaProximoMes(dados({ agendas: [dezembro] }), "dez", contador());
    if (!resultado.ok) throw new Error(resultado.erro);
    expect(resultado.valor).toMatchObject({
      nome: "Janeiro de 2027",
      inicio: "2027-01-01",
      fim: "2027-01-31",
    });
  });

  it("respeita o fim de fevereiro em ano comum", () => {
    const janeiro: Agenda = { ...novembro(), id: "jan", inicio: "2027-01-01", fim: "2027-01-31" };
    const resultado = duplicarParaProximoMes(dados({ agendas: [janeiro] }), "jan", contador());
    if (!resultado.ok) throw new Error(resultado.erro);
    expect(resultado.valor).toMatchObject({ inicio: "2027-02-01", fim: "2027-02-28" });
  });

  it("usa o mês inteiro seguinte mesmo que a origem não seja um mês fechado", () => {
    const curta: Agenda = { ...novembro(), inicio: "2026-11-10", fim: "2026-11-19" };
    const resultado = duplicarParaProximoMes(dados({ agendas: [curta] }), "nov", contador());
    if (!resultado.ok) throw new Error(resultado.erro);
    expect(resultado.valor).toMatchObject({ inicio: "2026-12-01", fim: "2026-12-31" });
  });

  it("bloqueia quando já existe agenda no mês seguinte", () => {
    const dezembro: Agenda = { ...novembro(), id: "dez", inicio: "2026-12-01", fim: "2026-12-31" };
    const resultado = duplicarParaProximoMes(
      dados({ agendas: [novembro(), dezembro] }),
      "nov",
      contador(),
    );
    expect(resultado).toEqual({ ok: false, erro: "Já existe agenda neste período" });
  });

  it("devolve erro para agenda inexistente", () => {
    expect(duplicarParaProximoMes(dados(), "nada", contador()).ok).toBe(false);
  });
});

describe("agendaEmCurso", () => {
  const agenda = novembro();

  it("é falso quando nenhum dia passou ainda", () => {
    expect(agendaEmCurso(agenda, new Date(2026, 10, 1))).toBe(false);
    expect(agendaEmCurso(agenda, new Date(2026, 9, 20))).toBe(false);
  });

  it("é verdadeiro no meio e no último dia do período", () => {
    expect(agendaEmCurso(agenda, new Date(2026, 10, 15))).toBe(true);
    expect(agendaEmCurso(agenda, new Date(2026, 10, 30))).toBe(true);
  });

  it("é falso depois do fim", () => {
    expect(agendaEmCurso(agenda, new Date(2026, 11, 1))).toBe(false);
  });
});

describe("dividirAPartirDe", () => {
  it("fecha a original ontem e abre a nova hoje com os compromissos copiados", () => {
    const original = novembro();
    const { anterior, nova, idsNovos } = dividirAPartirDe(
      original,
      new Date(2026, 10, 15),
      contador(),
    );
    expect(anterior).toMatchObject({ id: "nov", inicio: "2026-11-01", fim: "2026-11-14" });
    expect(anterior.compromissos).toEqual(original.compromissos);
    expect(nova).toMatchObject({ inicio: "2026-11-15", fim: "2026-11-30" });
    expect(nova.nome).toContain("a partir de 15/11");
    expect(nova.compromissos).toHaveLength(original.compromissos.length);
    for (const antigo of original.compromissos) {
      const novo = nova.compromissos.find((c) => c.id === idsNovos[antigo.id]);
      expect(novo).toMatchObject({
        atividadeId: antigo.atividadeId,
        dias: antigo.dias,
        inicio: antigo.inicio,
      });
      expect(novo?.id).not.toBe(antigo.id);
    }
    expect(validarAgenda(anterior, [nova])).toBeNull();
    expect(validarAgenda(nova, [anterior])).toBeNull();
  });

  it("no último dia a nova agenda tem 1 dia e a anterior termina ontem", () => {
    const { anterior, nova } = dividirAPartirDe(novembro(), new Date(2026, 10, 30), contador());
    expect(anterior.fim).toBe("2026-11-29");
    expect(nova).toMatchObject({ inicio: "2026-11-30", fim: "2026-11-30" });
    expect(validarAgenda(nova, [anterior])).toBeNull();
  });
});

describe("atividadeEmUso", () => {
  it("é verdadeiro quando um compromisso de qualquer agenda usa a atividade", () => {
    expect(atividadeEmUso(dados(), "academia")).toBe(true);
  });

  it("é verdadeiro quando só um avulso usa a atividade", () => {
    const livre = atividade("corrida", "Corrida");
    const avulso = {
      id: "v1",
      atividadeId: "corrida",
      data: "2026-11-16",
      inicio: "06:00",
      fim: null,
    };
    expect(
      atividadeEmUso(dados({ atividades: [livre], agendas: [], avulsos: [avulso] }), "corrida"),
    ).toBe(true);
  });

  it("é falso quando ninguém usa a atividade", () => {
    const livre = atividade("corrida", "Corrida");
    expect(atividadeEmUso(dados({ atividades: [academia, livre] }), "corrida")).toBe(false);
  });
});

describe("periodoLivreDoMes", () => {
  function agendaEm(id: string, inicio: string, fim: string): Agenda {
    return { ...novembro(), id, inicio, fim, compromissos: [] };
  }

  it("sem agendas devolve o mês inteiro do dia", () => {
    expect(periodoLivreDoMes([], new Date(2026, 9, 17))).toEqual({
      inicio: "2026-10-01",
      fim: "2026-10-31",
    });
  });

  it("começa no dia seguinte à agenda que termina antes do dia", () => {
    const agendas = [agendaEm("a", "2026-10-01", "2026-10-28")];
    expect(periodoLivreDoMes(agendas, new Date(2026, 9, 30))).toEqual({
      inicio: "2026-10-29",
      fim: "2026-10-31",
    });
  });

  it("termina na véspera da agenda que começa depois do dia", () => {
    const agendas = [agendaEm("b", "2026-10-29", "2026-11-30")];
    expect(periodoLivreDoMes(agendas, new Date(2026, 9, 15))).toEqual({
      inicio: "2026-10-01",
      fim: "2026-10-28",
    });
  });

  it("encaixa o dia entre duas agendas do mesmo mês", () => {
    const agendas = [
      agendaEm("a", "2026-10-01", "2026-10-09"),
      agendaEm("b", "2026-10-21", "2026-10-31"),
    ];
    expect(periodoLivreDoMes(agendas, new Date(2026, 9, 15))).toEqual({
      inicio: "2026-10-10",
      fim: "2026-10-20",
    });
  });

  it("ignora agendas de outros meses", () => {
    const agendas = [agendaEm("nov", "2026-11-01", "2026-11-30")];
    expect(periodoLivreDoMes(agendas, new Date(2026, 9, 15))).toEqual({
      inicio: "2026-10-01",
      fim: "2026-10-31",
    });
  });
});

describe("dividirAPartirDe: nome", () => {
  it("não acumula sufixos ao dividir de novo a agenda criada por uma divisão", () => {
    const id = contador();
    const primeira = dividirAPartirDe(novembro(), new Date(2026, 10, 15), id);
    expect(primeira.nova.nome).toBe("Novembro de 2026 (a partir de 15/11)");

    const segunda = dividirAPartirDe(primeira.nova, new Date(2026, 10, 16), id);
    expect(segunda.nova.nome).toBe("Novembro de 2026 (a partir de 16/11)");
    expect(segunda.anterior.nome).toBe("Novembro de 2026 (a partir de 15/11)");
  });
});
