import { ROTULO_MAX, type Acao } from "../domain/acoes";
import { CATEGORIAS, type CategoriaId } from "../domain/categorias";
import { criarFilaDeGravacao, lerJson, type ArmazenamentoChaveValor } from "./armazenamento";

/** Porta de persistência das ações. A implementação remota (Supabase) entra na Etapa 7. */
export interface AcoesRepository {
  carregar(): Promise<Acao[]>;
  salvar(acoes: readonly Acao[]): Promise<void>;
}

export const CHAVE_ACOES = "blueprint:acoes";
export const VERSAO_ACOES = 1;

type FormatoV1 = { versao: 1; acoes: readonly unknown[] };

const IDS_VALIDOS = new Set<string>(CATEGORIAS.map((c) => c.id));

/** Valida uma ação vinda do disco. Itens inválidos são descartados, não quebram o app. */
export function acaoValida(valor: unknown): valor is Acao {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const a = valor as Record<string, unknown>;
  if (typeof a.id !== "string" || a.id.length === 0) return false;
  if (typeof a.categoria !== "string" || !IDS_VALIDOS.has(a.categoria)) return false;
  if (typeof a.criadoEm !== "string" || Number.isNaN(Date.parse(a.criadoEm))) return false;
  if (
    a.rotulo !== undefined &&
    (typeof a.rotulo !== "string" || a.rotulo.trim().length === 0 || a.rotulo.length > ROTULO_MAX)
  ) {
    return false;
  }
  return true;
}

function normalizar(acao: Acao): Acao {
  return {
    id: acao.id,
    categoria: acao.categoria as CategoriaId,
    criadoEm: new Date(acao.criadoEm).toISOString(),
    ...(acao.rotulo !== undefined ? { rotulo: acao.rotulo.trim() } : {}),
  };
}

export type ResultadoDaLeitura = {
  acoes: Acao[];
  /** Itens descartados por estarem inválidos */
  descartados: number;
  /** O conteúdo inteiro estava ilegível e foi guardado à parte */
  corrompido: boolean;
};

/**
 * Converte o conteúdo salvo para a versão atual.
 * - versão 0 (protótipo): um array solto de ações
 * - versão 1: { versao: 1, acoes: [...] }
 */
export function migrarConteudo(bruto: unknown): ResultadoDaLeitura | null {
  let lista: readonly unknown[] | null = null;
  if (Array.isArray(bruto)) {
    lista = bruto;
  } else if (
    typeof bruto === "object" &&
    bruto !== null &&
    (bruto as FormatoV1).versao === 1 &&
    Array.isArray((bruto as FormatoV1).acoes)
  ) {
    lista = (bruto as FormatoV1).acoes;
  }
  if (lista === null) {
    return null;
  }

  const vistos = new Set<string>();
  const acoes: Acao[] = [];
  for (const item of lista) {
    if (acaoValida(item) && !vistos.has(item.id)) {
      vistos.add(item.id);
      acoes.push(normalizar(item));
    }
  }
  return { acoes, descartados: lista.length - acoes.length, corrompido: false };
}

type Opcoes = {
  aoAvisar?: (mensagem: string) => void;
  agora?: () => Date;
};

export function criarAcoesRepositoryLocal(
  armazenamento: ArmazenamentoChaveValor,
  { aoAvisar = console.warn, agora = () => new Date() }: Opcoes = {},
): AcoesRepository & { ler(): Promise<ResultadoDaLeitura> } {
  const enfileirar = criarFilaDeGravacao();

  async function ler(): Promise<ResultadoDaLeitura> {
    const texto = await armazenamento.getItem(CHAVE_ACOES);
    if (texto === null) {
      return { acoes: [], descartados: 0, corrompido: false };
    }

    const resultado = migrarConteudo(lerJson(texto));
    if (resultado === null) {
      // Guarda o conteúdo ilegível para diagnóstico em vez de apagar sem rastro.
      const copia = `${CHAVE_ACOES}:corrompido:${agora().getTime()}`;
      await armazenamento.setItem(copia, texto);
      await armazenamento.removeItem(CHAVE_ACOES);
      aoAvisar(`Dados de ações ilegíveis; cópia guardada em ${copia}.`);
      return { acoes: [], descartados: 0, corrompido: true };
    }
    if (resultado.descartados > 0) {
      aoAvisar(`${resultado.descartados} ação(ões) inválida(s) descartada(s) ao carregar.`);
    }
    return resultado;
  }

  return {
    ler,
    async carregar() {
      return (await ler()).acoes;
    },
    salvar(acoes) {
      const conteudo = JSON.stringify({ versao: VERSAO_ACOES, acoes } satisfies FormatoV1);
      return enfileirar(() => armazenamento.setItem(CHAVE_ACOES, conteudo));
    },
  };
}
