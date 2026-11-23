import { NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, screen } from "@testing-library/react-native";
import Raiz from "../navigation/Raiz";
import { autenticacaoFalsa, renderComTema } from "./utils";

function abrirApp(autenticacao: ReturnType<typeof autenticacaoFalsa> | null) {
  return renderComTema(
    <NavigationContainer>
      <Raiz />
    </NavigationContainer>,
    { autenticacao },
  );
}

describe("Entrada obrigatória", () => {
  it("sem sessão, abre na tela de entrada e as abas não aparecem", async () => {
    await abrirApp(autenticacaoFalsa());
    expect(await screen.findByText(/Sua semana,/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Hoje" })).toBeNull();
  });

  it("depois de entrar, troca sozinho para as abas", async () => {
    const autenticacao = autenticacaoFalsa();
    autenticacao.contas.set("ana@exemplo.com", { senha: "certa-123", userId: "u1" });
    await abrirApp(autenticacao);

    await fireEvent.changeText(await screen.findByLabelText("E-mail"), "ana@exemplo.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "certa-123");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("tab", { name: "Hoje" })).toBeTruthy();
    expect(screen.queryByText(/Sua semana,/)).toBeNull();
  });

  it("com a sessão salva, abre direto nas abas", async () => {
    await abrirApp(autenticacaoFalsa({ userId: "u1", email: "ana@exemplo.com" }));
    expect(await screen.findByRole("tab", { name: "Hoje" })).toBeTruthy();
  });

  it("ao sair da conta, volta para a tela de entrada", async () => {
    const autenticacao = autenticacaoFalsa({ userId: "u1", email: "ana@exemplo.com" });
    await abrirApp(autenticacao);
    expect(await screen.findByRole("tab", { name: "Hoje" })).toBeTruthy();

    await act(async () => {
      autenticacao.emitir(null);
    });
    expect(await screen.findByText(/Sua semana,/)).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Hoje" })).toBeNull();
  });

  it("criar conta com confirmação de e-mail continua na entrada com o aviso", async () => {
    const autenticacao = autenticacaoFalsa();
    autenticacao.respostaDoCadastro = "confirmarEmail";
    await abrirApp(autenticacao);

    await fireEvent.press(await screen.findByRole("radio", { name: "Criar conta" }));
    await fireEvent.changeText(screen.getByLabelText("Nome"), "Bia Lima");
    await fireEvent.changeText(screen.getByLabelText("Data de nascimento"), "01022000");
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "bia@exemplo.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "senha-123");
    await fireEvent.press(screen.getByTestId("aceite-dos-termos"));
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByTestId("aviso-da-conta")).toHaveTextContent(/Confirme o e-mail/);
    expect(screen.queryByRole("tab", { name: "Hoje" })).toBeNull();
    expect(autenticacao.chamadas).toEqual([
      expect.stringMatching(/^cadastrar:bia@exemplo\.com:Bia Lima:2000-02-01:/),
    ]);
  });

  it("sem Supabase configurado (desenvolvimento), abre direto nas abas", async () => {
    await abrirApp(null);
    expect(await screen.findByRole("tab", { name: "Hoje" })).toBeTruthy();
  });
});
