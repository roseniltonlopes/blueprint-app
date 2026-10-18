import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, screen } from "@testing-library/react-native";
import { criarAcao } from "../domain/acoes";
import { somarDias } from "../domain/datas";
import Abas from "../navigation/Abas";
import HistoricoScreen from "../screens/HistoricoScreen";
import { AGORA, renderComTema } from "./utils";

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
