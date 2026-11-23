/** Regras puras da conta na nuvem: e-mail, senha, nome, nascimento e mensagens de erro. */
import { validarNome } from "./perfil";

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

export type ErrosDoFormulario = {
  email?: string;
  senha?: string;
  nome?: string;
  nascimento?: string;
};

export type CamposDoFormulario = {
  email: string;
  senha: string;
  /** Só no cadastro */
  nome?: string;
  /** Só no cadastro, como a pessoa digitou (DD/MM/AAAA) */
  nascimento?: string;
};

/** Idade mínima do cadastro (LGPD: abaixo disso o app precisaria do consentimento dos pais). */
export const IDADE_MINIMA = 13;
export const IDADE_MAXIMA = 120;

export const ERRO_NASCIMENTO_FORMATO = "Digite a data como DD/MM/AAAA";
export const ERRO_NASCIMENTO_INVALIDA = "Esta data não existe. Confira o dia e o mês";
export const ERRO_NASCIMENTO_FUTURA = "A data de nascimento não pode ser no futuro";
export const ERRO_NASCIMENTO_IDADE_MINIMA = `É preciso ter pelo menos ${IDADE_MINIMA} anos para criar a conta`;
export const ERRO_NASCIMENTO_IDADE_MAXIMA = "Confira o ano de nascimento";

/** Coloca as barras enquanto a pessoa digita: "0312199" → "03/12/199". Ignora o que não é dígito. */
export function mascararData(texto: string): string {
  const digitos = texto.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** Data de "DD/MM/AAAA" em partes, ou null quando o formato ou a data não existem. */
function lerData(texto: string): { dia: number; mes: number; ano: number } | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (partes === null) return null;
  const [dia, mes, ano] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(ano, mes - 1, dia);
  const existe =
    data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  return existe ? { dia, mes, ano } : null;
}

/** Idade completa em anos no dia `hoje`. */
export function idadeEm(nascimento: { dia: number; mes: number; ano: number }, hoje: Date): number {
  const fezAniversario =
    hoje.getMonth() + 1 > nascimento.mes ||
    (hoje.getMonth() + 1 === nascimento.mes && hoje.getDate() >= nascimento.dia);
  return hoje.getFullYear() - nascimento.ano - (fezAniversario ? 0 : 1);
}

export function validarNascimento(texto: string, hoje: Date): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(texto.trim())) return ERRO_NASCIMENTO_FORMATO;
  const data = lerData(texto);
  if (data === null) return ERRO_NASCIMENTO_INVALIDA;
  const nascimento = new Date(data.ano, data.mes - 1, data.dia);
  const inicioDeHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (nascimento.getTime() > inicioDeHoje.getTime()) return ERRO_NASCIMENTO_FUTURA;
  const idade = idadeEm(data, hoje);
  if (idade < IDADE_MINIMA) return ERRO_NASCIMENTO_IDADE_MINIMA;
  if (idade > IDADE_MAXIMA) return ERRO_NASCIMENTO_IDADE_MAXIMA;
  return null;
}

/** "03/12/1990" → "1990-12-03" (formato do banco). null quando a data não existe. */
export function nascimentoParaIso(texto: string): string | null {
  const data = lerData(texto);
  if (data === null) return null;
  const dd = String(data.dia).padStart(2, "0");
  const mm = String(data.mes).padStart(2, "0");
  return `${data.ano}-${mm}-${dd}`;
}

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
 * regras diferentes, e quem decide se ela confere é o servidor. O cadastro pede também o nome e
 * a data de nascimento; `hoje` serve para conferir a idade.
 */
export function validarFormularioDeConta(
  modo: ModoDoFormulario,
  campos: CamposDoFormulario,
  hoje: Date = new Date(),
): ErrosDoFormulario {
  const erros: ErrosDoFormulario = {};
  const erroEmail = validarEmail(campos.email);
  if (erroEmail !== null) erros.email = erroEmail;
  if (modo === "criar") {
    const erroNome = validarNome(campos.nome ?? "");
    if (erroNome !== null) erros.nome = "Digite o seu nome";
    const erroNascimento = validarNascimento(campos.nascimento ?? "", hoje);
    if (erroNascimento !== null) erros.nascimento = erroNascimento;
    const erroSenha = validarSenha(campos.senha);
    if (erroSenha !== null) erros.senha = erroSenha;
  } else if (modo === "entrar" && campos.senha.length === 0) {
    erros.senha = "Digite a sua senha";
  }
  return erros;
}

export function formularioValido(erros: ErrosDoFormulario): boolean {
  return Object.values(erros).every((erro) => erro === undefined);
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
