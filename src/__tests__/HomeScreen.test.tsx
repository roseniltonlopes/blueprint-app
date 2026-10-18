import { fireEvent, screen } from "@testing-library/react-native";
import HomeScreen from "../screens/HomeScreen";
import { renderComTema } from "./utils";

function botaoPrincipal() {
  return screen.getByRole("button", { name: /Registrar|Escolha uma categoria/ });
}

async function abrirHome() {
  await renderComTema(<HomeScreen />);
}

describe("HomeScreen (F01, F02, F03, F05)", () => {
  it("abre sem seleção, com o botão desabilitado e o contador zerado", async () => {
    await abrirHome();
    expect(screen.getByText("Sábado, 17 de outubro")).toBeTruthy();
    expect(screen.getByText("Escolha uma categoria para registrar")).toBeTruthy();
    expect(botaoPrincipal().props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByTestId("progresso-total").props.children).toBe(0);
    expect(screen.getByText("Toque em uma categoria para começar o plano.")).toBeTruthy();
  });

  it("não registra nada ao tocar no botão sem categoria (defeito da v1)", async () => {
    await abrirHome();
    await fireEvent.press(botaoPrincipal());
    expect(screen.getByTestId("progresso-total").props.children).toBe(0);
  });

  it("destaca uma categoria por vez e habilita o botão com o nome dela", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: /^Estudo/ }));
    expect(screen.getByText("Registrar Estudo")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Estudo/ }).props.accessibilityState).toMatchObject({
      selected: true,
    });

    await fireEvent.press(screen.getByRole("button", { name: /^Exercício/ }));
    expect(screen.getByText("Registrar Exercício")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Estudo/ }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it("registrar cria uma ação, atualiza contadores e limpa a seleção", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: /^Hidratação/ }));
    await fireEvent.press(screen.getByText("Registrar Hidratação"));

    expect(screen.getByTestId("progresso-total").props.children).toBe(1);
    expect(screen.getByRole("button", { name: "Hidratação, 1 hoje" })).toBeTruthy();
    expect(screen.getByText("Faltam 4 para fechar o dia.")).toBeTruthy();
    expect(screen.getByText("Escolha uma categoria para registrar")).toBeTruthy();
  });

  it("toques repetidos no botão registram uma única ação", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: /^Descanso/ }));
    const botao = botaoPrincipal();
    await fireEvent.press(botao);
    await fireEvent.press(botao);
    await fireEvent.press(botao);
    expect(screen.getByTestId("progresso-total").props.children).toBe(1);
  });

  it("chave de tema alterna para o modo escuro", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("radio", { name: "Modo escuro" }));
    expect(screen.getByRole("radio", { name: "Modo escuro" }).props.accessibilityState).toEqual({
      selected: true,
    });
  });
});
