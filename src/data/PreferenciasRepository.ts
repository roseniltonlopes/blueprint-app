import { META_DIARIA_PADRAO } from "../domain/acoes";
import type { Destaque, ThemeMode } from "../theme/ThemeProvider";
import { criarFilaDeGravacao, lerJson, type ArmazenamentoChaveValor } from "./armazenamento";

export type Preferencias = {
  modo: ThemeMode;
  destaque: Destaque;
  /** Meta diária, de 1 a 20 (docs/05, regra "Meta diária") */
  meta: number;
};

export const PREFERENCIAS_PADRAO: Preferencias = {
  modo: "system",
  destaque: "gradiente",
  meta: META_DIARIA_PADRAO,
};

export const CHAVE_PREFERENCIAS = "blueprint:preferencias";
export const META_MIN = 1;
export const META_MAX = 20;

export interface PreferenciasRepository {
  carregar(): Promise<Preferencias>;
  salvar(preferencias: Preferencias): Promise<void>;
}

const MODOS: readonly ThemeMode[] = ["light", "dark", "system"];
const DESTAQUES: readonly Destaque[] = ["gradiente", "laranja", "indigo"];

/** Aproveita cada campo válido e usa o padrão nos demais. Nunca lança. */
export function normalizarPreferencias(bruto: unknown): Preferencias {
  if (typeof bruto !== "object" || bruto === null) {
    return { ...PREFERENCIAS_PADRAO };
  }
  const p = bruto as Record<string, unknown>;
  const meta =
    typeof p.meta === "number" && Number.isInteger(p.meta)
      ? Math.min(META_MAX, Math.max(META_MIN, p.meta))
      : PREFERENCIAS_PADRAO.meta;
  return {
    modo: MODOS.includes(p.modo as ThemeMode) ? (p.modo as ThemeMode) : PREFERENCIAS_PADRAO.modo,
    destaque: DESTAQUES.includes(p.destaque as Destaque)
      ? (p.destaque as Destaque)
      : PREFERENCIAS_PADRAO.destaque,
    meta,
  };
}

export function criarPreferenciasRepositoryLocal(
  armazenamento: ArmazenamentoChaveValor,
): PreferenciasRepository {
  const enfileirar = criarFilaDeGravacao();
  return {
    async carregar() {
      const texto = await armazenamento.getItem(CHAVE_PREFERENCIAS);
      return normalizarPreferencias(texto === null ? null : lerJson(texto));
    },
    salvar(preferencias) {
      const conteudo = JSON.stringify({ versao: 1, ...normalizarPreferencias(preferencias) });
      return enfileirar(() => armazenamento.setItem(CHAVE_PREFERENCIAS, conteudo));
    },
  };
}
