import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import {
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
  /** Relógio usado em todas as telas; fixo nos testes */
  relogio: Relogio;
  registrar: (categoria: CategoriaId, rotulo?: string) => Acao;
  remover: (id: string) => void;
  substituir: (acoes: Acao[]) => void;
};

const AcoesContext = createContext<UseAcoes | null>(null);

type AcoesProviderProps = {
  children: ReactNode;
  relogio?: Relogio;
  acoesIniciais?: Acao[];
};

/**
 * Estado das ações compartilhado entre as abas, em memória.
 * A persistência entra na Etapa 6 sem mudar a interface de useAcoes().
 */
export function AcoesProvider({
  children,
  relogio = relogioDoSistema,
  acoesIniciais = [],
}: AcoesProviderProps) {
  const [estado, despachar] = useReducer(acoesReducer, { acoes: acoesIniciais });
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
  const substituir = useCallback((acoes: Acao[]) => despachar({ tipo: "substituir", acoes }), []);

  const valor = useMemo<UseAcoes>(
    () => ({
      acoes: estado.acoes,
      hoje,
      totalHoje: hoje.length,
      porCategoriaHoje,
      relogio,
      registrar,
      remover,
      substituir,
    }),
    [estado.acoes, hoje, porCategoriaHoje, relogio, registrar, remover, substituir],
  );

  return <AcoesContext.Provider value={valor}>{children}</AcoesContext.Provider>;
}

export function useAcoes(): UseAcoes {
  const contexto = useContext(AcoesContext);
  if (!contexto) {
    throw new Error("useAcoes precisa estar dentro de um AcoesProvider.");
  }
  return contexto;
}
