import { lerBase, serializarBase, type BaseLida, type Foto } from "../sincronizacao/foto";
import { lerJson, type ArmazenamentoChaveValor } from "./armazenamento";

/** Conta dona dos dados guardados neste aparelho. Ausente: dados de quem ainda não entrou. */
export const CHAVE_DONO = "blueprint:dono";
/** Base da mesclagem de três vias: foto da última sincronização bem-sucedida, por conta. */
export const PREFIXO_DA_BASE = "blueprint:sync:";

export function chaveDaBase(userId: string): string {
  return `${PREFIXO_DA_BASE}${userId}`;
}

export interface SincronizacaoRepository {
  lerDono(): Promise<string | null>;
  /** null apaga: os dados do aparelho voltam a não ter dono */
  gravarDono(userId: string | null): Promise<void>;
  /** null quando nunca sincronizou ou a base está ilegível (a próxima vira a primeira) */
  lerBase(userId: string): Promise<BaseLida | null>;
  gravarBase(userId: string, foto: Foto, sincronizadoEm: Date): Promise<void>;
  apagarBase(userId: string): Promise<void>;
}

export function criarSincronizacaoRepositoryLocal(
  armazenamento: ArmazenamentoChaveValor,
): SincronizacaoRepository {
  return {
    async lerDono() {
      const dono = await armazenamento.getItem(CHAVE_DONO);
      return dono !== null && dono.length > 0 ? dono : null;
    },
    async gravarDono(userId) {
      if (userId === null) {
        await armazenamento.removeItem(CHAVE_DONO);
      } else {
        await armazenamento.setItem(CHAVE_DONO, userId);
      }
    },
    async lerBase(userId) {
      const texto = await armazenamento.getItem(chaveDaBase(userId));
      return texto === null ? null : lerBase(lerJson(texto));
    },
    async gravarBase(userId, foto, sincronizadoEm) {
      await armazenamento.setItem(chaveDaBase(userId), serializarBase(foto, sincronizadoEm));
    },
    async apagarBase(userId) {
      await armazenamento.removeItem(chaveDaBase(userId));
    },
  };
}
