import { NOME_MAX, PERFIL_PADRAO, fotoValida, normalizarNome, type Perfil } from "../domain/perfil";
import { criarFilaDeGravacao, lerJson, type ArmazenamentoChaveValor } from "./armazenamento";

/** Porta de persistência do perfil. A implementação remota (Supabase) entra com o login. */
export interface PerfilRepository {
  carregar(): Promise<Perfil>;
  salvar(perfil: Perfil): Promise<void>;
}

export const CHAVE_PERFIL = "blueprint:perfil";
export const VERSAO_PERFIL = 1;

/** Aproveita cada campo válido e usa o padrão nos demais. Nunca lança. */
export function normalizarPerfil(bruto: unknown): Perfil {
  if (typeof bruto !== "object" || bruto === null) {
    return { ...PERFIL_PADRAO };
  }
  const p = bruto as Record<string, unknown>;
  const nome = typeof p.nome === "string" ? normalizarNome(p.nome).slice(0, NOME_MAX) : "";
  return { nome, foto: fotoValida(p.foto) ? p.foto : null };
}

export function criarPerfilRepositoryLocal(
  armazenamento: ArmazenamentoChaveValor,
): PerfilRepository {
  const enfileirar = criarFilaDeGravacao();
  return {
    async carregar() {
      const texto = await armazenamento.getItem(CHAVE_PERFIL);
      return normalizarPerfil(texto === null ? null : lerJson(texto));
    },
    salvar(perfil) {
      const conteudo = JSON.stringify({ versao: VERSAO_PERFIL, ...normalizarPerfil(perfil) });
      return enfileirar(() => armazenamento.setItem(CHAVE_PERFIL, conteudo));
    },
  };
}
