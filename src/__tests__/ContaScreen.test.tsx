import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import { CHAVE_DONO, criarSincronizacaoRepositoryLocal } from "../data/SincronizacaoRepository";
import { ERRO_EMAIL, ERRO_SENHA_CURTA, MENSAGENS_DA_CONTA } from "../domain/conta";
import CartaoDeConta from "../components/CartaoDeConta";
import ContaScreen from "../screens/ContaScreen";
import { autenticacaoFalsa, remotoFalso, renderComTema } from "./utils";

function renderizarTela(autenticacao: ReturnType<typeof autenticacaoFalsa> | null, nome = "") {
  const navigation = { goBack: jest.fn() };
  const resultado = renderComTema(
    <ContaScreen
      navigation={navigation as never}
      route={{ key: "Conta", name: "Conta", params: undefined }}
    />,
    { autenticacao, perfil: { nome, foto: null } },
  );
  return { navigation, resultado };
}

const TEXTO_DO_ACEITE = "Li e aceito os Termos de Uso e a Política de Privacidade";

async function preencher(email: string, senha?: string) {
  await fireEvent.changeText(screen.getByLabelText("E-mail"), email);
  if (senha !== undefined) await fireEvent.changeText(screen.getByLabelText("Senha"), senha);
}

describe("ContaScreen: entrar", () => {
  it("valida os campos antes de chamar o servidor", async () => {
    const autenticacao = autenticacaoFalsa();
    const { resultado } = renderizarTela(autenticacao);
    await resultado;

    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(screen.getByText(ERRO_EMAIL)).toBeTruthy();
    expect(screen.getByText("Digite a sua senha")).toBeTruthy();
    expect(autenticacao.chamadas).toEqual([]);
  });

  it("credencial inválida mostra a mensagem e mantém o que foi digitado", async () => {
    const autenticacao = autenticacaoFalsa();
    autenticacao.contas.set("ana@exemplo.com", { senha: "certa-123", userId: "u1" });
    const { navigation, resultado } = renderizarTela(autenticacao);
    await resultado;

    await preencher("ana@exemplo.com", "errada-123");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(MENSAGENS_DA_CONTA.credenciais),
    );
    expect(screen.getByLabelText("E-mail").props.value).toBe("ana@exemplo.com");
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it.each([
    ["emailNaoConfirmado", MENSAGENS_DA_CONTA.emailNaoConfirmado],
    ["rede", "Sem internet. Verifique a conexão e tente de novo."],
  ] as const)("erro %s tem mensagem clara", async (codigo, mensagem) => {
    const autenticacao = autenticacaoFalsa();
    autenticacao.proximoErro = codigo;
    const { resultado } = renderizarTela(autenticacao);
    await resultado;

    await preencher("ana@exemplo.com", "qualquer-1");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(mensagem));
  });

  it("entrar com sucesso volta para o Perfil", async () => {
    const autenticacao = autenticacaoFalsa();
    autenticacao.contas.set("ana@exemplo.com", { senha: "certa-123", userId: "u1" });
    const { navigation, resultado } = renderizarTela(autenticacao);
    await resultado;

    await preencher("  Ana@Exemplo.com ", "certa-123");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  });
});

describe("ContaScreen: criar conta e recuperar senha", () => {
  it("senha curta bloqueia o envio com a mensagem junto ao campo", async () => {
    const autenticacao = autenticacaoFalsa();
    const { resultado } = renderizarTela(autenticacao);
    await resultado;

    await fireEvent.press(screen.getByRole("radio", { name: "Criar conta" }));
    await preencher("ana@exemplo.com", "1234567");
    await fireEvent.press(screen.getByRole("checkbox", { name: TEXTO_DO_ACEITE }));
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    expect(screen.getByText(ERRO_SENHA_CURTA)).toBeTruthy();
    expect(autenticacao.chamadas).toEqual([]);
  });

  it("com confirmação de e-mail, avisa e volta para Entrar; o nome do perfil vai junto", async () => {
    const autenticacao = autenticacaoFalsa();
    autenticacao.respostaDoCadastro = "confirmarEmail";
    const { navigation, resultado } = renderizarTela(autenticacao, "Ana Souza");
    await resultado;

    await fireEvent.press(screen.getByRole("radio", { name: "Criar conta" }));
    await preencher("ana@exemplo.com", "senha-forte-1");
    await fireEvent.press(screen.getByRole("checkbox", { name: TEXTO_DO_ACEITE }));
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() =>
      expect(screen.getByTestId("aviso-da-conta")).toHaveTextContent(
        "Enviamos um link para ana@exemplo.com. Confirme o e-mail e depois entre.",
      ),
    );
    expect(autenticacao.chamadas).toEqual([
      "cadastrar:ana@exemplo.com:Ana Souza:termos=2026-11-22",
    ]);
    expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it("e-mail já cadastrado mostra para usar Entrar", async () => {
    const autenticacao = autenticacaoFalsa();
    autenticacao.proximoErro = "emailJaCadastrado";
    const { resultado } = renderizarTela(autenticacao);
    await resultado;

    await fireEvent.press(screen.getByRole("radio", { name: "Criar conta" }));
    await preencher("ana@exemplo.com", "senha-forte-1");
    await fireEvent.press(screen.getByRole("checkbox", { name: TEXTO_DO_ACEITE }));
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(MENSAGENS_DA_CONTA.emailJaCadastrado),
    );
  });

  it("esqueci a senha envia o link sem revelar se a conta existe", async () => {
    const autenticacao = autenticacaoFalsa();
    const { resultado } = renderizarTela(autenticacao);
    await resultado;

    await fireEvent.press(screen.getByRole("button", { name: "Esqueci a senha" }));
    expect(screen.queryByLabelText("Senha")).toBeNull();
    await preencher("ana@exemplo.com");
    await fireEvent.press(screen.getByRole("button", { name: "Enviar link" }));
    await waitFor(() =>
      expect(screen.getByTestId("aviso-da-conta")).toHaveTextContent(/Se houver conta/),
    );
    expect(autenticacao.chamadas).toEqual(["recuperar:ana@exemplo.com"]);
  });

  it("sem Supabase configurado, avisa que a conta não está disponível", async () => {
    const { resultado } = renderizarTela(null);
    await resultado;
    expect(
      screen.getByText("A conta na nuvem não está disponível nesta versão do app."),
    ).toBeTruthy();
  });
});

describe("CartaoDeConta no Perfil", () => {
  it("sem sessão convida a entrar", async () => {
    const aoAbrirConta = jest.fn();
    await renderComTema(<CartaoDeConta aoAbrirConta={aoAbrirConta} />, {
      autenticacao: autenticacaoFalsa(),
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Entrar ou criar conta" }));
    expect(aoAbrirConta).toHaveBeenCalled();
  });

  it("sem Supabase configurado, avisa que a conta não está disponível", async () => {
    await renderComTema(<CartaoDeConta aoAbrirConta={jest.fn()} />);
    expect(screen.getByText(/não está disponível nesta versão/)).toBeTruthy();
  });

  it("com sessão: e-mail, hora da sincronização, sincronizar agora e sair perguntando", async () => {
    const autenticacao = autenticacaoFalsa({ userId: "u1", email: "ana@exemplo.com" });
    const remoto = remotoFalso();
    const repositorio = criarSincronizacaoRepositoryLocal(criarArmazenamentoEmMemoria());
    await renderComTema(<CartaoDeConta aoAbrirConta={jest.fn()} />, {
      autenticacao,
      nuvem: { remoto, repositorio },
    });

    expect(await screen.findByText("ana@exemplo.com")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId("estado-da-sincronizacao")).toHaveTextContent(
        "Sincronizado às 15:58",
      ),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Sincronizar agora" }));
    await waitFor(() => expect(remoto.execucoes.length).toBe(2));

    await fireEvent.press(screen.getByRole("button", { name: "Sair" }));
    expect(screen.getByText("Manter os dados neste aparelho?")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Manter e sair" }));
    expect(await screen.findByRole("button", { name: "Entrar ou criar conta" })).toBeTruthy();
    expect(autenticacao.chamadas).toContain("sair");
  });

  it("migração ausente aparece no cartão", async () => {
    const autenticacao = autenticacaoFalsa({ userId: "u1", email: "ana@exemplo.com" });
    const remoto = remotoFalso();
    remoto.semRegistros = true;
    const repositorio = criarSincronizacaoRepositoryLocal(criarArmazenamentoEmMemoria());
    await renderComTema(<CartaoDeConta aoAbrirConta={jest.fn()} />, {
      autenticacao,
      nuvem: { remoto, repositorio },
    });
    await waitFor(() =>
      expect(screen.getByTestId("estado-da-sincronizacao")).toHaveTextContent(
        "O banco precisa da migração 002",
      ),
    );
  });

  it("outra conta no aparelho: pede para trocar os dados", async () => {
    const autenticacao = autenticacaoFalsa({ userId: "u1", email: "ana@exemplo.com" });
    const repositorio = criarSincronizacaoRepositoryLocal(
      criarArmazenamentoEmMemoria({ [CHAVE_DONO]: "outra" }),
    );
    await renderComTema(<CartaoDeConta aoAbrirConta={jest.fn()} />, {
      autenticacao,
      nuvem: { remoto: remotoFalso(), repositorio },
    });
    await waitFor(() =>
      expect(screen.getByTestId("estado-da-sincronizacao")).toHaveTextContent(
        "Os dados deste aparelho serão trocados pelos da conta ana@exemplo.com",
      ),
    );
    expect(screen.getByRole("button", { name: "Trocar os dados" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar e sair" })).toBeTruthy();
  });
});
