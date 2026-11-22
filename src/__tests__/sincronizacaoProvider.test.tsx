import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";
import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import {
  CHAVE_DONO,
  chaveDaBase,
  criarSincronizacaoRepositoryLocal,
} from "../data/SincronizacaoRepository";
import type { Acao } from "../domain/acoes";
import type { DadosAgenda } from "../domain/agenda";
import { useAcoes } from "../hooks/useAcoes";
import { useAgenda } from "../hooks/useAgenda";
import { usePerfil } from "../hooks/usePerfil";
import { useSincronizacao } from "../hooks/useSincronizacao";
import { acaoParaLinha, atividadeParaLinha } from "../sincronizacao/conversores";
import { ErroDeSincronizacao } from "../sincronizacao/porta";
import { autenticacaoFalsa, remotoFalso, renderComTema } from "./utils";

const U = "usuario-1";
const SESSAO = { userId: U, email: "ana@exemplo.com" };

function acao(id: string): Acao {
  return { id, categoria: "hidratacao", criadoEm: "2026-10-17T12:00:00.000Z" };
}

const AGENDA_LOCAL: DadosAgenda = {
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
        { id: "c1", atividadeId: "academia", dias: [1, 3], inicio: "05:00", fim: "06:00" },
      ],
    },
  ],
  avulsos: [],
  registros: [],
};

/** Mostra o estado da sincronização e do app, e expõe as ações que os testes disparam. */
function Sonda() {
  const { estado, sincronizarAgora, confirmarTroca, cancelarTroca, sair } = useSincronizacao();
  const { acoes, registrar } = useAcoes();
  const { dados } = useAgenda();
  const { perfil } = usePerfil();
  const detalhe =
    estado.tipo === "falhou" || estado.tipo === "pausada"
      ? estado.mensagem
      : estado.tipo === "confirmarTroca"
        ? estado.email
        : "";
  const botao = (rotulo: string, acaoDoBotao: () => unknown) => (
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={acaoDoBotao} />
  );
  return (
    <View>
      <Text testID="estado">{estado.tipo}</Text>
      <Text testID="detalhe">{detalhe}</Text>
      <Text testID="acoes">
        {acoes
          .map((a) => a.id)
          .sort()
          .join(",")}
      </Text>
      <Text testID="atividades">{dados.atividades.map((a) => a.nome).join(",")}</Text>
      <Text testID="nome">{perfil.nome}</Text>
      {botao("registrar", () => registrar("estudo"))}
      {botao("sincronizar", () => void sincronizarAgora())}
      {botao("trocar", () => void confirmarTroca())}
      {botao("cancelar troca", () => void cancelarTroca())}
      {botao("sair mantendo", () => void sair({ manterDados: true }))}
      {botao("sair apagando", () => void sair({ manterDados: false }))}
    </View>
  );
}

function cenario({
  sessao = SESSAO as typeof SESSAO | null,
  armazenado = {} as Record<string, string>,
  acoes = [] as Acao[],
  agenda = undefined as DadosAgenda | undefined,
  nome = "",
} = {}) {
  const autenticacao = autenticacaoFalsa(sessao);
  const remoto = remotoFalso();
  const armazenamento = criarArmazenamentoEmMemoria(armazenado);
  const repositorio = criarSincronizacaoRepositoryLocal(armazenamento);
  const renderizar = () =>
    renderComTema(<Sonda />, {
      autenticacao,
      nuvem: { remoto, repositorio },
      acoes,
      agenda,
      perfil: { nome, foto: null },
    });
  return { autenticacao, remoto, armazenamento, repositorio, renderizar };
}

const texto = (testID: string) => screen.getByTestId(testID).props.children as string;

async function esperarEstado(tipo: string) {
  await waitFor(() => expect(texto("estado")).toBe(tipo));
}

describe("SincronizacaoProvider", () => {
  it("sem nuvem configurada fica desligada", async () => {
    await renderComTema(<Sonda />);
    expect(texto("estado")).toBe("desligada");
  });

  it("sem sessão fica desligada e não chama a nuvem", async () => {
    const { remoto, renderizar } = cenario({ sessao: null });
    await renderizar();
    expect(texto("estado")).toBe("desligada");
    expect(remoto.execucoes).toEqual([]);
  });

  it("primeira vez com dados do aparelho sem dono: sobe tudo e vira dono", async () => {
    const { remoto, armazenamento, renderizar } = cenario({
      acoes: [acao("a1")],
      agenda: AGENDA_LOCAL,
      nome: "Ana",
    });
    await renderizar();
    await esperarEstado("sincronizada");

    expect([...remoto.tabelas.acoes.keys()]).toEqual([`${U}|a1`]);
    expect(remoto.tabelas.atividades.get(`${U}|academia`)).toMatchObject({ nome: "Academia" });
    expect(remoto.tabelas.compromissos.get(`${U}|c1`)).toMatchObject({ agenda_id: "out" });
    expect(remoto.perfis.get(U)).toEqual({ nome: "Ana" });
    expect(armazenamento.dados.get(CHAVE_DONO)).toBe(U);
    expect(armazenamento.dados.has(chaveDaBase(U))).toBe(true);
  });

  it("traz o que foi feito em outro aparelho", async () => {
    const { remoto, renderizar } = cenario();
    remoto.tabelas.acoes.set(`${U}|la`, acaoParaLinha(acao("la"), U));
    remoto.tabelas.atividades.set(
      `${U}|corrida`,
      atividadeParaLinha({ ...AGENDA_LOCAL.atividades[0], id: "corrida", nome: "Corrida" }, U),
    );
    remoto.perfis.set(U, { nome: "Ana Souza" });
    await renderizar();
    await esperarEstado("sincronizada");

    expect(texto("acoes")).toBe("la");
    expect(texto("atividades")).toBe("Corrida");
    expect(texto("nome")).toBe("Ana Souza");
    expect(remoto.execucoes).toEqual([[]]);
  });

  it("mudança local depois da sincronização sobe sozinha", async () => {
    const { remoto, renderizar } = cenario();
    await renderizar();
    await esperarEstado("sincronizada");

    await fireEvent.press(screen.getByLabelText("registrar"));
    await waitFor(() => expect(remoto.tabelas.acoes.size).toBe(1));
    await esperarEstado("sincronizada");
  });

  it("apagado em outro aparelho some daqui; apagado aqui some da nuvem", async () => {
    const { remoto, renderizar } = cenario({ acoes: [acao("a1"), acao("a2")] });
    await renderizar();
    await esperarEstado("sincronizada");

    remoto.tabelas.acoes.delete(`${U}|a1`);
    await fireEvent.press(screen.getByLabelText("sincronizar"));
    await waitFor(() => expect(texto("acoes")).toBe("a2"));
    expect(remoto.tabelas.acoes.has(`${U}|a2`)).toBe(true);
  });

  it("migração 002 ausente: mostra o aviso e o app continua com os dados locais", async () => {
    const { remoto, renderizar } = cenario({ acoes: [acao("a1")] });
    remoto.semRegistros = true;
    await renderizar();
    await esperarEstado("falhou");

    expect(texto("detalhe")).toBe("O banco precisa da migração 002");
    expect(texto("acoes")).toBe("a1");
    expect(remoto.execucoes).toEqual([]);
  });

  it("sem internet: avisa que vai tentar de novo e não grava a base", async () => {
    const { remoto, armazenamento, renderizar } = cenario({ acoes: [acao("a1")] });
    remoto.falha = new ErroDeSincronizacao("rede");
    await renderizar();
    await esperarEstado("falhou");

    expect(texto("detalhe")).toBe("Sem internet: tentaremos de novo");
    expect(armazenamento.dados.has(chaveDaBase(U))).toBe(false);

    remoto.falha = null;
    await fireEvent.press(screen.getByLabelText("sincronizar"));
    await esperarEstado("sincronizada");
    expect(remoto.tabelas.acoes.size).toBe(1);
  });

  it("falha no meio do envio não atualiza a base; a próxima recalcula", async () => {
    const { remoto, repositorio, renderizar } = cenario({ acoes: [acao("a1")] });
    const executar = remoto.executar;
    remoto.executar = async () => {
      throw new ErroDeSincronizacao("servidor", "23514");
    };
    await renderizar();
    await esperarEstado("falhou");
    expect(await repositorio.lerBase(U)).toBeNull();

    remoto.executar = executar;
    await fireEvent.press(screen.getByLabelText("sincronizar"));
    await esperarEstado("sincronizada");
    expect(remoto.tabelas.acoes.has(`${U}|a1`)).toBe(true);
  });
});

describe("Troca de dono", () => {
  it("outra conta no aparelho: pede confirmação e não mistura nada", async () => {
    const { remoto, renderizar } = cenario({
      armazenado: { [CHAVE_DONO]: "outra-pessoa" },
      acoes: [acao("da-outra")],
    });
    remoto.tabelas.acoes.set(`${U}|minha`, acaoParaLinha(acao("minha"), U));
    await renderizar();
    await esperarEstado("confirmarTroca");

    expect(texto("detalhe")).toBe("ana@exemplo.com");
    expect(texto("acoes")).toBe("da-outra");
    expect(remoto.execucoes).toEqual([]);
  });

  it("confirmar troca: o aparelho passa a ter só os dados da conta que entrou", async () => {
    const { remoto, armazenamento, renderizar } = cenario({
      armazenado: { [CHAVE_DONO]: "outra-pessoa" },
      acoes: [acao("da-outra")],
      nome: "Outra Pessoa",
    });
    remoto.tabelas.acoes.set(`${U}|minha`, acaoParaLinha(acao("minha"), U));
    await renderizar();
    await esperarEstado("confirmarTroca");

    await fireEvent.press(screen.getByLabelText("trocar"));
    await esperarEstado("sincronizada");
    expect(texto("acoes")).toBe("minha");
    expect(texto("nome")).toBe("");
    expect(remoto.tabelas.acoes.has(`${U}|da-outra`)).toBe(false);
    expect(armazenamento.dados.get(CHAVE_DONO)).toBe(U);
  });

  it("cancelar troca: sai da conta e mantém os dados do aparelho", async () => {
    const { autenticacao, renderizar } = cenario({
      armazenado: { [CHAVE_DONO]: "outra-pessoa" },
      acoes: [acao("da-outra")],
    });
    await renderizar();
    await esperarEstado("confirmarTroca");

    await fireEvent.press(screen.getByLabelText("cancelar troca"));
    await esperarEstado("desligada");
    expect(autenticacao.chamadas).toContain("sair");
    expect(texto("acoes")).toBe("da-outra");
  });
});

describe("Sair", () => {
  it("apagando: limpa ações, agenda, perfil, a base e o dono", async () => {
    const { autenticacao, armazenamento, renderizar } = cenario({
      acoes: [acao("a1")],
      agenda: AGENDA_LOCAL,
      nome: "Ana",
    });
    await renderizar();
    await esperarEstado("sincronizada");

    await fireEvent.press(screen.getByLabelText("sair apagando"));
    await esperarEstado("desligada");
    expect(texto("acoes")).toBe("");
    expect(texto("atividades")).toBe("");
    expect(texto("nome")).toBe("");
    expect(armazenamento.dados.has(chaveDaBase(U))).toBe(false);
    expect(armazenamento.dados.has(CHAVE_DONO)).toBe(false);
    expect(autenticacao.chamadas).toContain("sair");
  });

  it("mantendo: os dados ficam e o dono continua o mesmo", async () => {
    const { armazenamento, renderizar } = cenario({ acoes: [acao("a1")] });
    await renderizar();
    await esperarEstado("sincronizada");

    await fireEvent.press(screen.getByLabelText("sair mantendo"));
    await esperarEstado("desligada");
    expect(texto("acoes")).toBe("a1");
    expect(armazenamento.dados.get(CHAVE_DONO)).toBe(U);
  });
});
