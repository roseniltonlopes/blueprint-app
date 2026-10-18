import type { CodigoDeErro } from "./tipos";

export const SENHA_MIN = 8;
export const NOME_MAX = 80;

// Validação de formato no aparelho; a confirmação de que o e-mail existe é do Supabase.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ErrosDoFormulario = Partial<Record<"nome" | "email" | "senha", string>>;

export function validarFormulario(
  modo: "cadastro" | "entrar",
  campos: { nome: string; email: string; senha: string },
): ErrosDoFormulario {
  const erros: ErrosDoFormulario = {};
  if (modo === "cadastro") {
    const nome = campos.nome.trim();
    if (nome.length === 0) {
      erros.nome = "Digite seu nome.";
    } else if (nome.length > NOME_MAX) {
      erros.nome = `Use no máximo ${NOME_MAX} caracteres.`;
    }
  }
  if (!EMAIL.test(campos.email.trim())) {
    erros.email = "Digite um e-mail válido.";
  }
  if (campos.senha.length < SENHA_MIN) {
    erros.senha = `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  }
  return erros;
}

export const MENSAGENS_DE_ERRO: Record<CodigoDeErro, string> = {
  credenciais: "E-mail ou senha incorretos.",
  emailNaoConfirmado: "Confirme seu e-mail pelo link que enviamos e depois entre.",
  emailJaCadastrado: "Este e-mail já tem conta. Use Entrar.",
  emailInvalido: "Digite um e-mail válido.",
  senhaFraca: "Senha fraca. Use uma senha mais longa, com letras e números.",
  muitasTentativas: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  cadastroDesativado: "Novos cadastros estão desativados no momento.",
  rede: "Sem conexão com o servidor. Verifique a internet e tente de novo.",
  desconhecido: "Algo deu errado. Tente de novo em instantes.",
};
