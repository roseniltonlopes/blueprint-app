import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthWeakPasswordError,
} from "@supabase/supabase-js";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../auth/AuthProvider";
import { traduzirErro } from "../auth/supabaseAuth";
import {
  ErroDeAutenticacao,
  type DadosDeCadastro,
  type ResultadoDoCadastro,
  type ServicoDeAutenticacao,
  type Usuario,
} from "../auth/tipos";
import { validarFormulario } from "../auth/validacao";
import { deslocamentoGmt, descreverFuso } from "../domain/fuso";
import AuthScreen from "../screens/AuthScreen";
import { ThemeProvider } from "../theme/ThemeProvider";
import { Text } from "react-native";
import { METRICAS } from "./utils";

describe("validação do formulário (F18)", () => {
  const ok = { nome: "Ana Souza", email: "ana@exemplo.com", senha: "12345678" };

  it("aceita dados válidos", () => {
    expect(validarFormulario("cadastro", ok)).toEqual({});
  });

  it("senha com menos de 8 caracteres bloqueia", () => {
    expect(validarFormulario("entrar", { ...ok, senha: "1234567" }).senha).toMatch(/8 caracteres/);
  });

  it("e-mail inválido e nome vazio mostram erro por campo", () => {
    const erros = validarFormulario("cadastro", { nome: "  ", email: "ana@", senha: ok.senha });
    expect(erros).toEqual({ nome: "Digite seu nome.", email: "Digite um e-mail válido." });
  });

  it("no modo Entrar o nome não é exigido", () => {
    expect(validarFormulario("entrar", { ...ok, nome: "" })).toEqual({});
  });
});

describe("tradução de erros do Supabase", () => {
  it.each([
    [new AuthApiError("x", 400, "invalid_credentials"), "credenciais"],
    [new AuthApiError("x", 400, "email_not_confirmed"), "emailNaoConfirmado"],
    [new AuthApiError("x", 422, "user_already_exists"), "emailJaCadastrado"],
    [new AuthApiError("x", 429, "over_request_rate_limit"), "muitasTentativas"],
    [new AuthWeakPasswordError("x", 422, ["length"]), "senhaFraca"],
    [new AuthRetryableFetchError("x", 0), "rede"],
    [new TypeError("Network request failed"), "rede"],
    [new Error("???"), "desconhecido"],
  ])("%s → %s", (erro, codigo) => {
    expect(traduzirErro(erro).codigo).toBe(codigo);
  });
});

describe("fuso no cadastro (F20)", () => {
  it("descreve cidade e deslocamento", () => {
    const data = new Date(2026, 9, 17);
    expect(descreverFuso("America/Sao_Paulo", data)).toBe(`São Paulo (${deslocamentoGmt(data)})`);
    expect(deslocamentoGmt(data)).toMatch(/^GMT[+-]\d{1,2}(:\d{2})?$/);
  });
});

function servicoFalso(parcial: Partial<ServicoDeAutenticacao> = {}) {
  let ouvinte: ((u: Usuario | null) => void) | null = null;
  const servico: ServicoDeAutenticacao = {
    usuarioAtual: async () => null,
    aoMudarUsuario: (cb) => {
      ouvinte = cb;
      return () => {
        ouvinte = null;
      };
    },
    entrar: jest.fn(async () => {}),
    cadastrar: jest.fn(async (): Promise<ResultadoDoCadastro> => ({ tipo: "logado" })),
    sair: jest.fn(async () => {}),
    ...parcial,
  };
  return { servico, emitir: (u: Usuario | null) => ouvinte?.(u) };
}

function Situacao() {
  const { estado } = useAuth();
  return <Text testID="situacao">{estado.situacao}</Text>;
}

async function abrirTela(servico: ServicoDeAutenticacao) {
  await render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <ThemeProvider initialMode="light">
        <AuthProvider servico={servico}>
          <AuthScreen />
          <Situacao />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

async function preencher(campos: Partial<Record<"Nome completo" | "E-mail" | "Senha", string>>) {
  for (const [rotulo, valor] of Object.entries(campos)) {
    await fireEvent.changeText(screen.getByLabelText(rotulo), valor);
  }
}

describe("AuthScreen", () => {
  it("valida antes de chamar o servidor e mostra o erro junto ao campo", async () => {
    const { servico } = servicoFalso();
    await abrirTela(servico);
    await preencher({ "Nome completo": "Ana", "E-mail": "ana@exemplo.com", Senha: "123" });
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));

    expect(screen.getByText("A senha precisa ter pelo menos 8 caracteres.")).toBeTruthy();
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it("cadastra com nome, e-mail, senha e fuso detectado", async () => {
    const { servico } = servicoFalso();
    await abrirTela(servico);
    await preencher({ "Nome completo": " Ana ", "E-mail": "ana@exemplo.com", Senha: "segredo123" });
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => expect(servico.cadastrar).toHaveBeenCalledTimes(1));
    const dados = (servico.cadastrar as jest.Mock).mock.calls[0][0] as DadosDeCadastro;
    expect(dados).toMatchObject({ nome: " Ana ", email: "ana@exemplo.com", senha: "segredo123" });
    expect(typeof dados.fuso === "string" || dados.fuso === null).toBe(true);
  });

  it("com confirmação de e-mail, avisa e troca para Entrar mantendo o e-mail", async () => {
    const { servico } = servicoFalso({
      cadastrar: jest.fn(
        async () => ({ tipo: "confirmarEmail", email: "ana@exemplo.com" }) as const,
      ),
    });
    await abrirTela(servico);
    await preencher({ "Nome completo": "Ana", "E-mail": "ana@exemplo.com", Senha: "segredo123" });
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));

    expect(
      await screen.findByText(/Enviamos um link de confirmação para ana@exemplo.com/),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(screen.getByLabelText("E-mail").props.value).toBe("ana@exemplo.com");
  });

  it("erro de rede mostra mensagem clara e mantém o que foi digitado", async () => {
    const { servico } = servicoFalso({
      entrar: jest.fn(async () => {
        throw new ErroDeAutenticacao(
          "rede",
          "Sem conexão com o servidor. Verifique a internet e tente de novo.",
        );
      }),
    });
    await abrirTela(servico);
    await fireEvent.press(screen.getByRole("radio", { name: "Entrar" }));
    await preencher({ "E-mail": "ana@exemplo.com", Senha: "segredo123" });
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/Sem conexão com o servidor/)).toBeTruthy();
    expect(screen.getByLabelText("E-mail").props.value).toBe("ana@exemplo.com");
    expect(screen.getByLabelText("Senha").props.value).toBe("segredo123");
  });

  it("mostrar senha alterna a máscara", async () => {
    const { servico } = servicoFalso();
    await abrirTela(servico);
    expect(screen.getByLabelText("Senha").props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(screen.getByLabelText("Senha").props.secureTextEntry).toBe(false);
  });
});

describe("AuthProvider", () => {
  it("segue a sessão: desconectado → conectado → desconectado", async () => {
    const { servico, emitir } = servicoFalso();
    await abrirTela(servico);
    await waitFor(() => expect(screen.getByTestId("situacao").props.children).toBe("desconectado"));

    await waitFor(() => {
      emitir({ id: "u1", email: "ana@exemplo.com", nome: "Ana" });
      expect(screen.getByTestId("situacao").props.children).toBe("conectado");
    });
    await waitFor(() => {
      emitir(null);
      expect(screen.getByTestId("situacao").props.children).toBe("desconectado");
    });
  });

  it("sem Supabase configurado fica indisponível (modo só local)", async () => {
    await render(
      <AuthProvider servico={null}>
        <Situacao />
      </AuthProvider>,
    );
    expect(screen.getByTestId("situacao").props.children).toBe("indisponivel");
  });
});
