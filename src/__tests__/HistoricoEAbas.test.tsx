import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, screen } from "@testing-library/react-native";
import { criarAcao } from "../domain/acoes";
import { somarDias } from "../domain/datas";
import Abas from "../navigation/Abas";
import HistoricoScreen from "../screens/HistoricoScreen";
import { AGORA, relogioFixo, renderComTema } from "./utils";

function acaoEm(diasAtras: number, hora: number, categoria: "estudo" | "hidratacao" = "estudo") {
  const quando = somarDias(AGORA, -diasAtras);
  quando.setHours(hora, 5);
  return criarAcao(categoria, quando);
}

describe("HistoricoScreen", () => {
  it("mostra resumo da semana, sequência e melhor dia", async () => {
    const acoes = [
      acaoEm(0, 8),
      acaoEm(1, 9),
      acaoEm(1, 10),
      acaoEm(1, 11, "hidratacao"),
      acaoEm(2, 12),
    ];
    await renderComTema(<HistoricoScreen />, { acoes });

    expect(screen.getByText("11 a 17 de outubro")).toBeTruthy();
    expect(screen.getByLabelText("5 ações na semana")).toBeTruthy();
    expect(screen.getByLabelText("3 dias seguidos")).toBeTruthy();
    expect(screen.getByLabelText("sex melhor dia")).toBeTruthy();
    expect(screen.getByLabelText("sex: 3 ações")).toBeTruthy();
    expect(screen.getByText("Hoje")).toBeTruthy();
    expect(screen.getByText("Ontem")).toBeTruthy();
    expect(screen.getByText("3 ações")).toBeTruthy();
    expect(screen.queryByLabelText("11:05, Hidratação")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: /^Ontem/ }));
    expect(screen.getByLabelText("11:05, Hidratação")).toBeTruthy();
  });

  it("navega para a semana anterior e não passa da semana atual", async () => {
    await renderComTema(<HistoricoScreen />, { acoes: [acaoEm(7, 9)] });
    const proxima = screen.getByRole("button", { name: "Próxima semana" });
    expect(proxima.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByRole("button", { name: "Semana anterior" }));
    expect(screen.getByText("4 a 10 de outubro")).toBeTruthy();
    expect(screen.getByLabelText("sáb: 1 ação")).toBeTruthy();
  });

  it("mostra o estado vazio sem ações", async () => {
    await renderComTema(<HistoricoScreen />);
    expect(screen.getByText(/Nenhuma ação registrada ainda/)).toBeTruthy();
    expect(screen.getByLabelText("– melhor dia")).toBeTruthy();
    expect(screen.getByLabelText("0 dias seguidos")).toBeTruthy();
  });
});

describe("Abas (F10)", () => {
  it("registrar na Home aparece no Histórico", async () => {
    await renderComTema(
      <NavigationContainer>
        <Abas />
      </NavigationContainer>,
    );
    expect(screen.getAllByRole("tab").map((aba) => aba.props.accessibilityLabel)).toEqual([
      "Hoje",
      "Agenda",
      "Calendário",
      "Histórico",
      "Perfil",
    ]);
    expect(screen.getByRole("tab", { name: "Hoje" }).props.accessibilityState).toMatchObject({
      selected: true,
    });

    await fireEvent.press(screen.getByRole("button", { name: /^Estudo/ }));
    await fireEvent.press(screen.getByText("Registrar Estudo"));

    await fireEvent.press(screen.getByRole("tab", { name: "Histórico" }));
    expect(screen.getByLabelText("15:58, Estudo")).toBeTruthy();
    expect(screen.getByText("1 ação")).toBeTruthy();
  });
});

describe("HistoricoScreen: dia a dia", () => {
  it("mostra uma linha por dia, com hoje aberto e os outros fechados até tocar", async () => {
    await renderComTema(<HistoricoScreen />, {
      acoes: [acaoEm(0, 8), acaoEm(1, 9), acaoEm(1, 10), acaoEm(2, 12)],
    });

    expect(screen.getByLabelText("08:05, Estudo")).toBeTruthy();
    expect(screen.queryByLabelText("09:05, Estudo")).toBeNull();

    const ontem = screen.getByRole("button", { name: /^Ontem/ });
    expect(ontem.props.accessibilityState).toMatchObject({ expanded: false });
    await fireEvent.press(ontem);
    expect(screen.getByLabelText("09:05, Estudo")).toBeTruthy();
    expect(screen.getByLabelText("10:05, Estudo")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: /^Ontem/ }));
    expect(screen.queryByLabelText("09:05, Estudo")).toBeNull();
  });

  it("marca os dias sem ação como sem registros", async () => {
    await renderComTema(<HistoricoScreen />, { acoes: [acaoEm(0, 8)] });
    expect(screen.getAllByText("Sem registros")).toHaveLength(6);
  });

  it("não lista dias que ainda não chegaram", async () => {
    const quarta = new Date(2026, 9, 14, 10, 0);
    await renderComTema(<HistoricoScreen />, {
      relogio: relogioFixo(quarta),
      acoes: [criarAcao("estudo", new Date(2026, 9, 14, 9, 0))],
    });

    expect(screen.getByText("Hoje")).toBeTruthy();
    expect(screen.queryByText("Quinta-feira")).toBeNull();
    expect(screen.queryByText("Sábado")).toBeNull();
    expect(screen.getAllByText("Sem registros")).toHaveLength(3);
  });
});

describe("HistoricoScreen: mês", () => {
  const em = (categoria: "estudo" | "exercicio", mes: number, dia: number) =>
    criarAcao(categoria, new Date(2026, mes, dia, 9, 0));

  async function abrirMes(acoes: ReturnType<typeof criarAcao>[]) {
    await renderComTema(<HistoricoScreen />, { acoes });
    await fireEvent.press(screen.getByText("Mês"));
  }

  it("mostra as ações do mês por categoria e compara com o mês anterior", async () => {
    await abrirMes([
      em("exercicio", 9, 2),
      em("exercicio", 9, 3),
      em("exercicio", 9, 4),
      em("estudo", 9, 5),
      em("exercicio", 8, 10),
    ]);

    expect(screen.getByText("outubro de 2026")).toBeTruthy();
    expect(screen.getByLabelText("4 ações no mês")).toBeTruthy();
    expect(screen.getByLabelText("4 dias com registro")).toBeTruthy();
    expect(screen.getByLabelText("Exercício, 3 vezes, 2 a mais que no mês anterior")).toBeTruthy();
    expect(screen.getByLabelText("Estudo, 1 vez, 1 a mais que no mês anterior")).toBeTruthy();
  });

  it("diz quando fica igual ou menor que no mês anterior", async () => {
    await abrirMes([
      em("exercicio", 9, 2),
      em("exercicio", 9, 3),
      em("estudo", 9, 4),
      em("exercicio", 8, 1),
      em("exercicio", 8, 2),
      em("exercicio", 8, 3),
      em("estudo", 8, 4),
    ]);

    expect(screen.getByLabelText("Exercício, 2 vezes, 1 a menos que no mês anterior")).toBeTruthy();
    expect(screen.getByLabelText("Estudo, 1 vez, igual ao mês anterior")).toBeTruthy();
  });

  it("navega para meses anteriores e não passa do mês atual", async () => {
    await abrirMes([em("exercicio", 9, 2), em("exercicio", 8, 10)]);
    expect(
      screen.getByRole("button", { name: "Próximo mês" }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("setembro de 2026")).toBeTruthy();
    // Agosto não tem ação nenhuma: sem comparação para mostrar.
    expect(screen.getByLabelText("Exercício, 1 vez")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("agosto de 2026")).toBeTruthy();
    expect(screen.getByText("Nenhuma ação registrada neste mês.")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText("outubro de 2026")).toBeTruthy();
  });
});
