import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import CartaoDePrivacidade, {
  MENSAGEM_APARELHO_LIMPO,
  MENSAGEM_CONTA_EXCLUIDA,
} from "../components/CartaoDePrivacidade";
import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import {
  CHAVE_DONO,
  chaveDaBase,
  criarSincronizacaoRepositoryLocal,
} from "../data/SincronizacaoRepository";
import type { Acao } from "../domain/acoes";
import type { DadosAgenda } from "../domain/agenda";
import { MENSAGENS_DA_CONTA } from "../domain/conta";
import { useAcoes } from "../hooks/useAcoes";
import { useAgenda } from "../hooks/useAgenda";
import { usePerfil } from "../hooks/usePerfil";
import {
  CONTATO,
  CONTROLADOR,
  POLITICA_DE_PRIVACIDADE,
  TERMOS_DE_USO,
  VERSAO_DOS_TERMOS,
  type DocumentoLegal,
} from "../legal/textos";
import ContaScreen from "../screens/ContaScreen";
import PrivacidadeScreen from "../screens/PrivacidadeScreen";
import TermosScreen from "../screens/TermosScreen";
import { Text } from "../ui/Text";
import { autenticacaoFalsa, remotoFalso, renderComTema, servicoDeAlertasFalso } from "./utils";

const TEXTO_DO_ACEITE = "Li e aceito os Termos de Uso e a Política de Privacidade";

function telaDeConta() {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const autenticacao = autenticacaoFalsa();
  const resultado = renderComTema(
    <ContaScreen
      navigation={navigation as never}
      route={{ key: "Conta", name: "Conta", params: undefined }}
    />,
    { autenticacao },
  );
  return { navigation, autenticacao, resultado };
}

describe("Aceite dos termos no cadastro", () => {
  it("Criar conta só habilita depois de marcar a caixa, que começa desmarcada", async () => {
    const { autenticacao, resultado } = telaDeConta();
    await resultado;
    await fireEvent.press(screen.getByRole("radio", { name: "Criar conta" }));

    const caixa = screen.getByRole("checkbox", { name: TEXTO_DO_ACEITE });
    expect(caixa.props.accessibilityState).toMatchObject({ checked: false });
    const botao = screen.getByRole("button", { name: "Criar conta" });
    expect(botao.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText("Nome"), "Ana");
    await fireEvent.changeText(screen.getByLabelText("Data de nascimento"), "03/12/1990");
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "senha-forte-1");
    await fireEvent.press(botao);
    expect(autenticacao.chamadas).toEqual([]);

    await fireEvent.press(caixa);
    expect(
      screen.getByRole("checkbox", { name: TEXTO_DO_ACEITE }).props.accessibilityState,
    ).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByRole("button", { name: "Criar conta" }));
    await waitFor(() =>
      expect(autenticacao.chamadas).toEqual([
        `cadastrar:ana@exemplo.com:Ana:1990-12-03:termos=${VERSAO_DOS_TERMOS}`,
      ]),
    );
  });

  it("os nomes dos documentos abrem as telas, também no modo Entrar", async () => {
    const { navigation, resultado } = telaDeConta();
    await resultado;
    await fireEvent.press(screen.getByRole("button", { name: "Termos de Uso" }));
    await fireEvent.press(screen.getByRole("button", { name: "Política de Privacidade" }));
    expect(navigation.navigate.mock.calls).toEqual([["Termos"], ["Privacidade"]]);

    await fireEvent.press(screen.getByRole("radio", { name: "Criar conta" }));
    await fireEvent.press(screen.getByRole("link", { name: "Política de Privacidade" }));
    expect(navigation.navigate).toHaveBeenLastCalledWith("Privacidade");
  });
});

describe("Textos legais", () => {
  it.each([
    ["Termos", TermosScreen, TERMOS_DE_USO],
    ["Privacidade", PrivacidadeScreen, POLITICA_DE_PRIVACIDADE],
  ] as const)("a tela %s mostra versão, data e todas as seções", async (rota, Tela, documento) => {
    await renderComTema(
      <Tela
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: rota, name: rota, params: undefined } as never}
      />,
    );
    expect(
      screen.getByText(`Versão ${documento.versao}, atualizada em ${documento.atualizadoEm}`),
    ).toBeTruthy();
    for (const secao of documento.secoes) {
      expect(screen.getByText(secao.titulo)).toBeTruthy();
    }
  });

  it("a política nomeia o controlador, o contato, a região e o que não é enviado", () => {
    const texto = JSON.stringify(POLITICA_DE_PRIVACIDADE);
    expect(texto).toContain(CONTROLADOR);
    expect(texto).toContain(CONTATO);
    expect(texto).toContain("sa-east-1");
    expect(texto).toContain("A foto do perfil");
    expect(texto).toContain("art. 18");
    expect(JSON.stringify(TERMOS_DE_USO)).toContain(
      "não oferece orientação médica, psicológica nem nutricional",
    );
  });

  it.each([
    ["landing/termos.html", TERMOS_DE_USO],
    ["landing/privacidade.html", POLITICA_DE_PRIVACIDADE],
  ] as const)("%s tem o mesmo texto do app", (arquivo, documento: DocumentoLegal) => {
    // O jest roda na raiz do projeto: o caminho é relativo a ela.
    const fs = jest.requireActual<{ readFileSync: (caminho: string, cod: "utf8") => string }>("fs");
    const html = fs
      .readFileSync(arquivo, "utf8")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      // O prettier quebra parágrafos longos em várias linhas: compara com os espaços juntados.
      .replace(/\s+/g, " ");
    for (const trecho of [
      documento.titulo,
      documento.versao,
      documento.introducao,
      ...documento.secoes.flatMap((s) => [s.titulo, ...s.paragrafos]),
    ]) {
      expect(html).toContain(trecho);
    }
  });
});

const U = "usuario-1";
const SESSAO = { userId: U, email: "ana@exemplo.com" };

const AGENDA: DadosAgenda = {
  atividades: [
    {
      id: "academia",
      nome: "Academia",
      icone: "exercicio",
      categoria: "exercicio",
      criadaEm: "2026-10-01T10:00:00.000Z",
    },
  ],
  agendas: [
    {
      id: "out",
      nome: "Outubro de 2026",
      inicio: "2026-10-01",
      fim: "2026-10-31",
      compromissos: [
        {
          id: "c1",
          atividadeId: "academia",
          dias: [0, 1, 2, 3, 4, 5, 6],
          inicio: "20:00",
          fim: null,
          antecedenciaMin: 10,
        },
      ],
    },
  ],
  avulsos: [],
  registros: [],
};

const ACAO: Acao = { id: "a1", categoria: "hidratacao", criadoEm: "2026-10-17T12:00:00.000Z" };

function Sonda() {
  const { acoes } = useAcoes();
  const { dados } = useAgenda();
  const { perfil } = usePerfil();
  return <Text testID="dados">{`${acoes.length}|${dados.atividades.length}|${perfil.nome}`}</Text>;
}

/** Perfil com a sessão de U e uma nuvem falsa; devolve o que os testes inspecionam. */
async function cartao(sessao: typeof SESSAO | null = SESSAO) {
  const autenticacao = autenticacaoFalsa(sessao);
  const armazenamento = criarArmazenamentoEmMemoria();
  const repositorio = criarSincronizacaoRepositoryLocal(armazenamento);
  const servicoDeAlertas = servicoDeAlertasFalso("concedida");
  await renderComTema(
    <>
      <Sonda />
      <CartaoDePrivacidade aoAbrirTermos={jest.fn()} aoAbrirPrivacidade={jest.fn()} />
    </>,
    {
      autenticacao,
      nuvem: { remoto: remotoFalso(), repositorio },
      acoes: [ACAO],
      agenda: AGENDA,
      perfil: { nome: "Ana", foto: null },
      servicoDeAlertas,
    },
  );
  if (sessao !== null) {
    // Espera a primeira sincronização gravar a base e o dono.
    await waitFor(() => expect(armazenamento.dados.get(CHAVE_DONO)).toBe(U));
  }
  return { autenticacao, armazenamento, servicoDeAlertas };
}

/** Confirma os dois alertas da exclusão (ou o único da limpeza) tocando no botão indicado. */
async function responderAlertas(alerta: jest.SpyInstance, ...botoes: string[]) {
  for (const [indice, texto] of botoes.entries()) {
    const chamada = alerta.mock.calls[indice] as [
      string,
      string,
      { text: string; onPress?: () => void }[],
    ];
    const botao = chamada[2].find((b) => b.text === texto);
    await act(async () => {
      botao?.onPress?.();
    });
  }
}

describe("Excluir conta e dados", () => {
  afterEach(() => jest.restoreAllMocks());

  it("sucesso: apaga na nuvem, sai e limpa o aparelho e os alertas", async () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { autenticacao, armazenamento, servicoDeAlertas } = await cartao();
    await waitFor(() => expect(servicoDeAlertas.agendados?.length).toBeGreaterThan(0));

    await fireEvent.press(screen.getByRole("button", { name: "Excluir minha conta e dados" }));
    expect(alerta.mock.calls[0][0]).toBe("Excluir a conta e os dados?");
    await responderAlertas(alerta, "Continuar", "Excluir definitivamente");

    await waitFor(() =>
      expect(screen.getByTestId("aviso-de-privacidade")).toHaveTextContent(MENSAGEM_CONTA_EXCLUIDA),
    );
    expect(autenticacao.chamadas).toContain("excluirConta");
    expect(screen.getByTestId("dados")).toHaveTextContent("0|0|");
    expect(armazenamento.dados.has(chaveDaBase(U))).toBe(false);
    expect(armazenamento.dados.has(CHAVE_DONO)).toBe(false);
    await waitFor(() => expect(servicoDeAlertas.agendados).toEqual([]));
    // Sem sessão, o cartão passa a oferecer só a limpeza do aparelho.
    expect(screen.getByRole("button", { name: "Apagar dados deste aparelho" })).toBeTruthy();
  });

  it.each([
    ["migracao003", MENSAGENS_DA_CONTA.migracao003],
    ["rede", MENSAGENS_DA_CONTA.rede],
  ] as const)("falha %s: mostra o motivo e não apaga nada", async (codigo, mensagem) => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { autenticacao, armazenamento } = await cartao();
    autenticacao.proximoErro = codigo;

    await fireEvent.press(screen.getByRole("button", { name: "Excluir minha conta e dados" }));
    await responderAlertas(alerta, "Continuar", "Excluir definitivamente");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(mensagem));
    expect(screen.getByTestId("dados")).toHaveTextContent("1|1|Ana");
    expect(armazenamento.dados.get(CHAVE_DONO)).toBe(U);
    expect(screen.getByRole("button", { name: "Excluir minha conta e dados" })).toBeTruthy();
  });

  it("cancelar em qualquer uma das duas confirmações não apaga nada", async () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { autenticacao } = await cartao();

    await fireEvent.press(screen.getByRole("button", { name: "Excluir minha conta e dados" }));
    await responderAlertas(alerta, "Cancelar");
    expect(alerta).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole("button", { name: "Excluir minha conta e dados" }));
    alerta.mock.calls.shift();
    await responderAlertas(alerta, "Continuar", "Cancelar");

    expect(autenticacao.chamadas).not.toContain("excluirConta");
    expect(screen.getByTestId("dados")).toHaveTextContent("1|1|Ana");
  });

  it("sem conta: apaga os dados deste aparelho depois de confirmar", async () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await cartao(null);
    expect(screen.queryByRole("button", { name: "Excluir minha conta e dados" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Apagar dados deste aparelho" }));
    await responderAlertas(alerta, "Apagar");

    await waitFor(() =>
      expect(screen.getByTestId("aviso-de-privacidade")).toHaveTextContent(MENSAGEM_APARELHO_LIMPO),
    );
    expect(screen.getByTestId("dados")).toHaveTextContent("0|0|");
  });
});
