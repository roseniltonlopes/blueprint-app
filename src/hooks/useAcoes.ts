import { useCallback, useMemo, useReducer } from "react";
import {
  ESTADO_INICIAL,
  acoesDoDia,
  acoesReducer,
  contarPorCategoria,
  criarAcao,
  type Acao,
  type ContagemPorCategoria,
} from "../domain/acoes";
import type { CategoriaId } from "../domain/categorias";
import { chaveDoDia } from "../domain/datas";

export type Relogio = () => Date;

const relogioDoSistema: Relogio = () => new Date();

export type UseAcoes = {
  acoes: readonly Acao[];
  hoje: readonly Acao[];
  totalHoje: number;
  porCategoriaHoje: ContagemPorCategoria;
  registrar: (categoria: CategoriaId, rotulo?: string) => Acao;
  remover: (id: string) => void;
};

/**
 * Estado das ações em memória. A persistência entra na Etapa 6 sem mudar esta interface.
 * `relogio` permite fixar o "agora" em testes.
 */
export function useAcoes(relogio: Relogio = relogioDoSistema): UseAcoes {
  const [estado, despachar] = useReducer(acoesReducer, ESTADO_INICIAL);
  const chaveHoje = chaveDoDia(relogio());

  const hoje = useMemo(() => acoesDoDia(estado.acoes, chaveHoje), [estado.acoes, chaveHoje]);
  const porCategoriaHoje = useMemo(() => contarPorCategoria(hoje), [hoje]);

  const registrar = useCallback(
    (categoria: CategoriaId, rotulo?: string) => {
      const acao = criarAcao(categoria, relogio(), rotulo);
      despachar({ tipo: "registrar", acao });
      return acao;
    },
    [relogio],
  );

  const remover = useCallback((id: string) => despachar({ tipo: "remover", id }), []);

  return {
    acoes: estado.acoes,
    hoje,
    totalHoje: hoje.length,
    porCategoriaHoje,
    registrar,
    remover,
  };
}
