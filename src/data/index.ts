import AsyncStorage from "@react-native-async-storage/async-storage";
import { gerarUuid } from "../domain/ids";
import { CHAVE_ACOES, criarAcoesRepositoryLocal } from "./AcoesRepository";
import { criarPreferenciasRepositoryLocal } from "./PreferenciasRepository";
import { carregarEstadoDaConta, chaveDaConta } from "./conta";

/** Repositórios do app ligados ao AsyncStorage. Só App.tsx importa este arquivo. */
export const repositorios = {
  preferencias: criarPreferenciasRepositoryLocal(AsyncStorage),
  /** Modo sem Supabase configurado: ações só no aparelho */
  acoesSemConta: criarAcoesRepositoryLocal(AsyncStorage, { gerarId: gerarUuid }),
  acoesDaConta: (usuarioId: string) =>
    criarAcoesRepositoryLocal(AsyncStorage, { gerarId: gerarUuid, chave: chaveDaConta(usuarioId) }),
  carregarEstadoDaConta: (usuarioId: string) =>
    carregarEstadoDaConta(AsyncStorage, usuarioId, gerarUuid),
  apagarDadosDaConta: (usuarioId: string) => AsyncStorage.removeItem(chaveDaConta(usuarioId)),
};

export { CHAVE_ACOES };
export type { AcoesRepository } from "./AcoesRepository";
export type { Preferencias, PreferenciasRepository } from "./PreferenciasRepository";
