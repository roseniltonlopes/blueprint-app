import { ROTULO_MAX, ehUuid, type Acao, type EstadoAcoes, type GeradorDeId } from "../domain/acoes";
import { CATEGORIAS, type CategoriaId } from "../domain/categorias";
import { criarFilaDeGravacao, lerJson, type ArmazenamentoChaveValor } from "./armazenamento";

/** Porta de persistência local do estado das ações (ações + fila de sincronização). */
export interface AcoesRepository {
  carregar(): Promise<EstadoAcoes>;
  salvar(estado: EstadoAcoes): Promise<void>;
}

export const CHAVE_ACOES = "blueprint:acoes";
export const VERSAO_ACOES = 2;

type FormatoV1 = { versao: 1; acoes: readonly unknown[] };
type FormatoV2 = {
  versao: 2;
  acoes: readonly unknown[];
  exclusoesPendentes: readonly unknown[];
  lapides: readonly unknown[];
};

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

/**
 * Deixa a ação no formato que o servidor aceita:
 * - ids das etapas anteriores ("local-...") viram UUID (ainda não foram enviados);
 * - "Outro" sem nome (Etapa 2) ganha o nome "Outro"; outras categorias perdem o nome.
 */
function normalizar(acao: Acao, gerarId: GeradorDeId): Acao {
  const categoria = acao.categoria as CategoriaId;
  const idValido = ehUuid(acao.id);
  const base: Acao = {
    id: idValido ? acao.id.toLowerCase() : gerarId(),
    categoria,
    criadoEm: new Date(acao.criadoEm).toISOString(),
  };
  if (categoria === "outro") {
    base.rotulo = acao.rotulo?.trim() || "Outro";
  }
  if (idValido && acao.sincronizada === true) {
    base.sincronizada = true;
  }
  return base;
}

function listaDeIds(valor: unknown): string[] {
  if (!Array.isArray(valor)) {
    return [];
  }
  return [...new Set(valor.filter((v): v is string => typeof v === "string" && v !== ""))];
}

export type ResultadoDaLeitura = {
  estado: EstadoAcoes;
  /** Itens descartados por estarem inválidos ou repetidos */
  descartados: number;
  /** O conteúdo inteiro estava ilegível e foi guardado à parte */
  corrompido: boolean;
};

/**
 * Converte o conteúdo salvo para a versão atual.
 * - versão 0 (protótipo): um array solto de ações
 * - versão 1 (Etapa 6): { versao: 1, acoes }
 * - versão 2 (Etapa 7): { versao: 2, acoes, exclusoesPendentes, lapides }
 */
export function migrarConteudo(
  bruto: unknown,
  gerarId: GeradorDeId,
): Omit<ResultadoDaLeitura, "corrompido"> | null {
  let lista: readonly unknown[] | null = null;
  let pendentes: string[] = [];
  let lapides: string[] = [];

  if (Array.isArray(bruto)) {
    lista = bruto;
  } else if (typeof bruto === "object" && bruto !== null) {
    const objeto = bruto as Partial<FormatoV1 | FormatoV2>;
    if (objeto.versao === 1 && Array.isArray(objeto.acoes)) {
      lista = objeto.acoes;
    } else if (objeto.versao === 2 && Array.isArray(objeto.acoes)) {
      const v2 = objeto as FormatoV2;
      lista = v2.acoes;
      pendentes = listaDeIds(v2.exclusoesPendentes);
      lapides = listaDeIds(v2.lapides);
    }
  }
  if (lista === null) {
    return null;
  }

  const vistos = new Set<string>();
  const acoes: Acao[] = [];
  for (const item of lista) {
    if (acaoValida(item) && !vistos.has(item.id)) {
      vistos.add(item.id);
      acoes.push(normalizar(item, gerarId));
    }
  }
  return {
    estado: { acoes, exclusoesPendentes: pendentes, lapides },
    descartados: lista.length - acoes.length,
  };
}

type Opcoes = {
  gerarId: GeradorDeId;
  /** Chave no armazenamento; por padrão a do modo sem conta */
  chave?: string;
  aoAvisar?: (mensagem: string) => void;
  agora?: () => Date;
};

export function criarAcoesRepositoryLocal(
  armazenamento: ArmazenamentoChaveValor,
  { gerarId, chave = CHAVE_ACOES, aoAvisar = console.warn, agora = () => new Date() }: Opcoes,
): AcoesRepository & { ler(): Promise<ResultadoDaLeitura> } {
  const enfileirar = criarFilaDeGravacao();
  const vazio = (): EstadoAcoes => ({ acoes: [], exclusoesPendentes: [], lapides: [] });

  async function ler(): Promise<ResultadoDaLeitura> {
    const texto = await armazenamento.getItem(chave);
    if (texto === null) {
      return { estado: vazio(), descartados: 0, corrompido: false };
    }

    const resultado = migrarConteudo(lerJson(texto), gerarId);
    if (resultado === null) {
      // Guarda o conteúdo ilegível para diagnóstico em vez de apagar sem rastro.
      const copia = `${chave}:corrompido:${agora().getTime()}`;
      await armazenamento.setItem(copia, texto);
      await armazenamento.removeItem(chave);
      aoAvisar(`Dados de ações ilegíveis; cópia guardada em ${copia}.`);
      return { estado: vazio(), descartados: 0, corrompido: true };
    }
    if (resultado.descartados > 0) {
      aoAvisar(`${resultado.descartados} ação(ões) inválida(s) descartada(s) ao carregar.`);
    }
    return { ...resultado, corrompido: false };
  }

  return {
    ler,
    async carregar() {
      return (await ler()).estado;
    },
    salvar(estado) {
      const conteudo = JSON.stringify({
        versao: VERSAO_ACOES,
        acoes: estado.acoes,
        exclusoesPendentes: estado.exclusoesPendentes,
        lapides: estado.lapides,
      } satisfies FormatoV2);
      return enfileirar(() => armazenamento.setItem(chave, conteudo));
    },
  };
}
