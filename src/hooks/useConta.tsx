import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Resultado } from "../domain/agenda";
import { ErroDaConta, MENSAGENS_DA_CONTA } from "../domain/conta";
import { fusoDoAparelho } from "../domain/fuso";
import type { PortaDeAutenticacao, ResultadoDoCadastro, Sessao } from "../sincronizacao/porta";

export type EstadoDaConta =
  /** Supabase não configurado nesta versão: o app funciona só com os dados do aparelho */
  | { situacao: "indisponivel" }
  | { situacao: "carregando" }
  | { situacao: "desconectado" }
  | { situacao: "conectado"; sessao: Sessao };

export type UseConta = {
  estado: EstadoDaConta;
  entrar: (email: string, senha: string) => Promise<Resultado<void>>;
  /** `nome` é o do perfil local: o gatilho do banco cria o perfil na nuvem com ele */
  criarConta: (dados: {
    email: string;
    senha: string;
    nome: string | null;
    /** Versão dos termos que a pessoa aceitou na caixa do cadastro */
    termosVersao: string;
  }) => Promise<Resultado<ResultadoDoCadastro>>;
  recuperarSenha: (email: string) => Promise<Resultado<void>>;
  /** Encerra a sessão. Nunca falha: sem internet, encerra ao menos neste aparelho. */
  sair: () => Promise<void>;
  /** Apaga a conta e os dados na nuvem e sai. Em erro, nada foi apagado. */
  excluirConta: () => Promise<Resultado<void>>;
};

const ContaContext = createContext<UseConta | null>(null);

const FUSO_PADRAO = "America/Sao_Paulo";

function falha(erro: unknown): { ok: false; erro: string } {
  if (erro instanceof ErroDaConta) return { ok: false, erro: erro.message };
  console.warn("Erro inesperado na conta.", erro);
  return { ok: false, erro: MENSAGENS_DA_CONTA.desconhecido };
}

const INDISPONIVEL = { ok: false, erro: MENSAGENS_DA_CONTA.indisponivel } as const;

type ContaProviderProps = {
  children: ReactNode;
  /** null quando o Supabase não está configurado (e nos testes que não usam conta) */
  porta: PortaDeAutenticacao | null;
};

/** Estado da sessão (entrar, criar conta, recuperar senha e sair). As telas só conhecem useConta(). */
export function ContaProvider({ children, porta }: ContaProviderProps) {
  const [estado, setEstado] = useState<EstadoDaConta>(
    porta === null ? { situacao: "indisponivel" } : { situacao: "carregando" },
  );

  useEffect(() => {
    if (porta === null) return undefined;
    let ativo = true;
    const aplicar = (sessao: Sessao | null) => {
      if (!ativo) return;
      setEstado((atual) => {
        if (sessao === null) {
          return atual.situacao === "desconectado" ? atual : { situacao: "desconectado" };
        }
        // Renovar o token avisa de novo com a mesma pessoa: mantém o objeto para não disparar efeitos.
        if (
          atual.situacao === "conectado" &&
          atual.sessao.userId === sessao.userId &&
          atual.sessao.email === sessao.email
        ) {
          return atual;
        }
        return { situacao: "conectado", sessao };
      });
    };
    porta
      .sessaoAtual()
      .then(aplicar)
      .catch((erro: unknown) => {
        console.warn("Não foi possível ler a sessão salva no aparelho.", erro);
        aplicar(null);
      });
    const cancelar = porta.aoMudarSessao(aplicar);
    return () => {
      ativo = false;
      cancelar();
    };
  }, [porta]);

  const entrar = useCallback<UseConta["entrar"]>(
    async (email, senha) => {
      if (porta === null) return INDISPONIVEL;
      try {
        await porta.entrar(email, senha);
        return { ok: true, valor: undefined };
      } catch (erro) {
        return falha(erro);
      }
    },
    [porta],
  );

  const criarConta = useCallback<UseConta["criarConta"]>(
    async ({ email, senha, nome, termosVersao }) => {
      if (porta === null) return INDISPONIVEL;
      try {
        const valor = await porta.cadastrar({
          email,
          senha,
          nome,
          fuso: fusoDoAparelho() ?? FUSO_PADRAO,
          termosVersao,
        });
        return { ok: true, valor };
      } catch (erro) {
        return falha(erro);
      }
    },
    [porta],
  );

  const recuperarSenha = useCallback<UseConta["recuperarSenha"]>(
    async (email) => {
      if (porta === null) return INDISPONIVEL;
      try {
        await porta.recuperarSenha(email);
        return { ok: true, valor: undefined };
      } catch (erro) {
        return falha(erro);
      }
    },
    [porta],
  );

  const sair = useCallback(async () => {
    if (porta === null) return;
    await porta.sair();
    // O aviso de saída pode chegar depois; a tela já mostra o estado certo.
    setEstado({ situacao: "desconectado" });
  }, [porta]);

  const excluirConta = useCallback<UseConta["excluirConta"]>(async () => {
    if (porta === null) return INDISPONIVEL;
    try {
      await porta.excluirConta();
    } catch (erro) {
      return falha(erro);
    }
    setEstado({ situacao: "desconectado" });
    return { ok: true, valor: undefined };
  }, [porta]);

  const valor = useMemo<UseConta>(
    () => ({ estado, entrar, criarConta, recuperarSenha, sair, excluirConta }),
    [estado, entrar, criarConta, recuperarSenha, sair, excluirConta],
  );

  return <ContaContext.Provider value={valor}>{children}</ContaContext.Provider>;
}

export function useConta(): UseConta {
  const contexto = useContext(ContaContext);
  if (!contexto) {
    throw new Error("useConta precisa estar dentro de um ContaProvider.");
  }
  return contexto;
}
