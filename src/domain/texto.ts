/** "1 ação", "3 ações" */
export function plural(n: number, singular: string, pluralTexto: string): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/** "3 a mais que no mês anterior", "1 a menos que no mês anterior" ou "igual ao mês anterior". */
export function comparacaoComMesAnterior(total: number, antes: number): string {
  const diferenca = total - antes;
  if (diferenca === 0) return "igual ao mês anterior";
  return diferenca > 0
    ? `${diferenca} a mais que no mês anterior`
    : `${-diferenca} a menos que no mês anterior`;
}

/** Até duas iniciais em maiúsculas: "Ana Souza" → "AS"; "Convidado" → "C". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return "?";
  }
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return `${primeira}${ultima}`.toUpperCase();
}
