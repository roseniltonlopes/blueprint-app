import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { View } from "react-native";
import Campo from "../components/Campo";
import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import { criarSincronizacaoRepositoryLocal } from "../data/SincronizacaoRepository";
import HomeScreen from "../screens/HomeScreen";
import PerfilScreen from "../screens/PerfilScreen";
import { autenticacaoFalsa, remotoFalso, renderComTema } from "./utils";

function conectado() {
  return {
    autenticacao: autenticacaoFalsa({ userId: "u1", email: "ana@exemplo.com" }),
    nuvem: {
      remoto: remotoFalso(),
      repositorio: criarSincronizacaoRepositoryLocal(criarArmazenamentoEmMemoria()),
    },
  };
}

describe("nome de quem usa o app", () => {
  it("a saudação da Home leva o primeiro nome", async () => {
    await renderComTema(<HomeScreen />, { perfil: { nome: "Ana Souza", foto: null } });
    expect(screen.getByText("Boa tarde, Ana")).toBeTruthy();
    expect(screen.queryByTestId("cartao-do-nome")).toBeNull();
  });

  it("o nome salvo na nuvem aparece na Home e no Perfil depois de entrar", async () => {
    const { autenticacao, nuvem } = conectado();
    nuvem.remoto.perfis.set("u1", { nome: "Ana Souza" });
    await renderComTema(
      <View>
        <HomeScreen />
        <PerfilScreen />
      </View>,
      { autenticacao, nuvem },
    );
    expect(await screen.findByText("Boa tarde, Ana")).toBeTruthy();
    expect(screen.getByText("Ana Souza")).toBeTruthy();
    expect(screen.queryByText("Convidado")).toBeNull();
  });

  it("conta antiga sem nome: a Home pede o nome e ele vai para o perfil", async () => {
    const { autenticacao, nuvem } = conectado();
    await renderComTema(<HomeScreen />, { autenticacao, nuvem });

    expect(await screen.findByTestId("cartao-do-nome")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Seu nome"), "Rosa Lima");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar nome" }));

    expect(screen.getByText("Boa tarde, Rosa")).toBeTruthy();
    expect(screen.queryByTestId("cartao-do-nome")).toBeNull();
    await waitFor(() => expect(nuvem.remoto.perfis.get("u1")).toEqual({ nome: "Rosa Lima" }));
  });

  it("sem conta (modo de desenvolvimento) não pede o nome", async () => {
    await renderComTema(<HomeScreen />);
    expect(screen.getByText("Boa tarde")).toBeTruthy();
    expect(screen.queryByTestId("cartao-do-nome")).toBeNull();
  });
});

describe("Campo de senha", () => {
  it("o olho mostra e esconde o que foi digitado", async () => {
    await renderComTema(<Campo rotulo="Senha" valor="segredo1" aoMudar={() => {}} seguro />);
    const campo = screen.getByLabelText("Senha");
    expect(campo.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole("button", { name: "Mostrar a senha" }));
    expect(screen.getByLabelText("Senha").props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole("button", { name: "Esconder a senha" }));
    expect(screen.getByLabelText("Senha").props.secureTextEntry).toBe(true);
  });

  it("campo comum não tem o olho", async () => {
    await renderComTema(<Campo rotulo="E-mail" valor="" aoMudar={() => {}} />);
    expect(screen.queryByRole("button", { name: "Mostrar a senha" })).toBeNull();
  });
});
