import type { EstadoAcoes, ResultadoDaSincronizacao } from "../domain/acoes";
import type { AcoesRemotas } from "./AcoesRemotas";

/**
 * Uma rodada de sincronização a partir de um retrato do estado:
 * 1. envia as ações ainda não sincronizadas (sem duplicar: o id é a chave);
 * 2. envia as exclusões pendentes (Desfazer);
 * 3. lê tudo o que a conta tem no servidor.
 * O reducer junta o resultado com o estado do momento (aplicarSincronizacao).
 * Falha de rede lança erro e nada é marcado: a próxima rodada tenta de novo.
 */
export async function sincronizar(
  estado: EstadoAcoes,
  remotas: AcoesRemotas,
): Promise<ResultadoDaSincronizacao> {
  const pendentes = estado.acoes.filter((a) => !a.sincronizada);
  if (pendentes.length > 0) {
    await remotas.enviar(pendentes);
  }

  const excluidas = [...estado.exclusoesPendentes];
  if (excluidas.length > 0) {
    await remotas.excluir(excluidas);
  }

  const doServidor = await remotas.listar();
  return { enviadas: pendentes.map((a) => a.id), excluidas, doServidor };
}

/** true quando há algo do aparelho para mandar ao servidor. */
export function temPendencias(estado: EstadoAcoes): boolean {
  return estado.exclusoesPendentes.length > 0 || estado.acoes.some((a) => !a.sincronizada);
}
