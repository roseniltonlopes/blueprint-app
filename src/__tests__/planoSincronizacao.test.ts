import type { Acao } from "../domain/acoes";
import type { Agenda, Atividade, DadosAgenda } from "../domain/agenda";
import type { RegistroCompromisso } from "../domain/registros";
import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import { criarSincronizacaoRepositoryLocal } from "../data/SincronizacaoRepository";
import {
  agendaDaFoto,
  fotoDasLinhas,
  fotoDoEstado,
  fotoVazia,
  lerBase,
  serializarBase,
  type Foto,
} from "../sincronizacao/foto";
import {
  fotosIguais,
  mesclarFotos,
  planejarSincronizacao,
  reaplicarMudancasLocais,
} from "../sincronizacao/plano";

const U = "usuario-1";

function atividade(id: string, nome = id): Atividade {
  return {
    id,
    nome,
    icone: "exercicio",
    categoria: "exercicio",
    criadaEm: "2026-11-01T10:00:00.000Z",
  };
}

function agenda(
  id: string,
  inicio: string,
  fim: string,
  compromissos: Agenda["compromissos"] = [],
) {
  return { id, nome: `Agenda ${id}`, inicio, fim, compromissos };
}

function compromisso(id: string, atividadeId: string) {
  return { id, atividadeId, dias: [1, 3] as (1 | 3)[], inicio: "05:00", fim: "06:00" };
}

function registro(id: string, parcial: Partial<RegistroCompromisso> = {}): RegistroCompromisso {
  return {
    id,
    origem: "agenda",
    origemId: "c1",
    atividadeId: "academia",
    nomeAtividade: "Academia",
    categoria: "exercicio",
    data: "2026-11-20",
    inicio: "05:00",
    fim: "06:00",
    status: "feito",
    acaoId: null,
    registradoEm: "2026-11-20T08:10:00.000Z",
    ...parcial,
  };
}

function acao(id: string, categoria: Acao["categoria"] = "hidratacao"): Acao {
  return { id, categoria, criadoEm: "2026-11-20T08:00:00.000Z" };
}

function foto(agendaParcial: Partial<DadosAgenda> = {}, acoes: Acao[] = [], nome = ""): Foto {
  return fotoDoEstado({
    acoes,
    agenda: { atividades: [], agendas: [], avulsos: [], registros: [], ...agendaParcial },
    nome,
  });
}

describe("fotoDoEstado e agendaDaFoto", () => {
  it("separa os compromissos da agenda e devolve aninhados", () => {
    const dados: DadosAgenda = {
      atividades: [atividade("academia")],
      agendas: [agenda("nov", "2026-11-01", "2026-11-30", [compromisso("c1", "academia")])],
      avulsos: [],
      registros: [registro("r1")],
    };
    const f = fotoDoEstado({ acoes: [], agenda: dados, nome: "  Ana " });
    expect(f.compromissos.get("c1")?.agendaId).toBe("nov");
    expect(f.agendas.get("nov")).toEqual({
      id: "nov",
      nome: "Agenda nov",
      inicio: "2026-11-01",
      fim: "2026-11-30",
    });
    expect(f.nome).toBe("Ana");
    expect(agendaDaFoto(f)).toEqual(dados);
  });

  it('ação "outro" sem nome ganha o rótulo padrão; as demais perdem o rótulo', () => {
    const f = foto({}, [
      { id: "a1", categoria: "outro", criadoEm: "2026-11-20T08:00:00.000Z" },
      { id: "a2", categoria: "estudo", rotulo: "x", criadoEm: "2026-11-20T08:00:00.000Z" },
    ]);
    expect(f.acoes.get("a1")?.rotulo).toBe("Outro");
    expect(f.acoes.get("a2")).not.toHaveProperty("rotulo");
  });
});

describe("primeira sincronização (base null)", () => {
  it("sobe os dados locais para a nuvem vazia na ordem das chaves estrangeiras", () => {
    const local = foto(
      {
        atividades: [atividade("academia")],
        agendas: [agenda("nov", "2026-11-01", "2026-11-30", [compromisso("c1", "academia")])],
        avulsos: [
          { id: "v1", atividadeId: "academia", data: "2026-11-21", inicio: "20:00", fim: null },
        ],
        registros: [registro("r1", { acaoId: "a1" })],
      },
      [acao("a1", "exercicio")],
      "Ana",
    );
    const plano = planejarSincronizacao(null, local, fotoVazia(), U);
    expect(plano.passos.map((p) => (p.tipo === "nome" ? "nome" : `${p.tipo}:${p.tabela}`))).toEqual(
      [
        "enviar:atividades",
        "enviar:agendas",
        "enviar:compromissos",
        "enviar:avulsos",
        "enviar:registros",
        "enviar:acoes",
        "nome",
      ],
    );
    expect(fotosIguais(plano.foto, local)).toBe(true);
  });

  it("une local e nuvem sem apagar nada; no conflito vale o local", () => {
    const local = foto({ atividades: [atividade("a", "Academia"), atividade("b", "Bike")] });
    const remota = foto({
      atividades: [
        atividade("a", "Academia"),
        { ...atividade("b", "Bicicleta") },
        atividade("c", "Corrida"),
      ],
    });
    const plano = planejarSincronizacao(null, local, remota, U);
    expect([...plano.foto.atividades.values()].map((a) => a.nome).sort()).toEqual([
      "Academia",
      "Bike",
      "Corrida",
    ]);
    expect(plano.passos).toEqual([
      {
        tipo: "enviar",
        tabela: "atividades",
        linhas: [expect.objectContaining({ id: "b", nome: "Bike" })],
      },
    ]);
  });

  it("duas atividades com o mesmo nome viram uma só: id da nuvem, conteúdo daqui", () => {
    const local = foto({
      atividades: [{ ...atividade("aqui", "Academia"), icone: "sol" }],
      avulsos: [{ id: "v1", atividadeId: "aqui", data: "2026-11-21", inicio: "20:00", fim: null }],
    });
    const remota = foto({
      atividades: [atividade("la", "academia")],
      agendas: [agenda("nov", "2026-11-01", "2026-11-30", [compromisso("c1", "la")])],
      registros: [registro("r1", { atividadeId: "la" })],
    });
    const plano = planejarSincronizacao(null, local, remota, U);
    expect([...plano.foto.atividades.keys()]).toEqual(["la"]);
    expect(plano.foto.atividades.get("la")).toMatchObject({ nome: "Academia", icone: "sol" });
    expect(plano.foto.avulsos.get("v1")?.atividadeId).toBe("la");
    expect(plano.foto.compromissos.get("c1")?.atividadeId).toBe("la");
    // O banco não aceita dois nomes iguais: nada de criar "aqui" nem de apagar "la".
    expect(plano.passos).toEqual([
      {
        tipo: "enviar",
        tabela: "atividades",
        linhas: [expect.objectContaining({ id: "la", nome: "Academia", icone: "sol" })],
      },
      {
        tipo: "enviar",
        tabela: "avulsos",
        linhas: [expect.objectContaining({ id: "v1", atividade_id: "la" })],
      },
    ]);
  });

  it("apagou uma atividade e criou outra com o mesmo nome: a antiga sai antes do envio", () => {
    const base = foto({ atividades: [atividade("velha", "Academia")] });
    const local = foto({ atividades: [atividade("nova", "Academia")] });
    const plano = planejarSincronizacao(base, local, base, U);
    expect(plano.passos).toEqual([
      { tipo: "apagar", tabela: "atividades", ids: ["velha"] },
      { tipo: "enviar", tabela: "atividades", linhas: [expect.objectContaining({ id: "nova" })] },
    ]);
  });

  it("agendas sobrepostas: fica a deste aparelho", () => {
    const local = foto({ agendas: [agenda("aqui", "2026-11-10", "2026-11-30")] });
    const remota = foto({ agendas: [agenda("la", "2026-11-01", "2026-11-30")] });
    const plano = planejarSincronizacao(null, local, remota, U);
    expect([...plano.foto.agendas.keys()]).toEqual(["aqui"]);
    expect(plano.descartados).toBe(1);
    expect(plano.passos).toContainEqual({ tipo: "apagar", tabela: "agendas", ids: ["la"] });
  });

  it("dois registros do mesmo compromisso no mesmo dia: fica o deste aparelho", () => {
    const local = foto({ registros: [registro("aqui", { status: "nao_fui" })] });
    const remota = foto({ registros: [registro("la")] });
    const plano = planejarSincronizacao(null, local, remota, U);
    expect([...plano.foto.registros.keys()]).toEqual(["aqui"]);
    // O registro da nuvem sai antes do envio, senão a chave única (compromisso + dia) recusaria.
    const ordem = plano.passos.map((p) => (p.tipo === "nome" ? "nome" : `${p.tipo}:${p.tabela}`));
    expect(ordem.indexOf("apagar:registros")).toBeLessThan(ordem.indexOf("enviar:registros"));
  });

  it("ações: só envia as que faltam na nuvem (nunca atualiza)", () => {
    const local = foto({}, [acao("a1"), acao("a2", "estudo")]);
    const remota = foto({}, [{ ...acao("a2", "estudo"), criadoEm: "2026-11-19T08:00:00.000Z" }]);
    const plano = planejarSincronizacao(null, local, remota, U);
    expect(plano.passos).toEqual([
      { tipo: "enviar", tabela: "acoes", linhas: [expect.objectContaining({ id: "a1" })] },
    ]);
    expect(plano.foto.acoes.get("a2")?.criadoEm).toBe("2026-11-19T08:00:00.000Z");
  });

  it("nome: sem nome aqui, vem o da nuvem", () => {
    const plano = planejarSincronizacao(null, foto(), foto({}, [], "Ana"), U);
    expect(plano.foto.nome).toBe("Ana");
    expect(plano.passos).toEqual([]);
  });
});

describe("sincronizações seguintes (com base)", () => {
  const base = foto(
    {
      atividades: [atividade("academia", "Academia"), atividade("bike", "Bike")],
      agendas: [agenda("nov", "2026-11-01", "2026-11-30", [compromisso("c1", "academia")])],
    },
    [acao("a1")],
    "Ana",
  );

  it("nada mudou: nenhum passo", () => {
    expect(planejarSincronizacao(base, base, base, U).passos).toEqual([]);
  });

  it("apagado aqui sai da nuvem; apagado lá sai daqui", () => {
    const local = foto(
      {
        atividades: [atividade("academia", "Academia"), atividade("bike", "Bike")],
        agendas: [agenda("nov", "2026-11-01", "2026-11-30", [compromisso("c1", "academia")])],
      },
      [],
      "Ana",
    );
    const remota = foto(
      {
        atividades: [atividade("academia", "Academia")],
        agendas: [agenda("nov", "2026-11-01", "2026-11-30", [compromisso("c1", "academia")])],
      },
      [acao("a1")],
      "Ana",
    );
    const plano = planejarSincronizacao(base, local, remota, U);
    expect(plano.passos).toEqual([{ tipo: "apagar", tabela: "acoes", ids: ["a1"] }]);
    expect(plano.foto.atividades.has("bike")).toBe(false);
    expect(plano.foto.acoes.size).toBe(0);
  });

  it("atividade apagada aqui, mas usada por compromisso novo de outro aparelho, volta", () => {
    const local = foto(
      {
        atividades: [atividade("academia", "Academia")],
        agendas: [agenda("nov", "2026-11-01", "2026-11-30", [compromisso("c1", "academia")])],
      },
      [acao("a1")],
      "Ana",
    );
    const remota = foto(
      {
        atividades: [atividade("academia", "Academia"), atividade("bike", "Bike")],
        agendas: [
          agenda("nov", "2026-11-01", "2026-11-30", [
            compromisso("c1", "academia"),
            compromisso("c2", "bike"),
          ]),
        ],
      },
      [acao("a1")],
      "Ana",
    );
    const plano = planejarSincronizacao(base, local, remota, U);
    expect(plano.foto.atividades.has("bike")).toBe(true);
    expect(plano.foto.compromissos.has("c2")).toBe(true);
    expect(plano.passos).toEqual([]);
  });

  it("compromisso trocou de atividade e a antiga foi apagada: a antiga sai só depois do envio", () => {
    const local = foto(
      {
        atividades: [atividade("bike", "Bike")],
        agendas: [agenda("nov", "2026-11-01", "2026-11-30", [compromisso("c1", "bike")])],
      },
      [acao("a1")],
      "Ana",
    );
    const plano = planejarSincronizacao(base, local, base, U);
    const ordem = plano.passos.map((p) => (p.tipo === "nome" ? "nome" : `${p.tipo}:${p.tabela}`));
    expect(ordem).toEqual(["enviar:compromissos", "apagar:atividades"]);
  });

  it("apagar agenda: compromissos e agenda saem, filhos antes dos pais", () => {
    const local = foto(
      { atividades: [atividade("academia", "Academia"), atividade("bike", "Bike")] },
      [acao("a1")],
      "Ana",
    );
    const plano = planejarSincronizacao(base, local, base, U);
    expect(plano.passos).toEqual([
      { tipo: "apagar", tabela: "compromissos", ids: ["c1"] },
      { tipo: "apagar", tabela: "agendas", ids: ["nov"] },
    ]);
  });

  it("nome mudou aqui: sobe para o perfil", () => {
    const local = { ...base, nome: "Ana Souza" };
    expect(planejarSincronizacao(base, local, base, U).passos).toEqual([
      { tipo: "nome", nome: "Ana Souza" },
    ]);
  });
});

describe("reaplicarMudancasLocais", () => {
  it("mantém o que a pessoa fez durante a sincronização por cima do resultado", () => {
    const antes = foto({}, [acao("a1")]);
    const agora = foto({}, [acao("a1"), acao("a2")]);
    const final = foto({}, [acao("a1"), acao("la")]);
    const r = reaplicarMudancasLocais(antes, agora, final).foto;
    expect([...r.acoes.keys()].sort()).toEqual(["a1", "a2", "la"]);
  });
});

describe("base gravada", () => {
  it("ida e volta pela serialização", async () => {
    const f = foto(
      {
        atividades: [atividade("academia")],
        agendas: [agenda("nov", "2026-11-01", "2026-11-30", [compromisso("c1", "academia")])],
      },
      [acao("a1")],
      "Ana",
    );
    const repo = criarSincronizacaoRepositoryLocal(criarArmazenamentoEmMemoria());
    await repo.gravarBase(U, f, new Date("2026-11-20T18:58:00Z"));
    const lida = await repo.lerBase(U);
    expect(lida?.sincronizadoEm.toISOString()).toBe("2026-11-20T18:58:00.000Z");
    expect(lida && fotosIguais(lida.foto, f)).toBe(true);
    expect(await repo.lerBase("outra")).toBeNull();
  });

  it("base ilegível vira null (a próxima é a primeira, que não apaga nada)", () => {
    expect(lerBase(undefined)).toBeNull();
    expect(lerBase({ versao: 9 })).toBeNull();
    const texto = JSON.parse(serializarBase(foto(), new Date())) as Record<string, unknown>;
    expect(lerBase({ ...texto, acoes: [{ semId: true }] })).toBeNull();
  });

  it("dono: grava e apaga", async () => {
    const repo = criarSincronizacaoRepositoryLocal(criarArmazenamentoEmMemoria());
    expect(await repo.lerDono()).toBeNull();
    await repo.gravarDono(U);
    expect(await repo.lerDono()).toBe(U);
    await repo.gravarDono(null);
    expect(await repo.lerDono()).toBeNull();
  });
});

describe("fotoDasLinhas", () => {
  it("ignora linhas inválidas e conta quantas", () => {
    const { foto: f, ignoradas } = fotoDasLinhas({
      atividades: [
        { id: "a", nome: "A", icone: "sol", categoria: null, criada_em: "2026-11-01T00:00:00Z" },
        { id: "b", nome: "", icone: "sol", categoria: null, criada_em: "2026-11-01T00:00:00Z" },
      ],
      agendas: [],
      compromissos: [],
      avulsos: [],
      registros: [],
      acoes: [{ id: "x", categoria: "voar", rotulo: null, criado_em: "2026-11-01T00:00:00Z" }],
      perfil: { nome: "Ana" },
    });
    expect([...f.atividades.keys()]).toEqual(["a"]);
    expect(f.nome).toBe("Ana");
    expect(ignoradas).toBe(2);
  });

  it("mesclarFotos de três fotos iguais devolve a mesma", () => {
    const f = foto({ atividades: [atividade("academia")] }, [acao("a1")], "Ana");
    expect(fotosIguais(mesclarFotos(f, f, f).foto, f)).toBe(true);
  });
});
