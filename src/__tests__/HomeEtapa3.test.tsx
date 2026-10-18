import { act, fireEvent, screen } from "@testing-library/react-native";
import { DURACAO_TOAST_MS } from "../components/Toast";
import HomeScreen from "../screens/HomeScreen";
import { renderComTema } from "./utils";

async function abrirHome() {
  await renderComTema(<HomeScreen />);
}

function total() {
  return screen.getByTestId("progresso-total").props.children;
}

async function registrar(categoria: RegExp) {
  await fireEvent.press(screen.getByRole("button", { name: categoria }));
  await fireEvent.press(screen.getByRole("button", { name: /^Registrar / }));
}

describe("Anel de progresso (F04)", () => {
  it("expõe o progresso para leitores de tela e para no máximo da meta", async () => {
    await abrirHome();
    const anel = () => screen.getByRole("progressbar");
    expect(anel().props.accessibilityValue).toEqual({ min: 0, max: 5, now: 0 });

    for (let i = 0; i < 6; i++) {
      await registrar(/^Estudo/);
    }
    expect(total()).toBe(6);
    expect(anel().props.accessibilityValue).toEqual({ min: 0, max: 5, now: 5 });
    expect(screen.getByText("Meta do dia concluída.")).toBeTruthy();
  });
});

describe("Toast com Desfazer (F07)", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("mostra a confirmação com horário e desfaz o registro", async () => {
    await abrirHome();
    await registrar(/^Exercício/);
    expect(screen.getByText("Exercício registrado às 15:58")).toBeTruthy();
    expect(total()).toBe(1);

    await fireEvent.press(screen.getByRole("button", { name: "Desfazer" }));
    expect(total()).toBe(0);
    expect(screen.getByRole("button", { name: "Exercício, 0 hoje" })).toBeTruthy();
    expect(screen.queryByText(/registrado às/)).toBeNull();
  });

  it("some sozinho depois de 5 segundos sem desfazer", async () => {
    jest.useFakeTimers();
    await abrirHome();
    await registrar(/^Descanso/);
    expect(screen.getByText(/Descanso registrado/)).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(DURACAO_TOAST_MS);
    });
    expect(screen.queryByText(/Descanso registrado/)).toBeNull();
    expect(total()).toBe(1);
  });
});

describe("Outro com nome livre (F06)", () => {
  async function abrirSheet() {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: /^Outro/ }));
  }

  it("abre o sheet com o botão desabilitado até haver um nome válido", async () => {
    await abrirSheet();
    expect(screen.getByText("Outra ação")).toBeTruthy();
    const botao = () => screen.getByRole("button", { name: /Registrar ação/ });
    expect(botao().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText("O que você fez?"), "   ");
    expect(botao().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText("O que você fez?"), "Leitura");
    expect(botao().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it("sugestão preenche o campo e registrar cria a ação com o nome", async () => {
    await abrirSheet();
    await fireEvent.press(screen.getByRole("button", { name: "Sugestão: Alongamento" }));
    expect(screen.getByLabelText("O que você fez?").props.value).toBe("Alongamento");

    await fireEvent.press(screen.getByRole("button", { name: /Registrar ação/ }));
    expect(screen.queryByText("Outra ação")).toBeNull();
    expect(total()).toBe(1);
    expect(screen.getByRole("button", { name: "Outro, 1 hoje" })).toBeTruthy();
    expect(screen.getByText("Alongamento registrado às 15:58")).toBeTruthy();
  });

  it("cancelar fecha sem registrar e reabre com o campo vazio", async () => {
    await abrirSheet();
    await fireEvent.changeText(screen.getByLabelText("O que você fez?"), "Rascunho");
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Outra ação")).toBeNull();
    expect(total()).toBe(0);

    await fireEvent.press(screen.getByRole("button", { name: /^Outro/ }));
    expect(screen.getByLabelText("O que você fez?").props.value).toBe("");
  });

  it("limita o campo a 40 caracteres", async () => {
    await abrirSheet();
    expect(screen.getByLabelText("O que você fez?").props.maxLength).toBe(40);
  });
});
