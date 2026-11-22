import type { Acao } from "../domain/acoes";
import type { Atividade, Avulso } from "../domain/agenda";
import type { RegistroCompromisso } from "../domain/registros";
import {
  acaoDaLinha,
  acaoParaLinha,
  agendaDaLinha,
  agendaParaLinha,
  atividadeDaLinha,
  atividadeParaLinha,
  avulsoDaLinha,
  avulsoParaLinha,
  compromissoDaLinha,
  compromissoParaLinha,
  dataDoBanco,
  horaDoBanco,
  instanteDoBanco,
  nomeDaLinha,
  registroDaLinha,
  registroParaLinha,
  type CompromissoComAgenda,
} from "../sincronizacao/conversores";

const U = "usuario-1";

describe("formatos do Postgres", () => {
  it('horário "05:00:00" vira "05:00"', () => {
    expect(horaDoBanco("05:00:00")).toBe("05:00");
    expect(horaDoBanco("23:59:59.123")).toBe("23:59");
    expect(horaDoBanco("07:30")).toBe("07:30");
    expect(horaDoBanco("24:00:00")).toBeNull();
    expect(horaDoBanco(null)).toBeNull();
  });

  it("instante com +00:00 e microssegundos vira ISO com Z", () => {
    expect(instanteDoBanco("2026-11-20T08:10:00.123456+00:00")).toBe("2026-11-20T08:10:00.123Z");
    expect(instanteDoBanco("ontem")).toBeNull();
  });

  it("data precisa existir no calendário", () => {
    expect(dataDoBanco("2026-11-15")).toBe("2026-11-15");
    expect(dataDoBanco("2026-02-30")).toBeNull();
  });
});

describe("atividades", () => {
  const atividade: Atividade = {
    id: "academia",
    nome: "Academia",
    icone: "exercicio",
    categoria: "exercicio",
    criadaEm: "2026-11-01T10:00:00.000Z",
  };

  it("ida e volta", () => {
    const linha = atividadeParaLinha(atividade, U);
    expect(linha).toEqual({
      user_id: U,
      id: "academia",
      nome: "Academia",
      icone: "exercicio",
      categoria: "exercicio",
      criada_em: "2026-11-01T10:00:00.000Z",
    });
    expect(atividadeDaLinha({ ...linha, criada_em: "2026-11-01T10:00:00+00:00" })).toEqual(
      atividade,
    );
  });

  it("linha inválida vira null", () => {
    const linha = atividadeParaLinha(atividade, U);
    expect(atividadeDaLinha({ ...linha, icone: "foguete" })).toBeNull();
    expect(atividadeDaLinha({ ...linha, categoria: "lazer" })).toBeNull();
    expect(atividadeDaLinha({ ...linha, nome: "   " })).toBeNull();
    expect(atividadeDaLinha("lixo")).toBeNull();
  });
});

describe("agendas e compromissos", () => {
  it("agenda vai sem a lista de compromissos", () => {
    const linha = agendaParaLinha(
      { id: "nov", nome: "Novembro de 2026", inicio: "2026-11-01", fim: "2026-11-30" },
      U,
    );
    expect(linha).toEqual({
      user_id: U,
      id: "nov",
      nome: "Novembro de 2026",
      inicio: "2026-11-01",
      fim: "2026-11-30",
    });
    expect(agendaDaLinha(linha)).toEqual({
      id: "nov",
      nome: "Novembro de 2026",
      inicio: "2026-11-01",
      fim: "2026-11-30",
    });
    expect(agendaDaLinha({ ...linha, fim: "2026-10-01" })).toBeNull();
  });

  it("compromisso: dias smallint[], horário do Postgres e opcionais nulos", () => {
    const compromisso: CompromissoComAgenda = {
      id: "c1",
      agendaId: "nov",
      atividadeId: "academia",
      dias: [1, 3, 5],
      inicio: "05:00",
      fim: "06:00",
    };
    const linha = compromissoParaLinha(compromisso, U);
    expect(linha).toEqual({
      user_id: U,
      id: "c1",
      agenda_id: "nov",
      atividade_id: "academia",
      dias: [1, 3, 5],
      inicio: "05:00",
      fim: "06:00",
      detalhe: null,
      antecedencia_min: null,
    });
    expect(compromissoDaLinha({ ...linha, inicio: "05:00:00", fim: "06:00:00" })).toEqual(
      compromisso,
    );
    expect(
      compromissoDaLinha({ ...linha, fim: null, detalhe: "Montese", antecedencia_min: 15 }),
    ).toEqual({ ...compromisso, fim: null, detalhe: "Montese", antecedenciaMin: 15 });
  });

  it("compromisso inválido vira null", () => {
    const linha = compromissoParaLinha(
      { id: "c1", agendaId: "a", atividadeId: "b", dias: [1], inicio: "05:00", fim: null },
      U,
    );
    expect(compromissoDaLinha({ ...linha, dias: [] })).toBeNull();
    expect(compromissoDaLinha({ ...linha, dias: [1, 1] })).toBeNull();
    expect(compromissoDaLinha({ ...linha, fim: "04:00:00" })).toBeNull();
    expect(compromissoDaLinha({ ...linha, fim: "manhã" })).toBeNull();
  });

  it("avulso ida e volta", () => {
    const avulso: Avulso = {
      id: "v1",
      atividadeId: "academia",
      data: "2026-11-20",
      inicio: "20:00",
      fim: null,
      detalhe: "Casa",
    };
    const linha = avulsoParaLinha(avulso, U);
    expect(linha.detalhe).toBe("Casa");
    expect(avulsoDaLinha({ ...linha, inicio: "20:00:00" })).toEqual(avulso);
    expect(avulsoDaLinha({ ...linha, data: "2026-13-01" })).toBeNull();
  });
});

describe("registros", () => {
  const registro: RegistroCompromisso = {
    id: "r1",
    origem: "agenda",
    origemId: "c1",
    atividadeId: "academia",
    nomeAtividade: "Academia",
    categoria: "exercicio",
    data: "2026-11-20",
    inicio: "05:00",
    fim: "06:00",
    status: "feito",
    acaoId: "a1",
    registradoEm: "2026-11-20T08:10:00.000Z",
  };

  it("ida e volta com os nomes de coluna do banco", () => {
    const linha = registroParaLinha(registro, U);
    expect(linha).toMatchObject({
      origem_id: "c1",
      nome_atividade: "Academia",
      acao_id: "a1",
      registrado_em: "2026-11-20T08:10:00.000Z",
    });
    expect(
      registroDaLinha({
        ...linha,
        inicio: "05:00:00",
        fim: "06:00:00",
        registrado_em: "2026-11-20T08:10:00+00:00",
        atualizado_em: "2026-11-20T08:10:01+00:00",
      }),
    ).toEqual(registro);
  });

  it('ação só com status "feito"; status desconhecido é inválido', () => {
    const linha = registroParaLinha(registro, U);
    expect(registroDaLinha({ ...linha, status: "nao_fui" })).toBeNull();
    expect(registroDaLinha({ ...linha, status: "talvez", acao_id: null })).toBeNull();
    expect(registroDaLinha({ ...linha, status: "nao_fui", acao_id: null })).toMatchObject({
      status: "nao_fui",
      acaoId: null,
    });
  });
});

describe("ações", () => {
  it("rótulo só vai no outro e recebido_em nunca é enviado", () => {
    const comRotulo: Acao = {
      id: "a1",
      categoria: "estudo",
      rotulo: "Sobra",
      criadoEm: "2026-11-20T08:00:00.000Z",
    };
    expect(acaoParaLinha(comRotulo, U)).toEqual({
      user_id: U,
      id: "a1",
      categoria: "estudo",
      rotulo: null,
      criado_em: "2026-11-20T08:00:00.000Z",
    });
    const outro: Acao = { ...comRotulo, categoria: "outro", rotulo: "Leitura" };
    expect(acaoParaLinha(outro, U).rotulo).toBe("Leitura");
    expect(Object.keys(acaoParaLinha(outro, U))).not.toContain("recebido_em");
  });

  it("lê a linha do banco (com recebido_em) sem guardar o que o app não usa", () => {
    expect(
      acaoDaLinha({
        user_id: U,
        id: "a1",
        categoria: "hidratacao",
        rotulo: null,
        criado_em: "2026-11-20T08:00:00+00:00",
        recebido_em: "2026-11-20T08:00:01+00:00",
      }),
    ).toEqual({ id: "a1", categoria: "hidratacao", criadoEm: "2026-11-20T08:00:00.000Z" });
    expect(acaoDaLinha({ id: "a2", categoria: "outro", rotulo: null, criado_em: "x" })).toBeNull();
    expect(
      acaoDaLinha({
        id: "a3",
        categoria: "outro",
        rotulo: null,
        criado_em: "2026-11-20T08:00:00Z",
      }),
    ).toBeNull();
  });
});

describe("perfil", () => {
  it("nome vazio ou ausente vira null", () => {
    expect(nomeDaLinha({ nome: "  Ana   Souza " })).toBe("Ana Souza");
    expect(nomeDaLinha({ nome: null })).toBeNull();
    expect(nomeDaLinha(null)).toBeNull();
  });
});
