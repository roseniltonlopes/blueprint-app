import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { LimiteDeErro } from "../components/LimiteDeErro";
import { renderComTema } from "./utils";

let quebrar = true;

function TelaQueQuebra() {
  if (quebrar) {
    throw new Error("falha com dado pessoal: ana@exemplo.com");
  }
  return <Text>Tela funcionando</Text>;
}

describe("Tela de erro", () => {
  beforeEach(() => {
    quebrar = true;
    // O React registra o erro capturado no console; aqui ele é esperado.
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("mostra a mensagem amigável sem a mensagem técnica do erro", async () => {
    await renderComTema(
      <LimiteDeErro>
        <TelaQueQuebra />
      </LimiteDeErro>,
    );
    expect(screen.getByText("Algo deu errado")).toBeTruthy();
    expect(screen.getByText(/Seus dados continuam salvos no aparelho/)).toBeTruthy();
    expect(screen.queryByText(/ana@exemplo.com/)).toBeNull();
  });

  it("Tentar de novo volta para a tela quando o problema passou", async () => {
    await renderComTema(
      <LimiteDeErro>
        <TelaQueQuebra />
      </LimiteDeErro>,
    );
    quebrar = false;
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(screen.getByText("Tela funcionando")).toBeTruthy();
  });
});
