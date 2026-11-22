import {
  isAuthApiError,
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { ErroDaConta, normalizarEmail, type CodigoDeErroDaConta } from "../domain/conta";
import type { PortaDeAutenticacao, Sessao } from "../sincronizacao/porta";

const CODIGOS: Partial<Record<string, CodigoDeErroDaConta>> = {
  invalid_credentials: "credenciais",
  email_not_confirmed: "emailNaoConfirmado",
  user_already_exists: "emailJaCadastrado",
  email_exists: "emailJaCadastrado",
  email_address_invalid: "emailInvalido",
  validation_failed: "emailInvalido",
  weak_password: "senhaFraca",
  over_request_rate_limit: "muitasTentativas",
  over_email_send_rate_limit: "muitasTentativas",
  signup_disabled: "cadastroDesativado",
  email_provider_disabled: "cadastroDesativado",
};

/** Traduz o erro do Supabase Auth para um motivo com mensagem em português, sem detalhes internos. */
export function traduzirErroDeAutenticacao(erro: unknown): ErroDaConta {
  if (erro instanceof ErroDaConta) return erro;
  if (isAuthRetryableFetchError(erro)) return new ErroDaConta("rede");
  if (isAuthWeakPasswordError(erro)) return new ErroDaConta("senhaFraca");
  if (isAuthApiError(erro)) {
    const codigo = erro.code === undefined ? undefined : CODIGOS[erro.code];
    if (codigo !== undefined) return new ErroDaConta(codigo);
    if (erro.status === 429) return new ErroDaConta("muitasTentativas");
    return new ErroDaConta("desconhecido");
  }
  // fetch sem rede no React Native lança TypeError("Network request failed").
  if (erro instanceof TypeError) return new ErroDaConta("rede");
  return new ErroDaConta("desconhecido");
}

/** Função ausente no banco: PostgREST (PGRST202) ou Postgres (42883). */
const FUNCAO_AUSENTE = new Set(["PGRST202", "42883"]);

/** Traduz a resposta do rpc excluir_minha_conta. null quando deu certo. */
export function falhaDaExclusao(resposta: {
  error: { code?: string; message: string } | null;
  status: number;
}): ErroDaConta | null {
  const { error, status } = resposta;
  if (error === null) return null;
  const codigo = error.code ?? "";
  // status 0: o fetch falhou (sem internet). 5xx: servidor fora do ar.
  if (status === 0 || status >= 500) return new ErroDaConta("rede");
  if (FUNCAO_AUSENTE.has(codigo)) return new ErroDaConta("migracao003");
  // 42501: a função não viu sessão; 401 e PGRST30x: token vencido ou inválido.
  if (codigo === "42501" || status === 401 || codigo.startsWith("PGRST30")) {
    return new ErroDaConta("sessaoExpirada");
  }
  return new ErroDaConta("desconhecido");
}

function sessaoDe(sessao: Session | null): Sessao | null {
  if (sessao === null) return null;
  return { userId: sessao.user.id, email: sessao.user.email ?? "" };
}

export function criarAutenticacaoSupabase(cliente: SupabaseClient): PortaDeAutenticacao {
  return {
    async sessaoAtual() {
      // Lê a sessão gravada no aparelho: funciona sem internet. O token renova em segundo plano.
      const { data, error } = await cliente.auth.getSession();
      if (error) throw traduzirErroDeAutenticacao(error);
      return sessaoDe(data.session);
    },

    aoMudarSessao(ouvinte) {
      // A doc pede para não chamar outras funções do supabase dentro deste callback; só repassa.
      const { data } = cliente.auth.onAuthStateChange((_evento, sessao) => {
        ouvinte(sessaoDe(sessao));
      });
      return () => data.subscription.unsubscribe();
    },

    async entrar(email, senha) {
      try {
        const { error } = await cliente.auth.signInWithPassword({
          email: normalizarEmail(email),
          password: senha,
        });
        if (error) throw error;
      } catch (erro) {
        throw traduzirErroDeAutenticacao(erro);
      }
    },

    async cadastrar({ email, senha, nome, fuso, termosVersao }) {
      try {
        // nome, fuso e a versão dos termos aceitos vão no user_metadata: o gatilho do banco cria
        // o perfil com eles e grava a hora do aceite pelo relógio do servidor (migração 003).
        const { data, error } = await cliente.auth.signUp({
          email: normalizarEmail(email),
          password: senha,
          options: {
            data: { ...(nome !== null ? { nome } : {}), fuso, termos_versao: termosVersao },
          },
        });
        if (error) throw error;
        // Sem sessão: o projeto exige confirmar o e-mail. A mesma resposta vale para e-mail já
        // cadastrado, para não revelar quem tem conta.
        return data.session !== null ? "conectado" : "confirmarEmail";
      } catch (erro) {
        throw traduzirErroDeAutenticacao(erro);
      }
    },

    async recuperarSenha(email) {
      try {
        const { error } = await cliente.auth.resetPasswordForEmail(normalizarEmail(email));
        if (error) throw error;
      } catch (erro) {
        throw traduzirErroDeAutenticacao(erro);
      }
    },

    async excluirConta() {
      let resposta: { error: { code?: string; message: string } | null; status: number };
      try {
        resposta = await cliente.rpc("excluir_minha_conta");
      } catch (erro) {
        throw traduzirErroDeAutenticacao(erro);
      }
      const falha = falhaDaExclusao(resposta);
      if (falha !== null) throw falha;
      // A conta não existe mais no servidor: encerra só neste aparelho (sem chamar o servidor).
      await cliente.auth.signOut({ scope: "local" }).catch((erro: unknown) => {
        console.warn("Falha ao encerrar a sessão no aparelho depois de excluir a conta.", erro);
      });
    },

    async sair() {
      try {
        const { error } = await cliente.auth.signOut();
        if (!error) return;
        console.warn("Não foi possível encerrar a sessão no servidor.", error);
      } catch (erro) {
        console.warn("Não foi possível encerrar a sessão no servidor.", erro);
      }
      // Sem internet não dá para revogar no servidor; ao menos encerra neste aparelho.
      await cliente.auth.signOut({ scope: "local" }).catch((erro: unknown) => {
        console.warn("Falha ao encerrar a sessão no aparelho.", erro);
      });
    },
  };
}
