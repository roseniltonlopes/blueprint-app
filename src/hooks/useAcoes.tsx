import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { AcoesRepository } from "../data/AcoesRepository";
import {
  META_DIARIA_PADRAO,
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
  /** Meta diária vinda das preferências */
  meta: number;
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
  meta?: number;
  /** Onde gravar cada mudança. Sem repositório, o estado fica só em memória (testes). */
  repositorio?: AcoesRepository;
};

/**
 * Estado das ações compartilhado entre as abas. As telas só conhecem useAcoes();
 * quem grava é o repositório recebido aqui (AsyncStorage no app).
 */
export function AcoesProvider({
  children,
  relogio = relogioDoSistema,
  acoesIniciais = [],
  meta = META_DIARIA_PADRAO,
  repositorio,
}: AcoesProviderProps) {
  const [estado, despachar] = useReducer(acoesReducer, { acoes: acoesIniciais });
  const chaveHoje = chaveDoDia(relogio());
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    // O estado inicial veio do próprio repositório; só grava a partir da 1ª mudança.
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    repositorio?.salvar(estado.acoes).catch((erro: unknown) => {
      console.warn("Não foi possível salvar as ações no aparelho.", erro);
    });
  }, [estado.acoes, repositorio]);

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
      meta,
      relogio,
      registrar,
      remover,
      substituir,
    }),
    [estado.acoes, hoje, porCategoriaHoje, meta, relogio, registrar, remover, substituir],
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
