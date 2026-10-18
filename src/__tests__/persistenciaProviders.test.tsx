import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { criarAcoesRepositoryLocal } from "../data/AcoesRepository";
import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import { AcoesProvider } from "../hooks/useAcoes";
import HomeScreen from "../screens/HomeScreen";
import PerfilScreen from "../screens/PerfilScreen";
import { ThemeProvider } from "../theme/ThemeProvider";
import { AGORA, METRICAS, gerarIdDeTeste, nova, relogioFixo, renderComTema } from "./utils";

describe("AcoesProvider com repositório", () => {
  it("não regrava na abertura e grava cada registro e cada Desfazer", async () => {
    const repo = criarAcoesRepositoryLocal(criarArmazenamentoEmMemoria(), {
      gerarId: gerarIdDeTeste,
      aoAvisar: () => {},
    });
    const salvar = jest.spyOn(repo, "salvar");
    const existente = nova("hidratacao", AGORA);

    await render(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ThemeProvider initialMode="light">
          <AcoesProvider
            relogio={relogioFixo()}
            gerarId={gerarIdDeTeste}
            estadoInicial={{ acoes: [existente], exclusoesPendentes: [], lapides: [] }}
            repositorio={repo}
          >
            <HomeScreen />
          </AcoesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(salvar).not.toHaveBeenCalled();
    expect(screen.getByTestId("progresso-total").props.children).toBe(1);

    await fireEvent.press(screen.getByRole("button", { name: /^Estudo/ }));
    await fireEvent.press(screen.getByText("Registrar Estudo"));
    await waitFor(async () => expect((await repo.carregar()).acoes).toHaveLength(2));

    await fireEvent.press(screen.getByRole("button", { name: "Desfazer" }));
    await waitFor(async () => expect((await repo.carregar()).acoes).toEqual([existente]));
  });

  it("usa a meta das preferências no anel", async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICAS}>
        <ThemeProvider initialMode="light">
          <AcoesProvider relogio={relogioFixo()} meta={8} gerarId={gerarIdDeTeste}>
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
          <AcoesProvider relogio={relogioFixo()} gerarId={gerarIdDeTeste}>
            <PerfilScreen />
          </AcoesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(aoMudar).not.toHaveBeenCalled();

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
