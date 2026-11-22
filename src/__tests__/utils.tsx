import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { AgendaRepository } from "../data/AgendaRepository";
import type { PerfilRepository } from "../data/PerfilRepository";
import type { Acao } from "../domain/acoes";
import type { DadosAgenda } from "../domain/agenda";
import type { Perfil } from "../domain/perfil";
import { AcoesProvider, type Relogio } from "../hooks/useAcoes";
import { AgendaProvider } from "../hooks/useAgenda";
import { AlertasProvider } from "../hooks/useAlertas";
import { ContaProvider } from "../hooks/useConta";
import { PerfilProvider } from "../hooks/usePerfil";
import { SincronizacaoProvider, type NuvemDaSincronizacao } from "../hooks/useSincronizacao";
import { ErroDaConta, type CodigoDeErroDaConta } from "../domain/conta";
import { TABELAS, type LinhasRemotas, type Tabela } from "../sincronizacao/foto";
import type { Passo } from "../sincronizacao/plano";
import {
  ErroDeSincronizacao,
  type PortaDeAutenticacao,
  type PortaRemota,
  type ResultadoDoCadastro,
  type Sessao,
} from "../sincronizacao/porta";
import type { AlertaPlanejado } from "../domain/alertas";
import type { EstadoDaPermissao, RespostaDeAlerta, ServicoDeAlertas } from "../services/alertas";
import { ThemeProvider, type ThemeMode } from "../theme/ThemeProvider";

const METRICAS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Sábado, 17 de outubro de 2026, 15:58 no fuso do processo. */
export const AGORA = new Date(2026, 9, 17, 15, 58);

export function relogioFixo(data = AGORA): Relogio {
  return () => new Date(data.getTime());
}

export type ServicoDeAlertasFalso = ServicoDeAlertas & {
  /** Última lista recebida em reagendar */
  agendados: AlertaPlanejado[] | null;
  /** Simula o toque numa notificação */
  responder: (resposta: RespostaDeAlerta) => void;
};

/** Serviço de alertas em memória: guarda o que foi agendado e permite simular respostas. */
export function servicoDeAlertasFalso(
  inicial: EstadoDaPermissao = "perguntar",
  aoPedir: EstadoDaPermissao = "concedida",
): ServicoDeAlertasFalso {
  let estado = inicial;
  const ouvintes = new Set<(resposta: RespostaDeAlerta) => void>();
  const servico: ServicoDeAlertasFalso = {
    agendados: null,
    preparar: async () => {},
    permissao: async () => estado,
    pedirPermissao: async () => {
      estado = aoPedir;
      return estado;
    },
    reagendar: async (alertas) => {
      servico.agendados = [...alertas];
    },
    aoResponder: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    responder: (resposta) => ouvintes.forEach((ouvinte) => ouvinte(resposta)),
  };
  return servico;
}

export type AutenticacaoFalsa = PortaDeAutenticacao & {
  /** Contas existentes: e-mail -> { senha, userId } */
  contas: Map<string, { senha: string; userId: string }>;
  /** Próximo erro de entrar/cadastrar/recuperar (consumido na chamada) */
  proximoErro: CodigoDeErroDaConta | null;
  /** Resposta do cadastro: "confirmarEmail" simula projeto com confirmação de e-mail */
  respostaDoCadastro: ResultadoDoCadastro;
  chamadas: string[];
  /** Simula a troca de sessão vinda do servidor (renovação, saída em outro lugar) */
  emitir: (sessao: Sessao | null) => void;
};

/** Porta de autenticação em memória. Nunca chama a rede. */
export function autenticacaoFalsa(sessaoInicial: Sessao | null = null): AutenticacaoFalsa {
  let sessao = sessaoInicial;
  const ouvintes = new Set<(s: Sessao | null) => void>();
  const emitir = (nova: Sessao | null) => {
    sessao = nova;
    ouvintes.forEach((ouvinte) => ouvinte(nova));
  };
  const lancarSePreciso = () => {
    if (porta.proximoErro !== null) {
      const codigo = porta.proximoErro;
      porta.proximoErro = null;
      throw new ErroDaConta(codigo);
    }
  };
  const porta: AutenticacaoFalsa = {
    contas: new Map(),
    proximoErro: null,
    respostaDoCadastro: "conectado",
    chamadas: [],
    emitir,
    sessaoAtual: async () => sessao,
    aoMudarSessao: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    entrar: async (email, senha) => {
      porta.chamadas.push(`entrar:${email}`);
      lancarSePreciso();
      const conta = porta.contas.get(email.trim().toLowerCase());
      if (conta === undefined || conta.senha !== senha) throw new ErroDaConta("credenciais");
      emitir({ userId: conta.userId, email: email.trim().toLowerCase() });
    },
    cadastrar: async ({ email, senha, nome, termosVersao }) => {
      porta.chamadas.push(`cadastrar:${email}:${nome ?? ""}:termos=${termosVersao}`);
      lancarSePreciso();
      const userId = `usuario-${porta.contas.size + 1}`;
      porta.contas.set(email.trim().toLowerCase(), { senha, userId });
      if (porta.respostaDoCadastro === "conectado") {
        emitir({ userId, email: email.trim().toLowerCase() });
      }
      return porta.respostaDoCadastro;
    },
    recuperarSenha: async (email) => {
      porta.chamadas.push(`recuperar:${email}`);
      lancarSePreciso();
    },
    sair: async () => {
      porta.chamadas.push("sair");
      emitir(null);
    },
    excluirConta: async () => {
      porta.chamadas.push("excluirConta");
      lancarSePreciso();
      emitir(null);
    },
  };
  return porta;
}

export type RemotoFalso = PortaRemota & {
  /** Linhas por tabela, como o banco guardaria (com user_id) */
  tabelas: Record<Tabela, Map<string, Record<string, unknown>>>;
  /** Linha de public.perfis por usuário */
  perfis: Map<string, { nome: string | null }>;
  /** Cada chamada de executar, com os passos recebidos */
  execucoes: Passo[][];
  /** Próxima falha de baixar ou executar (permanece até ser limpa) */
  falha: ErroDeSincronizacao | null;
  /** Simula o banco sem a migração 002 (tabela registros ausente) */
  semRegistros: boolean;
};

/** Nuvem em memória que respeita a ordem dos passos e o "só inserir" das ações. */
export function remotoFalso(): RemotoFalso {
  const tabelas = Object.fromEntries(TABELAS.map((t) => [t, new Map()])) as RemotoFalso["tabelas"];
  const chave = (userId: string, id: string) => `${userId}|${id}`;
  const remoto: RemotoFalso = {
    tabelas,
    perfis: new Map(),
    execucoes: [],
    falha: null,
    semRegistros: false,
    baixar: async (userId) => {
      if (remoto.falha) throw remoto.falha;
      if (remoto.semRegistros) throw new ErroDeSincronizacao("migracao");
      const linhas = Object.fromEntries(
        TABELAS.map((t) => [
          t,
          [...tabelas[t].values()].filter((linha) => linha.user_id === userId),
        ]),
      ) as Record<Tabela, unknown[]>;
      return { ...linhas, perfil: remoto.perfis.get(userId) ?? null } satisfies LinhasRemotas;
    },
    executar: async (userId, passos) => {
      if (remoto.falha) throw remoto.falha;
      remoto.execucoes.push([...passos]);
      for (const passo of passos) {
        if (passo.tipo === "apagar") {
          passo.ids.forEach((id) => tabelas[passo.tabela].delete(chave(userId, id)));
        } else if (passo.tipo === "enviar") {
          for (const linha of passo.linhas) {
            const k = chave(userId, linha.id);
            if (passo.tabela === "acoes" && tabelas.acoes.has(k)) continue;
            tabelas[passo.tabela].set(k, { ...linha });
          }
        } else {
          remoto.perfis.set(userId, { nome: passo.nome });
        }
      }
    },
  };
  return remoto;
}

type Opcoes = {
  modo?: ThemeMode;
  relogio?: Relogio;
  acoes?: Acao[];
  agenda?: DadosAgenda;
  repositorioAgenda?: AgendaRepository;
  perfil?: Perfil;
  repositorioPerfil?: PerfilRepository;
  servicoDeAlertas?: ServicoDeAlertas;
  autenticacao?: PortaDeAutenticacao | null;
  nuvem?: NuvemDaSincronizacao | null;
  esperaDaSincronizacaoMs?: number;
};

export function renderComTema(ui: ReactElement, opcoes: Opcoes = {}) {
  const {
    modo = "light",
    relogio = relogioFixo(),
    acoes = [],
    agenda,
    repositorioAgenda,
    perfil,
    repositorioPerfil,
    servicoDeAlertas = servicoDeAlertasFalso(),
    autenticacao = null,
    nuvem = null,
    esperaDaSincronizacaoMs = 0,
  } = opcoes;
  return render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <ContaProvider porta={autenticacao}>
        <ThemeProvider initialMode={modo}>
          <AcoesProvider relogio={relogio} acoesIniciais={acoes}>
            <AgendaProvider agendaInicial={agenda} repositorio={repositorioAgenda}>
              <AlertasProvider servico={servicoDeAlertas}>
                <PerfilProvider perfilInicial={perfil} repositorio={repositorioPerfil}>
                  <SincronizacaoProvider
                    nuvem={nuvem}
                    esperaMs={esperaDaSincronizacaoMs}
                    esperaAposFalhaMs={60_000}
                  >
                    {ui}
                  </SincronizacaoProvider>
                </PerfilProvider>
              </AlertasProvider>
            </AgendaProvider>
          </AcoesProvider>
        </ThemeProvider>
      </ContaProvider>
    </SafeAreaProvider>,
  );
}
