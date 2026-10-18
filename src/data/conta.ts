import type { EstadoAcoes, GeradorDeId } from "../domain/acoes";
import { CHAVE_ACOES, criarAcoesRepositoryLocal } from "./AcoesRepository";
import type { ArmazenamentoChaveValor } from "./armazenamento";

/** Cada conta tem a própria chave: dados de uma pessoa nunca vão para a conta de outra. */
export function chaveDaConta(usuarioId: string): string {
  return `${CHAVE_ACOES}:conta:${usuarioId}`;
}

/**
 * Carrega o estado da conta. Se a conta ainda não tem nada no aparelho e existem
 * ações feitas antes do login (chave sem conta), elas são adotadas pela conta,
 * enviadas na primeira sincronização e removidas da chave sem conta.
 */
export async function carregarEstadoDaConta(
  armazenamento: ArmazenamentoChaveValor,
  usuarioId: string,
  gerarId: GeradorDeId,
): Promise<EstadoAcoes> {
  const daConta = criarAcoesRepositoryLocal(armazenamento, {
    gerarId,
    chave: chaveDaConta(usuarioId),
  });
  const estado = await daConta.carregar();
  if (estado.acoes.length > 0 || estado.exclusoesPendentes.length > 0) {
    return estado;
  }

  const semConta = criarAcoesRepositoryLocal(armazenamento, { gerarId });
  const anteriores = await semConta.carregar();
  if (anteriores.acoes.length === 0) {
    return estado;
  }
  const adotado: EstadoAcoes = {
    acoes: anteriores.acoes.map(({ sincronizada: _ignorado, ...acao }) => acao),
    exclusoesPendentes: [],
    lapides: [],
  };
  await daConta.salvar(adotado);
  await armazenamento.removeItem(CHAVE_ACOES);
  return adotado;
}
