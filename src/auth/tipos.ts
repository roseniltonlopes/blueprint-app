export type Usuario = {
  id: string;
  email: string;
  /** Nome informado no cadastro (só para exibição) */
  nome: string | null;
};

export type DadosDeCadastro = {
  nome: string;
  email: string;
  senha: string;
  /** Fuso IANA detectado no aparelho */
  fuso: string | null;
};

export type ResultadoDoCadastro =
  | { tipo: "logado" }
  /** Projeto com confirmação de e-mail: a conta só entra depois do link */
  | { tipo: "confirmarEmail"; email: string };

export type CodigoDeErro =
  | "credenciais"
  | "emailNaoConfirmado"
  | "emailJaCadastrado"
  | "emailInvalido"
  | "senhaFraca"
  | "muitasTentativas"
  | "cadastroDesativado"
  | "rede"
  | "desconhecido";

export class ErroDeAutenticacao extends Error {
  constructor(
    readonly codigo: CodigoDeErro,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroDeAutenticacao";
  }
}

/** Porta de autenticação. A UI só conhece esta interface; o Supabase fica em supabaseAuth.ts. */
export interface ServicoDeAutenticacao {
  usuarioAtual(): Promise<Usuario | null>;
  /** Retorna a função que cancela a inscrição */
  aoMudarUsuario(callback: (usuario: Usuario | null) => void): () => void;
  entrar(email: string, senha: string): Promise<void>;
  cadastrar(dados: DadosDeCadastro): Promise<ResultadoDoCadastro>;
  sair(): Promise<void>;
}
