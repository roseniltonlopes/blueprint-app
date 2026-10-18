import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { criarAcoesRepositoryLocal } from "../data/AcoesRepository";
import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import { criarAcao } from "../domain/acoes";
import { AcoesProvider } from "../hooks/useAcoes";
import HomeScreen from "../screens/HomeScreen";
import PerfilScreen from "../screens/PerfilScreen";
import { ThemeProvider } from "../theme/ThemeProvider";
import { AGORA, relogioFixo, renderComTema } from "./utils";
import { SafeAreaProvider } from "react-native-safe-area-context";

const METRICAS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("AcoesProvider com repositório", () => {
  it("não regrava na abertura e grava cada registro e cada Desfazer", async () => {
    const armazenamento = criarArmazenamentoEmMemoria();
    const repo = criarAcoesRepositoryLocal(armazenamento, { aoAvisar: () => {} });
    const salvar = jest.spyOn(repo, "salvar");
    const existente = criarAcao("hidratacao", AGORA);

    await render(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ThemeProvider initialMode="light">
          <AcoesProvider relogio={relogioFixo()} acoesIniciais={[existente]} repositorio={repo}>
            <HomeScreen />
          </AcoesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(salvar).not.toHaveBeenCalled();
    expect(screen.getByTestId("progresso-total").props.children).toBe(1);

    await fireEvent.press(screen.getByRole("button", { name: /^Estudo/ }));
    await fireEvent.press(screen.getByText("Registrar Estudo"));
    await waitFor(async () => expect(await repo.carregar()).toHaveLength(2));

    await fireEvent.press(screen.getByRole("button", { name: "Desfazer" }));
    await waitFor(async () => expect(await repo.carregar()).toEqual([existente]));
  });

  it("usa a meta das preferências no anel", async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ThemeProvider initialMode="light">
          <AcoesProvider relogio={relogioFixo()} meta={8}>
            <HomeScreen />
          </AcoesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByText("de 8")).toBeTruthy();
    expect(screen.getByRole("progressbar").props.accessibilityValue).toMatchObject({ max: 8 });
  });
});

describe("ThemeProvider com persistência", () => {
  it("avisa cada mudança de tema e destaque, mas não a abertura", async () => {
    const aoMudar = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ThemeProvider initialMode="dark" initialDestaque="indigo" aoMudar={aoMudar}>
          <AcoesProvider relogio={relogioFixo()}>
            <PerfilScreen />
          </AcoesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(aoMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Escuro" }).props.accessibilityState).toEqual({
      selected: true,
    });

    await fireEvent.press(screen.getByRole("radio", { name: "Claro" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ modo: "light", destaque: "indigo" });

    await fireEvent.press(screen.getByRole("radio", { name: "Cor de destaque Laranja" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ modo: "light", destaque: "laranja" });
  });
});

describe("renderComTema continua sem persistência", () => {
  it("funciona só em memória", async () => {
    await renderComTema(<HomeScreen />);
    expect(screen.getByTestId("progresso-total").props.children).toBe(0);
  });
});
