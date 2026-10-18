import {
  isAuthApiError,
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { MENSAGENS_DE_ERRO } from "./validacao";
import {
  ErroDeAutenticacao,
  type CodigoDeErro,
  type ServicoDeAutenticacao,
  type Usuario,
} from "./tipos";

function paraUsuario(user: User | null | undefined): Usuario | null {
  if (!user) {
    return null;
  }
  const nome = user.user_metadata?.nome;
  return {
    id: user.id,
    email: user.email ?? "",
    nome: typeof nome === "string" && nome.trim() !== "" ? nome.trim() : null,
  };
}

const CODIGOS: Record<string, CodigoDeErro> = {
  invalid_credentials: "credenciais",
  email_not_confirmed: "emailNaoConfirmado",
  user_already_exists: "emailJaCadastrado",
  email_exists: "emailJaCadastrado",
  email_address_invalid: "emailInvalido",
  weak_password: "senhaFraca",
  over_request_rate_limit: "muitasTentativas",
  over_email_send_rate_limit: "muitasTentativas",
  signup_disabled: "cadastroDesativado",
};

/** Traduz erros do Supabase Auth para mensagens em português, sem expor detalhes internos. */
export function traduzirErro(erro: unknown): ErroDeAutenticacao {
  let codigo: CodigoDeErro = "desconhecido";
  if (isAuthRetryableFetchError(erro)) {
    codigo = "rede";
  } else if (isAuthWeakPasswordError(erro)) {
    codigo = "senhaFraca";
  } else if (isAuthApiError(erro) && erro.code && CODIGOS[erro.code]) {
    codigo = CODIGOS[erro.code];
  } else if (erro instanceof TypeError) {
    // fetch sem rede no React Native lança TypeError("Network request failed")
    codigo = "rede";
  }
  return new ErroDeAutenticacao(codigo, MENSAGENS_DE_ERRO[codigo]);
}

export function criarAutenticacaoSupabase(supabase: SupabaseClient): ServicoDeAutenticacao {
  return {
    async usuarioAtual() {
      // Sessão salva no aparelho: funciona offline. O token é renovado em segundo plano.
      const { data } = await supabase.auth.getSession();
      return paraUsuario(data.session?.user);
    },

    aoMudarUsuario(callback) {
      const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
        callback(paraUsuario(sessao?.user));
      });
      return () => data.subscription.unsubscribe();
    },

    async entrar(email, senha) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });
        if (error) throw error;
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    async cadastrar({ nome, email, senha, fuso }) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { nome: nome.trim(), fuso } },
        });
        if (error) throw error;
        // Sem sessão: o projeto exige confirmação de e-mail. A mesma resposta vale
        // para e-mail já cadastrado, para não revelar quem tem conta.
        return data.session ? { tipo: "logado" } : { tipo: "confirmarEmail", email: email.trim() };
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    async sair() {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Sem rede não dá para revogar no servidor; ao menos encerra no aparelho.
        await supabase.auth.signOut({ scope: "local" });
      }
    },
  };
}
