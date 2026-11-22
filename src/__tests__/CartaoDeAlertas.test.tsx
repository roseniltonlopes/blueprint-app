import { fireEvent, screen } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";
import CartaoDeAlertas, { INTENCAO_BATERIA } from "../components/CartaoDeAlertas";
import { renderComTema, servicoDeAlertasFalso } from "./utils";

const plataformaOriginal = Platform.OS;

function usarPlataforma(os: typeof Platform.OS) {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

describe("Cartão de alertas (docs/10, itens 3.1 e 3.2)", () => {
  afterEach(() => {
    usarPlataforma(plataformaOriginal);
    jest.restoreAllMocks();
  });

  it("com alertas ligados, avisa que a agenda dos alertas cobre 14 dias", async () => {
    await renderComTema(<CartaoDeAlertas />, {
      servicoDeAlertas: servicoDeAlertasFalso("concedida"),
    });
    expect(await screen.findByTestId("aviso-dos-dias")).toHaveTextContent(
      /próximos 14 dias.*uma vez por semana/,
    );
  });

  it("no Android, Liberar bateria abre a otimização de bateria do sistema", async () => {
    usarPlataforma("android");
    const enviar = jest.spyOn(Linking, "sendIntent").mockResolvedValue();
    await renderComTema(<CartaoDeAlertas />, {
      servicoDeAlertas: servicoDeAlertasFalso("concedida"),
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Liberar bateria" }));
    expect(enviar).toHaveBeenCalledWith(INTENCAO_BATERIA);
  });

  it("sem a tela de bateria no aparelho, abre as configurações do app", async () => {
    usarPlataforma("android");
    jest.spyOn(Linking, "sendIntent").mockRejectedValue(new Error("sem atividade"));
    const configuracoes = jest.spyOn(Linking, "openSettings").mockResolvedValue();
    await renderComTema(<CartaoDeAlertas />, {
      servicoDeAlertas: servicoDeAlertasFalso("concedida"),
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Liberar bateria" }));
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(configuracoes).toHaveBeenCalled();
  });
});
