/**
 * Contrato mínimo de armazenamento chave/valor. O AsyncStorage cumpre este
 * contrato; os testes usam a versão em memória. A UI nunca importa nenhum dos dois.
 */
export interface ArmazenamentoChaveValor {
  getItem(chave: string): Promise<string | null>;
  setItem(chave: string, valor: string): Promise<void>;
  removeItem(chave: string): Promise<void>;
}

export function criarArmazenamentoEmMemoria(
  inicial: Record<string, string> = {},
): ArmazenamentoChaveValor & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    async getItem(chave) {
      return dados.get(chave) ?? null;
    },
    async setItem(chave, valor) {
      dados.set(chave, valor);
    },
    async removeItem(chave) {
      dados.delete(chave);
    },
  };
}

/** Lê JSON sem lançar: devolve undefined quando o texto está corrompido. */
export function lerJson(texto: string): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Serializa gravações: cada uma espera a anterior, para que um snapshot mais
 * antigo nunca sobrescreva um mais novo.
 */
export function criarFilaDeGravacao() {
  let ultima: Promise<void> = Promise.resolve();
  return (tarefa: () => Promise<void>): Promise<void> => {
    const proxima = ultima.then(tarefa, tarefa);
    ultima = proxima.catch(() => {});
    return proxima;
  };
}
