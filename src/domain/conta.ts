/** Regras puras da conta na nuvem: formato do e-mail, regras da senha e mensagens de erro. */

export const SENHA_MIN = 8;
/** Limite do Supabase Auth para a senha (bcrypt usa só os primeiros 72 bytes). */
export const SENHA_MAX = 72;
export const EMAIL_MAX = 254;

// Formato no aparelho; quem confirma que o e-mail existe é o link enviado pelo Supabase.
const PADRAO_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;

export const ERRO_EMAIL = "Digite um e-mail válido, como nome@exemplo.com";
export const ERRO_SENHA_CURTA = `A senha precisa ter pelo menos ${SENHA_MIN} caracteres`;
export const ERRO_SENHA_LONGA = `A senha pode ter no máximo ${SENHA_MAX} caracteres`;
export const ERRO_SENHA_SEM_LETRA_E_NUMERO = "A senha precisa ter letras e números";

// Mesma regra do Supabase Auth ("Letras e dígitos"): ele só conta letras sem acento de A a Z.
const TEM_LETRA = /[A-Za-z]/;
const TEM_DIGITO = /[0-9]/;

export type ModoDoFormulario = "entrar" | "criar" | "recuperar";

export type ErrosDoFormulario = { email?: string; senha?: string };

export function normalizarEmail(texto: string): string {
  return texto.trim().toLowerCase();
}

export function validarEmail(texto: string): string | null {
  const email = normalizarEmail(texto);
  return email.length <= EMAIL_MAX && PADRAO_EMAIL.test(email) ? null : ERRO_EMAIL;
}

export function validarSenha(senha: string): string | null {
  if (senha.length < SENHA_MIN) return ERRO_SENHA_CURTA;
  if (senha.length > SENHA_MAX) return ERRO_SENHA_LONGA;
  if (!TEM_LETRA.test(senha) || !TEM_DIGITO.test(senha)) return ERRO_SENHA_SEM_LETRA_E_NUMERO;
  return null;
}

/**
 * Erros por campo. Para entrar, a senha só precisa estar preenchida: contas antigas podem ter
 * regras diferentes, e quem decide se ela confere é o servidor.
 */
export function validarFormularioDeConta(
  modo: ModoDoFormulario,
  campos: { email: string; senha: string },
): ErrosDoFormulario {
  const erros: ErrosDoFormulario = {};
  const erroEmail = validarEmail(campos.email);
  if (erroEmail !== null) erros.email = erroEmail;
  if (modo === "criar") {
    const erroSenha = validarSenha(campos.senha);
    if (erroSenha !== null) erros.senha = erroSenha;
  } else if (modo === "entrar" && campos.senha.length === 0) {
    erros.senha = "Digite a sua senha";
  }
  return erros;
}

export function formularioValido(erros: ErrosDoFormulario): boolean {
  return erros.email === undefined && erros.senha === undefined;
}

export type CodigoDeErroDaConta =
  | "credenciais"
  | "emailNaoConfirmado"
  | "emailJaCadastrado"
  | "emailInvalido"
  | "senhaFraca"
  | "muitasTentativas"
  | "cadastroDesativado"
  | "rede"
  | "indisponivel"
  | "sessaoExpirada"
  | "migracao003"
  | "desconhecido";

export const MENSAGENS_DA_CONTA: Record<CodigoDeErroDaConta, string> = {
  credenciais: "E-mail ou senha incorretos.",
  emailNaoConfirmado: "Confirme o seu e-mail pelo link que enviamos e depois entre.",
  emailJaCadastrado: "Este e-mail já tem conta. Use Entrar.",
  emailInvalido: "O servidor recusou este e-mail. Confira se está certo.",
  senhaFraca: "Senha fraca. Use pelo menos 8 caracteres, com letras e números.",
  muitasTentativas: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  cadastroDesativado: "Novos cadastros estão desativados no momento.",
  rede: "Sem internet. Verifique a conexão e tente de novo.",
  indisponivel: "A conta na nuvem não está disponível nesta versão do app.",
  sessaoExpirada: "A sessão expirou. Saia, entre de novo e tente outra vez.",
  migracao003: "O banco precisa da migração 003",
  desconhecido: "Algo deu errado no servidor. Tente de novo em instantes.",
};

export class ErroDaConta extends Error {
  readonly codigo: CodigoDeErroDaConta;

  constructor(codigo: CodigoDeErroDaConta) {
    super(MENSAGENS_DA_CONTA[codigo]);
    this.name = "ErroDaConta";
    this.codigo = codigo;
  }
}
