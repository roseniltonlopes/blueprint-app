import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, screen } from "@testing-library/react-native";
import type { Agenda, Atividade, DadosAgenda } from "../domain/agenda";
import {
  SEM_PLANO,
  nivelDoCumprimento,
  planoDoDia,
  planoDoMes,
  resumoDoPlano,
} from "../domain/calendario";
import type { RegistroCompromisso } from "../domain/registros";
import CalendarioScreen from "../screens/CalendarioScreen";
import { renderComTema } from "./utils";

// O relógio dos testes marca sábado, 17 de outubro de 2026, 15:58.

const academia: Atividade = {
  id: "academia",
  nome: "Academia",
  icone: "outro",
  categoria: "exercicio",
  criadaEm: "2026-10-01T00:00:00.000Z",
};
const leitura: Atividade = { ...academia, id: "leitura", nome: "Leitura", categoria: "estudo" };

const outubro: Agenda = {
  id: "out",
  nome: "Outubro de 2026",
  inicio: "2026-10-01",
  fim: "2026-10-31",
  compromissos: [
    // Sábados: academia e leitura. Segundas: só academia.
    { id: "c1", atividadeId: "academia", dias: [6, 1], inicio: "07:00", fim: "08:00" },
    { id: "c2", atividadeId: "leitura", dias: [6], inicio: "21:00", fim: null },
  ],
};

function registro(
  origemId: string,
  data: string,
  status: RegistroCompromisso["status"],
): RegistroCompromisso {
  return {
    id: `${origemId}-${data}`,
    origem: "agenda",
    origemId,
    atividadeId: origemId === "c1" ? "academia" : "leitura",
    nomeAtividade: origemId === "c1" ? "Academia" : "Leitura",
    categoria: null,
    data,
    inicio: origemId === "c1" ? "07:00" : "21:00",
    fim: null,
    status,
    acaoId: null,
    registradoEm: `${data}T12:00:00.000Z`,
  };
}

function dados(registros: RegistroCompromisso[] = []): DadosAgenda {
  return {
    atividades: [academia, leitura],
    agendas: [outubro],
    avulsos: [{ id: "v1", atividadeId: "leitura", data: "2026-10-14", inicio: "10:00", fim: null }],
    registros,
  };
}

describe("planoDoDia", () => {
  it("conta os compromissos da agenda e os avulsos do dia", () => {
    expect(planoDoDia(dados(), new Date(2026, 9, 10))).toEqual({
      planejados: 2,
      feitos: 0,
      naoFeitos: 0,
      percentual: 0,
    });
    // Quarta-feira, 14: só o avulso.
    expect(planoDoDia(dados(), new Date(2026, 9, 14)).planejados).toBe(1);
  });

  it("calcula o percentual pelo Feito sobre o planejado", () => {
    const comRegistros = dados([
      registro("c1", "2026-10-10", "feito"),
      registro("c2", "2026-10-10", "nao_fui"),
    ]);
    expect(planoDoDia(comRegistros, new Date(2026, 9, 10))).toEqual({
      planejados: 2,
      feitos: 1,
      naoFeitos: 1,
      percentual: 50,
    });
  });

  it("dia sem compromisso não tem plano", () => {
    // Terça-feira, 13.
    expect(planoDoDia(dados(), new Date(2026, 9, 13))).toEqual(SEM_PLANO);
  });
});

describe("planoDoMes e resumoDoPlano", () => {
  it("guarda só os dias com plano", () => {
    const mes = planoDoMes(dados(), 2026, 9);
    // 5 sábados + 4 segundas + 1 avulso em outubro de 2026.
    expect(mes.size).toBe(10);
    expect(mes.has("2026-10-13")).toBe(false);
  });

  it("o resumo do mês ignora os dias que ainda não chegaram", () => {
    const comRegistros = dados([
      registro("c1", "2026-10-10", "feito"),
      registro("c2", "2026-10-10", "feito"),
      registro("c1", "2026-10-17", "feito"),
    ]);
    const mes = planoDoMes(comRegistros, 2026, 9);
    const resumo = resumoDoPlano(mes, new Date(2026, 9, 17, 15, 58));
    // Até o dia 17: sábados 3, 10 e 17 (2 cada), segundas 5 e 12 (1 cada) e o avulso do dia 14.
    expect(resumo).toEqual({ planejados: 9, feitos: 3, percentual: 33 });
  });

  it("sem nenhum plano até hoje, o percentual fica vazio", () => {
    expect(resumoDoPlano(new Map(), new Date(2026, 9, 17))).toEqual({
      planejados: 0,
      feitos: 0,
      percentual: null,
    });
  });
});

describe("nivelDoCumprimento", () => {
  it.each([
    [null, 0],
    [0, 0],
    [1, 1],
    [33, 1],
    [34, 2],
    [66, 2],
    [67, 3],
    [99, 3],
    [100, 4],
  ] as const)("%s%% vira o nível %s", (percentual, nivel) => {
    expect(nivelDoCumprimento(percentual)).toBe(nivel);
  });
});

describe("CalendarioScreen ligado à agenda", () => {
  async function abrir(agenda: DadosAgenda = dados()) {
    await renderComTema(
      <NavigationContainer>
        <CalendarioScreen />
      </NavigationContainer>,
      { agenda },
    );
  }

  it("o dia mostra quanto do plano foi feito", async () => {
    await abrir(dados([registro("c1", "2026-10-10", "feito")]));
    const dia = screen.getByTestId("dia-2026-10-10");
    expect(dia.props.accessibilityLabel).toContain("1 de 2 feitos, 50%");
    expect(screen.getByTestId("dia-2026-10-24").props.accessibilityLabel).toContain(
      "2 compromissos planejados",
    );
  });

  it("hoje abre com os compromissos do dia e marcar Feito atualiza a contagem", async () => {
    await abrir();
    expect(screen.getByTestId("situacao-do-dia").props.children).toBe("0 de 2 feitos");

    await fireEvent.press(screen.getByRole("button", { name: "Feito: Academia, 07:00 a 08:00" }));
    expect(screen.getByTestId("situacao-do-dia").props.children).toBe("1 de 2 feitos");
    expect(screen.getByTestId("dia-2026-10-17").props.accessibilityLabel).toContain("50%");
  });

  it("dia futuro mostra o plano sem os botões de marcar", async () => {
    await abrir();
    await fireEvent.press(screen.getByTestId("dia-2026-10-24"));
    expect(screen.getByTestId("situacao-do-dia").props.children).toBe("2 planejados");
    expect(screen.getByLabelText("Planejado: Academia, 07:00 a 08:00")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Feito:/ })).toBeNull();
  });

  it("dia sem compromisso avisa que não há nada", async () => {
    await abrir();
    await fireEvent.press(screen.getByTestId("dia-2026-10-13"));
    expect(screen.getByTestId("situacao-do-dia").props.children).toBe("Sem compromissos");
    expect(screen.getByText("Nenhum compromisso nem hábito neste dia.")).toBeTruthy();
  });
});
