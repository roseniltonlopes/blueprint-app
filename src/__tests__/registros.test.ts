import type { Atividade, Ocorrencia } from "../domain/agenda";
import {
  ERRO_DIA_FUTURO,
  instanteNoDia,
  mensagemDaMarcacao,
  planejarMarcacao,
  podeRegistrarNaData,
  proximoStatus,
  registroDaOcorrencia,
  remapearRegistros,
  resumoDoDia,
  substituirRegistro,
  textoDoResumo,
  validarRegistro,
  type RegistroCompromisso,
} from "../domain/registros";

/** Sábado, 17 de outubro de 2026, 15:58. */
const AGORA = new Date(2026, 9, 17, 15, 58);
const HOJE = "2026-10-17";

function atividade(parcial: Partial<Atividade> = {}): Atividade {
  return {
    id: "academia",
    nome: "Academia",
    icone: "exercicio",
    categoria: "exercicio",
    criadaEm: "2026-10-01T00:00:00.000Z",
    ...parcial,
  };
}

function ocorrencia(parcial: Partial<Ocorrencia> = {}): Ocorrencia {
  return {
    chave: "agenda:c1",
    origem: "agenda",
    id: "c1",
    agendaId: "out",
    atividade: atividade(),
    inicio: "05:00",
    fim: "06:00",
    ...parcial,
  };
}

function registro(parcial: Partial<RegistroCompromisso> = {}): RegistroCompromisso {
  return {
    id: "r1",
    origem: "agenda",
    origemId: "c1",
    atividadeId: "academia",
    nomeAtividade: "Academia",
    categoria: "exercicio",
    data: HOJE,
    inicio: "05:00",
    fim: "06:00",
    status: "feito",
    acaoId: "a1",
    registradoEm: AGORA.toISOString(),
    ...parcial,
  };
}

function planejar(
  tocado: "feito" | "nao_fui",
  anterior: RegistroCompromisso | null = null,
  extra: { ocorrencia?: Ocorrencia; data?: string } = {},
) {
  return planejarMarcacao({
    ocorrencia: extra.ocorrencia ?? ocorrencia(),
    data: extra.data ?? HOJE,
    anterior,
    tocado,
    agora: AGORA,
    novoId: () => "novo",
  });
}

describe("podeRegistrarNaData", () => {
  it("aceita hoje e dias passados, recusa o futuro e datas inválidas", () => {
    expect(podeRegistrarNaData(HOJE, AGORA)).toBe(true);
    expect(podeRegistrarNaData("2026-10-16", AGORA)).toBe(true);
    expect(podeRegistrarNaData("2026-10-18", AGORA)).toBe(false);
    expect(podeRegistrarNaData("2026-02-30", AGORA)).toBe(false);
  });
});

describe("proximoStatus", () => {
  it("marca o status tocado e desmarca quando ele já estava marcado", () => {
    expect(proximoStatus(null, "feito")).toBe("feito");
    expect(proximoStatus("nao_fui", "feito")).toBe("feito");
    expect(proximoStatus("feito", "feito")).toBeNull();
  });
});

describe("planejarMarcacao", () => {
  it("Feito de atividade com categoria cria o registro e pede a ação da categoria", () => {
    const plano = planejar("feito");
    expect(plano).toEqual({
      ok: true,
      valor: {
        registro: registro({ id: "novo", acaoId: null }),
        criarAcao: { categoria: "exercicio" },
        removerAcaoId: null,
      },
    });
  });

  it("no Outro, a ação leva o nome da atividade como rótulo", () => {
    const plano = planejar("feito", null, {
      ocorrencia: ocorrencia({ atividade: atividade({ nome: "Culto", categoria: "outro" }) }),
    });
    expect(plano.ok && plano.valor.criarAcao).toEqual({ categoria: "outro", rotulo: "Culto" });
  });

  it("atividade sem categoria só gera o registro", () => {
    const plano = planejar("feito", null, {
      ocorrencia: ocorrencia({ atividade: atividade({ nome: "Trabalho", categoria: null }) }),
    });
    expect(plano.ok && plano.valor.criarAcao).toBeNull();
    expect(plano.ok && plano.valor.registro?.status).toBe("feito");
  });

  it("Não fiz não gera ação", () => {
    const plano = planejar("nao_fui");
    expect(plano.ok && plano.valor).toMatchObject({
      criarAcao: null,
      removerAcaoId: null,
      registro: { status: "nao_fui", acaoId: null },
    });
  });

  it("trocar de Feito para Não fiz remove a ação e mantém o id do registro", () => {
    const plano = planejar("nao_fui", registro());
    expect(plano.ok && plano.valor).toMatchObject({
      criarAcao: null,
      removerAcaoId: "a1",
      registro: { id: "r1", status: "nao_fui", acaoId: null },
    });
  });

  it("tocar de novo em Feito desmarca e remove a ação", () => {
    const plano = planejar("feito", registro());
    expect(plano).toEqual({
      ok: true,
      valor: { registro: null, criarAcao: null, removerAcaoId: "a1" },
    });
  });

  it("copia nome, categoria e horário de agora para o registro", () => {
    const plano = planejar("nao_fui", null, {
      ocorrencia: ocorrencia({ inicio: "07:30", fim: null, origem: "avulso", id: "v9" }),
    });
    expect(plano.ok && plano.valor.registro).toMatchObject({
      origem: "avulso",
      origemId: "v9",
      nomeAtividade: "Academia",
      categoria: "exercicio",
      inicio: "07:30",
      fim: null,
    });
  });

  it("recusa dia futuro", () => {
    expect(planejar("feito", null, { data: "2026-10-18" })).toEqual({
      ok: false,
      erro: ERRO_DIA_FUTURO,
    });
  });
});

describe("validarRegistro", () => {
  const { id: _id, ...valido } = registro();

  it("aceita um registro completo", () => {
    expect(validarRegistro(valido)).toBeNull();
  });

  it.each([
    ["origem", { origem: "outra" }],
    ["nome vazio", { nomeAtividade: "  " }],
    ["categoria desconhecida", { categoria: "lazer" }],
    ["data inexistente", { data: "2026-02-30" }],
    ["hora inválida", { inicio: "25:00" }],
    ["término antes do início", { fim: "04:00" }],
    ["status desconhecido", { status: "talvez" }],
    ["ação em registro Não fiz", { status: "nao_fui" }],
    ["instante ilegível", { registradoEm: "ontem" }],
  ])("recusa %s", (_nome, mudanca) => {
    expect(validarRegistro({ ...valido, ...mudanca } as typeof valido)).not.toBeNull();
  });
});

describe("substituirRegistro e registroDaOcorrencia", () => {
  it("troca só o registro da mesma ocorrência na mesma data", () => {
    const ontem = registro({ id: "r0", data: "2026-10-16" });
    const outro = registro({ id: "r2", origemId: "c2" });
    const lista = [ontem, registro(), outro];
    const novo = registro({ id: "r1", status: "nao_fui", acaoId: null });

    const trocada = substituirRegistro(lista, "agenda:c1", HOJE, novo);
    expect(trocada).toHaveLength(3);
    expect(registroDaOcorrencia(trocada, "agenda:c1", HOJE)?.status).toBe("nao_fui");
    expect(registroDaOcorrencia(trocada, "agenda:c1", "2026-10-16")).toBe(ontem);

    const sem = substituirRegistro(lista, "agenda:c1", HOJE, null);
    expect(sem).toEqual([ontem, outro]);
  });

  it("não confunde compromisso e avulso com o mesmo id", () => {
    const lista = [registro({ origem: "avulso" })];
    expect(registroDaOcorrencia(lista, "agenda:c1", HOJE)).toBeUndefined();
    expect(registroDaOcorrencia(lista, "avulso:c1", HOJE)).toBeDefined();
  });
});

describe("remapearRegistros", () => {
  it("aponta para a cópia só os registros de compromisso de hoje em diante", () => {
    const ontem = registro({ id: "r0", data: "2026-10-16" });
    const hoje = registro();
    const avulso = registro({ id: "r3", origem: "avulso" });
    const resultado = remapearRegistros([ontem, hoje, avulso], { c1: "c1-novo" }, HOJE);
    expect(resultado.map((r) => r.origemId)).toEqual(["c1", "c1-novo", "c1"]);
  });
});

describe("resumoDoDia", () => {
  it("conta feitos, não fiz e pendentes só entre os compromissos de agora", () => {
    const ocorrencias = [
      ocorrencia(),
      ocorrencia({ chave: "agenda:c2", id: "c2" }),
      ocorrencia({ chave: "agenda:c3", id: "c3" }),
    ];
    const registros = [
      registro(),
      registro({ id: "r2", origemId: "c2", status: "nao_fui", acaoId: null }),
      // Compromisso que não está mais na agenda: não entra na conta.
      registro({ id: "r9", origemId: "removido" }),
    ];
    const resumo = resumoDoDia(ocorrencias, registros, HOJE);
    expect(resumo).toEqual({ total: 3, feitos: 1, naoFui: 1, pendentes: 1 });
    expect(textoDoResumo(resumo)).toBe("Feitos: 1 de 3");
  });
});

describe("mensagemDaMarcacao", () => {
  it("descreve o que mudou", () => {
    expect(mensagemDaMarcacao("Academia", "feito")).toBe("Feito: Academia");
    expect(mensagemDaMarcacao("Academia", "nao_fui")).toBe("Não fiz: Academia");
    expect(mensagemDaMarcacao("Academia", null)).toBe("Registro removido: Academia");
  });
});

describe("instanteNoDia", () => {
  it("monta a data local no horário do compromisso", () => {
    const instante = instanteNoDia("2026-10-16", "05:30");
    expect([instante.getFullYear(), instante.getMonth(), instante.getDate()]).toEqual([
      2026, 9, 16,
    ]);
    expect([instante.getHours(), instante.getMinutes()]).toEqual([5, 30]);
  });
});
