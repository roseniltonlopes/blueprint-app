import { fireEvent, screen } from "@testing-library/react-native";
import HomeScreen from "../screens/HomeScreen";
import { renderComTema } from "./utils";

async function abrirHome() {
  await renderComTema(<HomeScreen />);
}

function total() {
  return screen.getByTestId("progresso-total").props.children;
}

describe("HomeScreen: cabeçalho e registro rápido (F01, F02, F03, F05)", () => {
  it("abre com a data, a saudação da hora e o contador zerado", async () => {
    await abrirHome();
    expect(screen.getByText("Sábado, 17 de outubro")).toBeTruthy();
    expect(screen.getByText("Boa tarde")).toBeTruthy();
    expect(total()).toBe(0);
    expect(screen.getByText("Toque em uma categoria para começar o plano.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir perfil" })).toBeTruthy();
  });

  it("não há botão de registrar parado esperando seleção", async () => {
    await abrirHome();
    expect(screen.queryByText("Escolha uma categoria para registrar")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Registrar / })).toBeNull();
  });

  it("1 toque no chip registra a ação, atualiza o contador e mostra o aviso", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: "Hidratação, 0 hoje" }));
    expect(total()).toBe(1);
    expect(screen.getByRole("button", { name: "Hidratação, 1 hoje" })).toBeTruthy();
    expect(screen.getByText("Faltam 4 para fechar o dia.")).toBeTruthy();
    expect(screen.getByText("Hidratação registrado às 15:58")).toBeTruthy();
  });

  it("cada toque é um registro, e o Desfazer remove só o último", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: /^Descanso/ }));
    await fireEvent.press(screen.getByRole("button", { name: /^Descanso/ }));
    expect(total()).toBe(2);
    await fireEvent.press(screen.getByRole("button", { name: "Desfazer" }));
    expect(total()).toBe(1);
    expect(screen.getByRole("button", { name: "Descanso, 1 hoje" })).toBeTruthy();
  });

  it("sem ações nos dias anteriores, não mostra o selo de sequência", async () => {
    await abrirHome();
    expect(screen.queryByLabelText(/^Sequência de/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: /^Estudo/ }));
    expect(screen.getByLabelText("Sequência de 1 dia")).toBeTruthy();
  });
});
