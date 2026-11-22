import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import {
  CHAVE_AGENDA,
  CHAVE_DESCARTADOS,
  VERSAO_AGENDA,
  criarAgendaRepositoryLocal,
  migrarAgenda,
} from "../data/AgendaRepository";
import { DADOS_AGENDA_VAZIOS } from "../domain/agenda";
import type { RegistroCompromisso } from "../domain/registros";

const academia = {
  id: "academia",
  nome: "Academia",
  icone: "exercicio",
  categoria: "exercicio",
  criadaEm: "2026-11-01T10:00:00.000Z",
};

function registro(parcial: Partial<RegistroCompromisso> = {}): RegistroCompromisso {
  return {
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
    ...parcial,
  };
}

function repositorio(inicial: Record<string, string> = {}) {
  const armazenamento = criarArmazenamentoEmMemoria(inicial);
  const avisos: string[] = [];
  const repo = criarAgendaRepositoryLocal(armazenamento, {
    aoAvisar: (m) => avisos.push(m),
    agora: () => new Date(1000),
  });
  return { armazenamento, avisos, repo };
}

describe("Registros na persistência da agenda (versão 2)", () => {
  it("lê o formato da versão 1 com a lista de registros vazia, sem descartar nada", () => {
    const v1 = { versao: 1, atividades: [academia], agendas: [], avulsos: [] };
    expect(migrarAgenda(v1)).toEqual({
      dados: { ...DADOS_AGENDA_VAZIOS, atividades: [academia] },
      descartados: 0,
    });
  });

  it("ignora um campo registros que apareça num conteúdo da versão 1", () => {
    const v1 = { versao: 1, atividades: [], agendas: [], avulsos: [], registros: [registro()] };
    expect(migrarAgenda(v1)?.dados.registros).toEqual([]);
  });

  it("grava na versão atual e recupera os registros", async () => {
    const { repo, armazenamento } = repositorio();
    const dados = { ...DADOS_AGENDA_VAZIOS, atividades: [], registros: [registro()] };
    await repo.salvar(dados);
    expect(await repo.carregar()).toEqual(dados);
    const gravado = JSON.parse(armazenamento.dados.get(CHAVE_AGENDA) ?? "{}") as {
      versao: number;
    };
    expect(gravado.versao).toBe(VERSAO_AGENDA);
  });

  it("mantém registro cuja atividade ou compromisso não existe mais (é a cópia do passado)", () => {
    const resultado = migrarAgenda({
      versao: 2,
      atividades: [],
      agendas: [],
      avulsos: [],
      registros: [registro({ atividadeId: "apagada", origemId: "apagado" })],
    });
    expect(resultado?.dados.registros).toHaveLength(1);
    expect(resultado?.descartados).toBe(0);
  });

  it("descarta registros inválidos e repetidos e guarda o conteúdo original", async () => {
    const conteudo = JSON.stringify({
      versao: 2,
      atividades: [],
      agendas: [],
      avulsos: [],
      registros: [
        registro(),
        registro({ id: "r1", origemId: "c2" }),
        registro({ id: "r2" }),
        registro({ id: "r3", status: "talvez" as RegistroCompromisso["status"] }),
        registro({ id: "r4", status: "nao_fui" }),
        "lixo",
        registro({ id: "r5", origemId: "c5", status: "nao_fui", acaoId: null }),
      ],
    });
    const { repo, armazenamento, avisos } = repositorio({ [CHAVE_AGENDA]: conteudo });
    const resultado = await repo.ler();
    expect(resultado.dados.registros.map((r) => r.id)).toEqual(["r1", "r5"]);
    expect(resultado.descartados).toBe(5);
    expect(armazenamento.dados.get(CHAVE_DESCARTADOS)).toBe(conteudo);
    expect(avisos).toHaveLength(1);
  });
});
