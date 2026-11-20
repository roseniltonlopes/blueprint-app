/** Quem usa o app neste aparelho. Sem conta, o perfil é só local. */
export type Perfil = {
  /** Vazio enquanto a pessoa não escolheu um nome */
  nome: string;
  /** Foto como data URI (já reduzida), ou null para mostrar as iniciais */
  foto: string | null;
};

export const PERFIL_PADRAO: Perfil = { nome: "", foto: null };

export const NOME_PADRAO = "Convidado";
export const NOME_MAX = 40;
export const ERRO_NOME = `Informe um nome de 1 a ${NOME_MAX} caracteres`;

/** Limite do texto da foto. Uma foto de 512 px em JPEG fica bem abaixo disto. */
export const FOTO_MAX_CARACTERES = 300_000;

const PADRAO_FOTO = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

/** Tira espaços das pontas e junta espaços repetidos. */
export function normalizarNome(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

/** Mensagem de erro, ou null quando o nome serve. */
export function validarNome(texto: string): string | null {
  const nome = normalizarNome(texto);
  return nome.length >= 1 && nome.length <= NOME_MAX ? null : ERRO_NOME;
}

export function fotoValida(foto: unknown): foto is string {
  return typeof foto === "string" && foto.length <= FOTO_MAX_CARACTERES && PADRAO_FOTO.test(foto);
}

export function nomeParaExibir(perfil: Pick<Perfil, "nome">): string {
  return perfil.nome.length > 0 ? perfil.nome : NOME_PADRAO;
}
