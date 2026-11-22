import { fireEvent, screen } from "@testing-library/react-native";
import type { Atividade, DadosAgenda } from "../domain/agenda";
import { listarDias, painelDoMes } from "../domain/painel";
import type { RegistroCompromisso } from "../domain/registros";
import HistoricoScreen from "../screens/HistoricoScreen";
import { AGORA, renderComTema } from "./utils";

// AGORA: sábado, 17 de outubro de 2026. Outubro começa numa quinta-feira.

function atividade(id: string, nome: string, categoria: Atividade["categoria"]): Atividade {
  return { id, nome, icone: "outro", categoria, criadaEm: "2026-09-01T00:00:00.000Z" };
}

function registro(
  id: string,
  atividadeId: string,
  origemId: string,
  data: string,
  status: RegistroCompromisso["status"],
  copia: Partial<RegistroCompromisso> = {},
): RegistroCompromisso {
  return {
    id,
    origem: "agenda",
    origemId,
    atividadeId,
    nomeAtividade: atividadeId,
    categoria: null,
    data,
    inicio: "05:00",
    fim: null,
    status,
    acaoId: null,
    registradoEm: "2026-10-01T00:00:00.000Z",
    ...copia,
  };
}

const DADOS: DadosAgenda = {
  atividades: [
    atividade("academia", "Academia", "exercicio"),
    atividade("trabalho", "Trabalho", null),
  ],
  agendas: [
    {
      id: "out",
      nome: "Outubro de 2026",
      inicio: "2026-10-01",
      fim: "2026-10-31",
      compromissos: [
        // Segunda, quarta e sexta: dias 2, 5, 7, 9, 12, 14 e 16 antes de hoje.
        { id: "c1", atividadeId: "academia", dias: [1, 3, 5], inicio: "05:00", fim: "06:00" },
        // Segunda a sexta: 12 dias antes de hoje.
        { id: "c2", atividadeId: "trabalho", dias: [1, 2, 3, 4, 5], inicio: "12:00", fim: "18:00" },
      ],
    },
  ],
  avulsos: [],
  registros: [
    registro("r1", "academia", "c1", "2026-10-02", "feito"),
    registro("r2", "academia", "c1", "2026-10-05", "feito"),
    registro("r3", "academia", "c1", "2026-10-07", "feito"),
    registro("r4", "academia", "c1", "2026-10-09", "nao_fui"),
    registro("r5", "trabalho", "c2", "2026-10-01", "feito"),
    // Atividade que já saiu do catálogo: conta pela cópia guardada no registro.
    registro("r6", "corrida", "apagado", "2026-10-03", "feito", {
      nomeAtividade: "Corrida",
      categoria: "exercicio",
    }),
    registro("s1", "academia", "c0", "2026-09-07", "feito"),
    registro("s2", "academia", "c0", "2026-09-09", "feito"),
  ],
};

describe("painelDoMes", () => {
  it("conta feitos, não fui e sem registro por categoria e atividade", () => {
    const painel = painelDoMes(DADOS, 2026, 9, AGORA);
    expect(painel).toMatchObject({ feitos: 5, naoFui: 1, semRegistro: 14, percentual: 25 });
    expect(painel.grupos.map((g) => [g.categoria, g.feitos])).toEqual([
      ["exercicio", 4],
      [null, 1],
    ]);
    const [academia, corrida] = painel.grupos[0].atividades;
    expect(academia).toMatchObject({
      nome: "Academia",
      feitos: 3,
      naoFui: 1,
      semRegistro: 3,
      diasFeitos: [2, 5, 7],
      diasNaoFui: [9],
      diasSemRegistro: [12, 14, 16],
      feitosNoMesAnterior: 2,
    });
    expect(corrida).toMatchObject({ nome: "Corrida", feitos: 1, semRegistro: 0 });
    expect(painel.grupos[1].atividades[0]).toMatchObject({
      nome: "Trabalho",
      feitos: 1,
      semRegistro: 11,
    });
  });

  it("hoje e o futuro não contam como sem registro", () => {
    // Sexta, 2 de outubro: só a quinta, dia 1, já passou.
    const painel = painelDoMes({ ...DADOS, registros: [] }, 2026, 9, new Date(2026, 9, 2, 9, 0));
    expect(painel.semRegistro).toBe(1);
    expect(painel.grupos.map((g) => g.atividades.map((a) => a.nome))).toEqual([["Trabalho"]]);
  });

  it("mês sem nada planejado nem registrado fica vazio", () => {
    expect(painelDoMes(DADOS, 2026, 11, AGORA)).toEqual({
      feitos: 0,
      naoFui: 0,
      semRegistro: 0,
      percentual: null,
      grupos: [],
    });
  });
});

describe("listarDias", () => {
  it("separa com vírgula e 'e'", () => {
    expect(listarDias([])).toBe("");
    expect(listarDias([4])).toBe("4");
    expect(listarDias([2, 4, 9])).toBe("2, 4 e 9");
  });
});

describe("Histórico: painel de compromissos do mês (etapa 4)", () => {
  it("responde quantas vezes cada atividade foi feita e mostra os dias", async () => {
    await renderComTema(<HistoricoScreen />, { agenda: DADOS });
    await fireEvent.press(screen.getByText("Mês"));
    expect(screen.getByText("Compromissos da agenda")).toBeTruthy();
    expect(screen.getByTestId("percentual-do-mes").props.children).toBe(
      "Cumpriu 25% do que estava na agenda.",
    );

    const linha = screen.getByRole("button", {
      name: "Academia, 3 vezes, 1 a mais que no mês anterior",
    });
    expect(screen.queryByText("Feito: 2, 5 e 7 de outubro")).toBeNull();
    await fireEvent.press(linha);
    expect(screen.getByText("Feito: 2, 5 e 7 de outubro")).toBeTruthy();
    expect(screen.getByText("Não fui: 9 de outubro")).toBeTruthy();
    expect(screen.getByText("Sem registro: 12, 14 e 16 de outubro")).toBeTruthy();
  });

  it("mês anterior sem agenda mostra o aviso", async () => {
    await renderComTema(<HistoricoScreen />, { agenda: { ...DADOS, registros: [] } });
    await fireEvent.press(screen.getByText("Mês"));
    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("Nenhum compromisso da agenda neste mês.")).toBeTruthy();
  });
});
