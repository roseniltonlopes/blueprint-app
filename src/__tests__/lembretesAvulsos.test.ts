import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import { criarAgendaRepositoryLocal, migrarAgenda } from "../data/AgendaRepository";
import {
  ocorrenciasDoDia,
  validarAvulso,
  type Atividade,
  type Avulso,
  type DadosAgenda,
} from "../domain/agenda";
import {
  ANTECEDENCIA_PADRAO,
  OPCOES_DE_ANTECEDENCIA,
  opcoesDeAntecedencia,
  planejarAlertas,
  rotuloDaAntecedencia,
} from "../domain/alertas";
import { avulsoDaLinha, avulsoParaLinha } from "../sincronizacao/conversores";

/** Sábado, 17 de outubro de 2026, 15:58. */
const AGORA = new Date(2026, 9, 17, 15, 58);

const aula: Atividade = {
  id: "aula",
  nome: "Aula",
  icone: "estudo",
  categoria: "estudo",
  criadaEm: "2026-10-01T00:00:00.000Z",
};

const avulso: Avulso = {
  id: "v1",
  atividadeId: "aula",
  data: "2026-10-17",
  inicio: "19:00",
  fim: null,
  antecedenciaMin: 15,
};

function dados(avulsos: Avulso[]): DadosAgenda {
  return { atividades: [aula], agendas: [], avulsos, registros: [] };
}

describe("opções de Avisar antes", () => {
  it("lista Sem aviso, Na hora, 5, 10, 15, 30 e 60, com 10 de padrão", () => {
    expect(OPCOES_DE_ANTECEDENCIA).toEqual([undefined, 0, 5, 10, 15, 30, 60]);
    expect(ANTECEDENCIA_PADRAO).toBe(10);
    expect(OPCOES_DE_ANTECEDENCIA.map(rotuloDaAntecedencia)).toEqual([
      "Sem aviso",
      "Na hora",
      "5 min",
      "10 min",
      "15 min",
      "30 min",
      "1 h",
    ]);
  });

  it("valor salvo fora da lista vira opção extra, em ordem", () => {
    expect(opcoesDeAntecedencia(20)).toEqual([undefined, 0, 5, 10, 15, 20, 30, 60]);
    expect(opcoesDeAntecedencia(120)).toEqual([undefined, 0, 5, 10, 15, 30, 60, 120]);
    expect(opcoesDeAntecedencia(15)).toEqual([...OPCOES_DE_ANTECEDENCIA]);
    expect(opcoesDeAntecedencia(undefined)).toEqual([...OPCOES_DE_ANTECEDENCIA]);
  });
});

describe("avulsos com aviso", () => {
  it("validam a antecedência como os compromissos", () => {
    const { id: _id, ...conteudo } = avulso;
    expect(validarAvulso(conteudo)).toBeNull();
    expect(validarAvulso({ ...conteudo, antecedenciaMin: 121 })).not.toBeNull();
    expect(validarAvulso({ ...conteudo, antecedenciaMin: 2.5 })).not.toBeNull();
  });

  it("a ocorrência do dia carrega o aviso e o alerta é planejado", () => {
    expect(ocorrenciasDoDia(dados([avulso]), AGORA)[0]).toMatchObject({
      chave: "avulso:v1",
      antecedenciaMin: 15,
    });
    const alertas = planejarAlertas(dados([avulso]), AGORA);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({
      id: "avulso:v1@2026-10-17",
      titulo: "Aula às 19:00",
      corpo: "Começa em 15 min.",
    });
    expect(alertas[0].quando).toEqual(new Date(2026, 9, 17, 18, 45));
  });

  it("avulso sem aviso não gera alerta", () => {
    const { antecedenciaMin: _sem, ...semAviso } = avulso;
    expect(planejarAlertas(dados([semAviso]), AGORA)).toEqual([]);
  });

  it("formato da versão 2 do aparelho continua válido, com ou sem o campo novo", async () => {
    const { antecedenciaMin: _sem, ...antigo } = avulso;
    const lido = migrarAgenda({ versao: 2, ...dados([antigo, { ...avulso, id: "v2" }]) });
    expect(lido?.descartados).toBe(0);
    expect(lido?.dados.avulsos).toEqual([antigo, { ...avulso, id: "v2" }]);

    const repo = criarAgendaRepositoryLocal(criarArmazenamentoEmMemoria());
    await repo.salvar(dados([avulso]));
    expect((await repo.carregar()).avulsos).toEqual([avulso]);
  });

  it("vai e volta da nuvem pela coluna antecedencia_min (migração 003)", () => {
    const linha = avulsoParaLinha(avulso, "u1");
    expect(linha.antecedencia_min).toBe(15);
    expect(avulsoDaLinha({ ...linha, inicio: "19:00:00" })).toEqual(avulso);
    const { antecedenciaMin: _sem, ...semAviso } = avulso;
    expect(avulsoParaLinha(semAviso, "u1").antecedencia_min).toBeNull();
    // Antes da 003 a coluna não vem na linha: o avulso fica sem aviso.
    const { antecedencia_min: _coluna, ...linhaAntiga } = linha;
    expect(avulsoDaLinha(linhaAntiga)).toEqual(semAviso);
    expect(avulsoDaLinha({ ...linha, antecedencia_min: "quinze" })).toBeNull();
  });
});
