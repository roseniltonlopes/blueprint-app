import { fireEvent, screen } from "@testing-library/react-native";
import { criarAcao, type Acao } from "../domain/acoes";
import CalendarioScreen from "../screens/CalendarioScreen";
import HistoricoScreen from "../screens/HistoricoScreen";
import PerfilScreen from "../screens/PerfilScreen";
import { renderComTema } from "./utils";

function em(dia: number, hora: number, categoria: Acao["categoria"] = "estudo", mes = 9) {
  return criarAcao(categoria, new Date(2026, mes, dia, hora, 0));
}

describe("CalendarioScreen (F11, F12)", () => {
  const acoes = [
    em(17, 8, "hidratacao"),
    em(17, 9, "hidratacao"),
    em(17, 10, "exercicio"),
    em(16, 9),
    em(1, 9),
    em(30, 9, "estudo", 8),
  ];

  it("abre no mês atual com hoje selecionado e o resumo do dia por categoria", async () => {
    await renderComTema(<CalendarioScreen />, { acoes });
    expect(screen.getByText("outubro de 2026")).toBeTruthy();
    expect(screen.getByText("Hoje, 17 de outubro")).toBeTruthy();
    expect(screen.getByText("3 ações")).toBeTruthy();
    expect(screen.getByText("Hidratação 2")).toBeTruthy();
    expect(screen.getByText("Exercício 1")).toBeTruthy();
    expect(screen.getByLabelText("5 ações em outubro")).toBeTruthy();
    expect(screen.getByLabelText("3 dias com registro")).toBeTruthy();
  });

  it("tocar em um dia atualiza o resumo do dia", async () => {
    await renderComTema(<CalendarioScreen />, { acoes });
    await fireEvent.press(screen.getByRole("button", { name: "16 de outubro, 1 ação" }));
    expect(screen.getByText("Sexta-feira, 16 de outubro")).toBeTruthy();
    expect(screen.getByText("Estudo 1")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "20 de outubro" }));
    expect(screen.getByText("Este dia ainda não chegou.")).toBeTruthy();
  });

  it("navega entre meses e mostra o resumo do mês visível", async () => {
    await renderComTema(<CalendarioScreen />, { acoes });
    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("setembro de 2026")).toBeTruthy();
    expect(screen.getByLabelText("1 ações em setembro")).toBeTruthy();
  });

  it("tocar em dia do mês vizinho troca o mês", async () => {
    await renderComTema(<CalendarioScreen />, { acoes });
    await fireEvent.press(screen.getByRole("button", { name: "30 de setembro, 1 ação" }));
    expect(screen.getByText("setembro de 2026")).toBeTruthy();
    expect(screen.getByText("Quarta-feira, 30 de setembro")).toBeTruthy();
  });
});

describe("PerfilScreen (F14, F17, F21)", () => {
  it("mostra total, sequência e mapa de calor", async () => {
    await renderComTema(<PerfilScreen />, { acoes: [em(17, 8), em(16, 9), em(15, 9), em(1, 9)] });
    expect(screen.getByLabelText("4 ações registradas")).toBeTruthy();
    expect(screen.getByLabelText("3 dias sequência atual")).toBeTruthy();
    expect(screen.getByLabelText(/Mapa de calor: 4 dias com registro/)).toBeTruthy();
  });

  it("troca aparência e cor de destaque", async () => {
    await renderComTema(<PerfilScreen />);
    await fireEvent.press(screen.getByRole("radio", { name: "Escuro" }));
    expect(screen.getByRole("radio", { name: "Escuro" }).props.accessibilityState).toEqual({
      selected: true,
    });

    await fireEvent.press(screen.getByRole("radio", { name: "Cor de destaque Laranja" }));
    expect(
      screen.getByRole("radio", { name: "Cor de destaque Laranja" }).props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      screen.getByRole("radio", { name: "Cor de destaque Gradiente" }).props.accessibilityState,
    ).toEqual({ selected: false });
  });
});

describe("Totais batem entre Histórico, Calendário e Perfil (docs/05)", () => {
  it("as mesmas ações dão o mesmo total nas três telas", async () => {
    // Todas na semana atual (11 a 17 de outubro), então semana = mês = total geral.
    const acoes = [em(11, 23), em(12, 0), em(14, 12), em(17, 8), em(17, 15, "outro")];

    const historico = await renderComTema(<HistoricoScreen />, { acoes });
    expect(screen.getByLabelText("5 ações na semana")).toBeTruthy();
    await historico.unmount();

    const calendario = await renderComTema(<CalendarioScreen />, { acoes });
    expect(screen.getByLabelText("5 ações em outubro")).toBeTruthy();
    await calendario.unmount();

    await renderComTema(<PerfilScreen />, { acoes });
    expect(screen.getByLabelText("5 ações registradas")).toBeTruthy();
  });
});
