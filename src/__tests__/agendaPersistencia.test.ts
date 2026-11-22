import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import {
  CHAVE_AGENDA,
  carregarAgendaSegura,
  criarAgendaRepositoryLocal,
  migrarAgenda,
} from "../data/AgendaRepository";
import { DADOS_AGENDA_VAZIOS, type DadosAgenda } from "../domain/agenda";

const dados: DadosAgenda = {
  atividades: [
    {
      id: "academia",
      nome: "Academia",
      icone: "exercicio",
      categoria: "exercicio",
      criadaEm: "2026-11-01T10:00:00.000Z",
    },
  ],
  agendas: [
    {
      id: "nov",
      nome: "Novembro de 2026",
      inicio: "2026-11-01",
      fim: "2026-11-30",
      compromissos: [
        {
          id: "c1",
          atividadeId: "academia",
          dias: [1, 3],
          inicio: "05:00",
          fim: "06:00",
          detalhe: "Peito",
          antecedenciaMin: 15,
        },
      ],
    },
  ],
  avulsos: [{ id: "v1", atividadeId: "academia", data: "2026-11-21", inicio: "09:00", fim: null }],
  registros: [],
};

function criar(inicial: Record<string, string> = {}) {
  const armazenamento = criarArmazenamentoEmMemoria(inicial);
  const avisos: string[] = [];
  const repositorio = criarAgendaRepositoryLocal(armazenamento, {
    aoAvisar: (m) => avisos.push(m),
    agora: () => new Date(1000),
  });
  return { armazenamento, avisos, repositorio };
}

function conteudo(parcial: Record<string, unknown>) {
  return JSON.stringify({ versao: 1, atividades: [], agendas: [], avulsos: [], ...parcial });
}

describe("AgendaRepository", () => {
  it("devolve a agenda vazia quando não há nada salvo", async () => {
    const { repositorio } = criar();
    expect(await repositorio.carregar()).toEqual(DADOS_AGENDA_VAZIOS);
  });

  it("guarda e recupera os dados, com a versão no texto gravado", async () => {
    const { repositorio, armazenamento } = criar();
    await repositorio.salvar(dados);
    expect(await repositorio.carregar()).toEqual(dados);
    const gravado = JSON.parse(armazenamento.dados.get(CHAVE_AGENDA) ?? "{}") as { versao: number };
    expect(gravado.versao).toBe(2);
  });

  it("guarda à parte o conteúdo ilegível e abre vazio", async () => {
    const { repositorio, armazenamento, avisos } = criar({ [CHAVE_AGENDA]: "{{" });
    const resultado = await repositorio.ler();
    expect(resultado).toMatchObject({ dados: DADOS_AGENDA_VAZIOS, corrompido: true });
    expect(armazenamento.dados.has(CHAVE_AGENDA)).toBe(false);
    expect(armazenamento.dados.get(`${CHAVE_AGENDA}:corrompido:1000`)).toBe("{{");
    expect(avisos).toHaveLength(1);
  });

  it("trata versão desconhecida e array solto como não reconhecidos, sem apagar", async () => {
    for (const texto of [JSON.stringify({ versao: 99, agendas: [] }), JSON.stringify([1, 2])]) {
      const { repositorio, armazenamento } = criar({ [CHAVE_AGENDA]: texto });
      expect((await repositorio.ler()).corrompido).toBe(true);
      expect(armazenamento.dados.get(`${CHAVE_AGENDA}:corrompido:1000`)).toBe(texto);
    }
  });

  it("descarta compromisso de atividade inexistente e conta o descarte", async () => {
    const agenda = {
      ...dados.agendas[0],
      compromissos: [
        ...dados.agendas[0].compromissos,
        { id: "c2", atividadeId: "fantasma", dias: [2], inicio: "08:00", fim: null },
      ],
    };
    const { repositorio, avisos } = criar({
      [CHAVE_AGENDA]: conteudo({ atividades: dados.atividades, agendas: [agenda] }),
    });
    const resultado = await repositorio.ler();
    expect(resultado.dados.agendas[0].compromissos.map((c) => c.id)).toEqual(["c1"]);
    expect(resultado.descartados).toBe(1);
    expect(avisos).toHaveLength(1);
  });

  it("descarta atividade sem nome, agenda com fim antes do início e avulso com data inválida", async () => {
    const { repositorio } = criar({
      [CHAVE_AGENDA]: conteudo({
        atividades: [
          ...dados.atividades,
          {
            id: "x",
            nome: "  ",
            icone: "outro",
            categoria: null,
            criadaEm: "2026-11-01T00:00:00.000Z",
          },
        ],
        agendas: [
          ...dados.agendas,
          { id: "ruim", nome: "Ruim", inicio: "2027-01-10", fim: "2027-01-01", compromissos: [] },
        ],
        avulsos: [
          ...dados.avulsos,
          { id: "v2", atividadeId: "academia", data: "2026-02-30", inicio: "09:00", fim: null },
        ],
      }),
    });
    const { dados: lidos, descartados } = await repositorio.ler();
    expect(lidos).toEqual(dados);
    expect(descartados).toBe(3);
  });

  it("descarta ids repetidos, mantendo o primeiro", () => {
    const resultado = migrarAgenda({
      versao: 1,
      atividades: [...dados.atividades, { ...dados.atividades[0], nome: "Outra" }],
      agendas: [],
      avulsos: [],
    });
    expect(resultado?.dados.atividades).toEqual(dados.atividades);
    expect(resultado?.descartados).toBe(1);
  });

  it("mantém a agenda de início mais antigo quando duas se sobrepõem", async () => {
    const sobreposta = {
      id: "meio",
      nome: "Meio",
      inicio: "2026-11-20",
      fim: "2026-12-20",
      compromissos: [],
    };
    const { repositorio } = criar({
      [CHAVE_AGENDA]: conteudo({
        atividades: dados.atividades,
        agendas: [sobreposta, dados.agendas[0]],
      }),
    });
    const { dados: lidos, descartados } = await repositorio.ler();
    expect(lidos.agendas.map((a) => a.id)).toEqual(["nov"]);
    expect(descartados).toBe(1);
  });

  it("duas gravações seguidas terminam com a última no disco", async () => {
    const { repositorio } = criar();
    const primeira = repositorio.salvar(DADOS_AGENDA_VAZIOS);
    const segunda = repositorio.salvar(dados);
    await Promise.all([primeira, segunda]);
    expect(await repositorio.carregar()).toEqual(dados);
  });
});

describe("AgendaRepository: proteção dos dados", () => {
  const orfao = {
    id: "c2",
    atividadeId: "fantasma",
    dias: [2],
    inicio: "08:00",
    fim: null,
  };

  function conteudoComOrfao() {
    return conteudo({
      atividades: dados.atividades,
      agendas: [{ ...dados.agendas[0], compromissos: [...dados.agendas[0].compromissos, orfao] }],
    });
  }

  it("guarda uma cópia do conteúdo original quando descarta itens", async () => {
    const texto = conteudoComOrfao();
    const { repositorio, armazenamento } = criar({ [CHAVE_AGENDA]: texto });
    await repositorio.ler();
    expect(armazenamento.dados.get(`${CHAVE_AGENDA}:descartados`)).toBe(texto);
  });

  it("não sobrescreve a cópia anterior em novas leituras", async () => {
    const texto = conteudoComOrfao();
    const { repositorio, armazenamento } = criar({ [CHAVE_AGENDA]: texto });
    await repositorio.ler();
    await armazenamento.setItem(CHAVE_AGENDA, conteudoComOrfao() + " ");
    await repositorio.ler();
    expect(armazenamento.dados.get(`${CHAVE_AGENDA}:descartados`)).toBe(texto);
  });

  it("não cria cópia quando nada foi descartado", async () => {
    const { repositorio, armazenamento } = criar();
    await repositorio.salvar(dados);
    await repositorio.ler();
    expect(armazenamento.dados.has(`${CHAVE_AGENDA}:descartados`)).toBe(false);
  });

  it("falha a leitura, sem apagar o original, quando a cópia do conteúdo ilegível não pôde ser gravada", async () => {
    const armazenamento = criarArmazenamentoEmMemoria({ [CHAVE_AGENDA]: "{{" });
    const semEscrita = {
      ...armazenamento,
      setItem: async () => {
        throw new Error("disco cheio");
      },
    };
    const repositorio = criarAgendaRepositoryLocal(semEscrita, { aoAvisar: () => {} });
    await expect(repositorio.carregar()).rejects.toThrow("disco cheio");
    expect(armazenamento.dados.get(CHAVE_AGENDA)).toBe("{{");
  });
});

describe("carregarAgendaSegura", () => {
  it("devolve os dados e permite gravar quando a leitura funciona", async () => {
    const { repositorio } = criar();
    await repositorio.salvar(dados);
    expect(await carregarAgendaSegura(repositorio, () => {})).toEqual({ dados, gravar: true });
  });

  it("quando a leitura falha devolve agenda vazia, avisa e proíbe gravar", async () => {
    const repositorio = {
      carregar: jest.fn().mockRejectedValue(new Error("falha de leitura")),
      salvar: jest.fn(),
    };
    const avisos: string[] = [];
    const resultado = await carregarAgendaSegura(repositorio, (m) => avisos.push(m));
    expect(resultado).toEqual({ dados: DADOS_AGENDA_VAZIOS, gravar: false });
    expect(avisos).toHaveLength(1);
  });
});
