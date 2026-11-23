/**
 * Portas da nuvem. O app só conhece estas interfaces: a implementação com o Supabase fica em
 * src/services/ e os testes usam versões em memória (nenhum teste chama a rede).
 */
import type { LinhasRemotas } from "./foto";
import type { Passo } from "./plano";

export type Sessao = { userId: string; email: string };

export type ResultadoDoCadastro = "conectado" | "confirmarEmail";

export interface PortaDeAutenticacao {
  /** Sessão gravada no aparelho (funciona sem internet) */
  sessaoAtual(): Promise<Sessao | null>;
  /** Avisa a cada entrada, saída ou renovação. Devolve a função que cancela. */
  aoMudarSessao(ouvinte: (sessao: Sessao | null) => void): () => void;
  /** Lança ErroDaConta (src/domain/conta.ts) com o motivo */
  entrar(email: string, senha: string): Promise<void>;
  cadastrar(dados: {
    email: string;
    senha: string;
    nome: string | null;
    /** Data de nascimento no formato do banco (AAAA-MM-DD) */
    nascimento: string | null;
    fuso: string;
    /** Versão dos termos aceitos na caixa do cadastro (src/legal/versao.ts) */
    termosVersao: string;
  }): Promise<ResultadoDoCadastro>;
  recuperarSenha(email: string): Promise<void>;
  /** Nunca lança: sem internet, encerra ao menos a sessão deste aparelho */
  sair(): Promise<void>;
  /**
   * Apaga a conta e todos os dados dela na nuvem (função public.excluir_minha_conta, migração 003)
   * e encerra a sessão neste aparelho. Lança ErroDaConta; se lançar, nada foi apagado.
   */
  excluirConta(): Promise<void>;
}

export type MotivoDaFalha =
  /** Sem internet ou servidor fora do ar: tentar de novo depois */
  | "rede"
  /** Tabela que o app espera não existe (migração 002 não aplicada) */
  | "migracao"
  /** Coluna nova que o app envia não existe (migração 003 não aplicada) */
  | "migracao003"
  /** Sessão vencida ou recusada pelo servidor */
  | "sessao"
  /** O servidor recusou os dados (constraint, permissão) */
  | "servidor";

export const MENSAGENS_DA_SINCRONIZACAO: Record<MotivoDaFalha, string> = {
  rede: "Sem internet: tentaremos de novo",
  migracao: "O banco precisa da migração 002",
  migracao003: "O banco precisa da migração 003",
  sessao: "A sessão expirou. Saia e entre de novo.",
  servidor: "O servidor recusou os dados. Tente de novo mais tarde.",
};

export class ErroDeSincronizacao extends Error {
  readonly motivo: MotivoDaFalha;

  constructor(motivo: MotivoDaFalha, detalhe?: string) {
    super(
      detalhe
        ? `${MENSAGENS_DA_SINCRONIZACAO[motivo]} (${detalhe})`
        : MENSAGENS_DA_SINCRONIZACAO[motivo],
    );
    this.name = "ErroDeSincronizacao";
    this.motivo = motivo;
  }
}

export interface PortaRemota {
  /** Todas as linhas da pessoa. Lança ErroDeSincronizacao. */
  baixar(userId: string): Promise<LinhasRemotas>;
  /** Executa os passos em ordem e para no primeiro erro (lança ErroDeSincronizacao). */
  executar(userId: string, passos: readonly Passo[]): Promise<void>;
}
