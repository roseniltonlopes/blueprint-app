export type CategoriaId = "hidratacao" | "exercicio" | "descanso" | "estudo" | "outro";

export type Categoria = {
  id: CategoriaId;
  nome: string;
};

/** As 4 categorias fixas, na ordem da grade da Home. "Outro" fica fora: é a linha larga. */
export const CATEGORIAS_FIXAS: readonly Categoria[] = [
  { id: "hidratacao", nome: "Hidratação" },
  { id: "exercicio", nome: "Exercício" },
  { id: "descanso", nome: "Descanso" },
  { id: "estudo", nome: "Estudo" },
];

export const CATEGORIA_OUTRO: Categoria = { id: "outro", nome: "Outro" };

export const CATEGORIAS: readonly Categoria[] = [...CATEGORIAS_FIXAS, CATEGORIA_OUTRO];

export function nomeDaCategoria(id: CategoriaId): string {
  const categoria = CATEGORIAS.find((c) => c.id === id);
  if (!categoria) {
    throw new Error(`Categoria desconhecida: ${id}`);
  }
  return categoria.nome;
}
