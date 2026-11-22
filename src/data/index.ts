import AsyncStorage from "@react-native-async-storage/async-storage";
import { criarAcoesRepositoryLocal } from "./AcoesRepository";
import { criarAgendaRepositoryLocal } from "./AgendaRepository";
import { criarPerfilRepositoryLocal } from "./PerfilRepository";
import { criarPreferenciasRepositoryLocal } from "./PreferenciasRepository";
import { criarSincronizacaoRepositoryLocal } from "./SincronizacaoRepository";

/** Repositórios do app ligados ao AsyncStorage. Só App.tsx importa este arquivo. */
export const repositorios = {
  acoes: criarAcoesRepositoryLocal(AsyncStorage),
  agenda: criarAgendaRepositoryLocal(AsyncStorage),
  perfil: criarPerfilRepositoryLocal(AsyncStorage),
  preferencias: criarPreferenciasRepositoryLocal(AsyncStorage),
  sincronizacao: criarSincronizacaoRepositoryLocal(AsyncStorage),
};

export type { AcoesRepository } from "./AcoesRepository";
export type { AgendaRepository } from "./AgendaRepository";
export type { PerfilRepository } from "./PerfilRepository";
export type { Preferencias, PreferenciasRepository } from "./PreferenciasRepository";
export type { SincronizacaoRepository } from "./SincronizacaoRepository";
