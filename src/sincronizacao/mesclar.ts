/**
 * Mesclagem de três vias de uma tabela: compara o aparelho (local) e a nuvem (remoto) com a foto
 * da última sincronização bem-sucedida (base). Pura: não lê disco nem rede.
 */

/** JSON com as chaves em ordem: dois objetos com o mesmo conteúdo dão o mesmo texto. */
export function chaveEstavel(valor: unknown): string {
  if (Array.isArray(valor)) {
    return `[${valor.map(chaveEstavel).join(",")}]`;
  }
  if (typeof valor === "object" && valor !== null) {
    const registro = valor as Record<string, unknown>;
    const partes = Object.keys(registro)
      .filter((chave) => registro[chave] !== undefined)
      .sort()
      .map((chave) => `${JSON.stringify(chave)}:${chaveEstavel(registro[chave])}`);
    return `{${partes.join(",")}}`;
  }
  return JSON.stringify(valor) ?? "null";
}

export function iguais(a: unknown, b: unknown): boolean {
  return chaveEstavel(a) === chaveEstavel(b);
}

export type ResultadoDaMesclagem<T> = {
  /** Como a tabela fica nos dois lados depois da sincronização */
  resultado: Map<string, T>;
  /** Criados ou alterados neste aparelho: vão para a nuvem */
  enviar: string[];
  /** Criados ou alterados em outro aparelho: vêm para este */
  trazer: string[];
  /** Apagados neste aparelho: saem da nuvem */
  apagarNoServidor: string[];
  /** Apagados em outro aparelho: saem deste */
  apagarLocal: string[];
};

type Opcoes = {
  /**
   * Quem vence quando os dois lados têm o mesmo id com conteúdos diferentes e os dois mudaram.
   * O padrão é o local. Ações não são editadas (só inseridas e apagadas), então para elas o
   * remoto vence: é o que já está gravado no servidor e não pode ser atualizado.
   */
  conflito?: "local" | "remoto";
};

/**
 * Regras (base = última sincronização bem-sucedida):
 * - só no local e fora da base: criado aqui, enviar;
 * - só no remoto e fora da base: criado em outro aparelho, trazer;
 * - na base e sumiu do local: apagado aqui, apagar no servidor (mesmo que o remoto tenha mudado:
 *   no conflito vale o local);
 * - na base e sumiu do remoto: apagado lá, apagar aqui; se o local mudou depois da base, a
 *   edição local vence e o item volta para a nuvem;
 * - nos dois lados: se só um mudou em relação à base, vale esse lado; se os dois mudaram, vale o
 *   local;
 * - sumiu dos dois lados: nada a fazer.
 * Com base null (primeira sincronização): união dos dois lados, conflito vale o local, nada é
 * apagado.
 */
export function mesclar<T>(
  base: ReadonlyMap<string, T> | null,
  local: ReadonlyMap<string, T>,
  remoto: ReadonlyMap<string, T>,
  { conflito = "local" }: Opcoes = {},
): ResultadoDaMesclagem<T> {
  const saida: ResultadoDaMesclagem<T> = {
    resultado: new Map(),
    enviar: [],
    trazer: [],
    apagarNoServidor: [],
    apagarLocal: [],
  };
  const ids = new Set<string>([...local.keys(), ...remoto.keys(), ...(base?.keys() ?? [])]);

  const ficarComLocal = (id: string, valor: T, enviar: boolean) => {
    saida.resultado.set(id, valor);
    if (enviar) saida.enviar.push(id);
  };
  const ficarComRemoto = (id: string, valor: T, trazer: boolean) => {
    saida.resultado.set(id, valor);
    if (trazer) saida.trazer.push(id);
  };

  for (const id of ids) {
    const l = local.get(id);
    const r = remoto.get(id);
    const b = base?.get(id);

    if (l !== undefined && r !== undefined) {
      if (iguais(l, r)) {
        ficarComLocal(id, l, false);
      } else if (b !== undefined && iguais(l, b)) {
        ficarComRemoto(id, r, true);
      } else if (b !== undefined && iguais(r, b)) {
        ficarComLocal(id, l, true);
      } else if (conflito === "remoto") {
        ficarComRemoto(id, r, true);
      } else {
        ficarComLocal(id, l, true);
      }
    } else if (l !== undefined) {
      if (base === null || b === undefined || !iguais(l, b)) {
        ficarComLocal(id, l, true);
      } else {
        saida.apagarLocal.push(id);
      }
    } else if (r !== undefined) {
      if (base === null || b === undefined) {
        ficarComRemoto(id, r, true);
      } else {
        saida.apagarNoServidor.push(id);
      }
    }
  }
  return saida;
}
