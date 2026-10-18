import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type { AcoesRemotas } from "../data/AcoesRemotas";
import type { AcoesRepository } from "../data/AcoesRepository";
import { sincronizar, temPendencias } from "../data/sincronizacao";
import {
  ESTADO_INICIAL,
  META_DIARIA_PADRAO,
  acoesDoDia,
  acoesReducer,
  contarPorCategoria,
  criarAcao,
  type Acao,
  type ContagemPorCategoria,
  type EstadoAcoes,
  type GeradorDeId,
} from "../domain/acoes";
import type { CategoriaId } from "../domain/categorias";
import { chaveDoDia } from "../domain/datas";
import { gerarUuid } from "../domain/ids";

export type Relogio = () => Date;

const relogioDoSistema: Relogio = () => new Date();

/** Atraso para juntar vários registros seguidos numa só rodada de envio. */
export const ATRASO_DA_SINCRONIZACAO_MS = 800;

export type EstadoDaSincronizacao =
  | { situacao: "desligada" }
  | { situacao: "sincronizando" }
  | { situacao: "ok"; ultimaEm: Date }
  | { situacao: "erro"; ultimaEm: Date | null };

export type UseAcoes = {
  acoes: readonly Acao[];
  hoje: readonly Acao[];
  totalHoje: number;
  porCategoriaHoje: ContagemPorCategoria;
  /** Meta diária vinda das preferências */
  meta: number;
  /** Relógio usado em todas as telas; fixo nos testes */
  relogio: Relogio;
  sincronizacao: EstadoDaSincronizacao;
  /** Ações ou exclusões ainda não enviadas ao servidor */
  pendencias: number;
  registrar: (categoria: CategoriaId, rotulo?: string) => Acao;
  remover: (id: string) => void;
  substituir: (acoes: Acao[]) => void;
  sincronizarAgora: () => void;
};

const AcoesContext = createContext<UseAcoes | null>(null);

type AcoesProviderProps = {
  children: ReactNode;
  relogio?: Relogio;
  estadoInicial?: EstadoAcoes;
  meta?: number;
  gerarId?: GeradorDeId;
  /** Onde gravar cada mudança. Sem repositório, o estado fica só em memória (testes). */
  repositorio?: AcoesRepository;
  /** Servidor da conta logada. Sem ele, nada é sincronizado. */
  remotas?: AcoesRemotas | null;
};

/**
 * Estado das ações compartilhado entre as abas, offline-first: tudo acontece no
 * aparelho na hora e o servidor é atualizado em segundo plano. As telas só
 * conhecem useAcoes().
 */
export function AcoesProvider({
  children,
  relogio = relogioDoSistema,
  estadoInicial = ESTADO_INICIAL,
  meta = META_DIARIA_PADRAO,
  gerarId = gerarUuid,
  repositorio,
  remotas = null,
}: AcoesProviderProps) {
  const [estado, despachar] = useReducer(acoesReducer, estadoInicial);
  const [sincronizacao, setSincronizacao] = useState<EstadoDaSincronizacao>(
    remotas ? { situacao: "sincronizando" } : { situacao: "desligada" },
  );
  const chaveHoje = chaveDoDia(relogio());
  const primeiraRenderizacao = useRef(true);
  const estadoAtual = useRef(estado);
  const rodando = useRef(false);
  const repetir = useRef(false);
  const ultimaComSucesso = useRef<Date | null>(null);
  const [pedidosDeRodada, setPedidosDeRodada] = useState(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    estadoAtual.current = estado;
  }, [estado]);

  // Persistência local: o estado inicial veio do próprio repositório.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    repositorio?.salvar(estado).catch((erro: unknown) => {
      console.warn("Não foi possível salvar as ações no aparelho.", erro);
    });
  }, [estado, repositorio]);

  const rodarSincronizacao = useCallback(async () => {
    if (!remotas) {
      return;
    }
    if (rodando.current) {
      repetir.current = true;
      return;
    }
    rodando.current = true;
    setSincronizacao({ situacao: "sincronizando" });
    try {
      const resultado = await sincronizar(estadoAtual.current, remotas);
      // Saiu da tela (logout) durante a rodada: descarta o resultado.
      if (!montado.current) return;
      despachar({ tipo: "aplicarSincronizacao", resultado });
      ultimaComSucesso.current = relogio();
      setSincronizacao({ situacao: "ok", ultimaEm: ultimaComSucesso.current });
    } catch (erro) {
      if (!montado.current) return;
      console.warn(
        "Sincronização falhou; nova tentativa na próxima mudança ou ao voltar ao app.",
        erro,
      );
      setSincronizacao({ situacao: "erro", ultimaEm: ultimaComSucesso.current });
    } finally {
      rodando.current = false;
      if (repetir.current && montado.current) {
        repetir.current = false;
        // Mudanças feitas durante a rodada: pede nova rodada depois que o estado atualizar.
        setPedidosDeRodada((n) => n + 1);
      }
    }
  }, [remotas, relogio]);

  useEffect(() => {
    if (pedidosDeRodada === 0) {
      return;
    }
    const timer = setTimeout(() => void rodarSincronizacao(), 0);
    return () => clearTimeout(timer);
  }, [pedidosDeRodada, rodarSincronizacao]);

  // Ao entrar e sempre que o app volta ao primeiro plano.
  useEffect(() => {
    if (!remotas) {
      return;
    }
    const inicial = setTimeout(() => void rodarSincronizacao(), 0);
    const inscricao = AppState.addEventListener("change", (situacao) => {
      if (situacao === "active") {
        void rodarSincronizacao();
      }
    });
    return () => {
      clearTimeout(inicial);
      inscricao.remove();
    };
  }, [remotas, rodarSincronizacao]);

  // Depois de cada mudança com algo a enviar.
  const pendente = temPendencias(estado);
  useEffect(() => {
    if (!remotas || !pendente) {
      return;
    }
    const timer = setTimeout(() => void rodarSincronizacao(), ATRASO_DA_SINCRONIZACAO_MS);
    return () => clearTimeout(timer);
  }, [estado, pendente, remotas, rodarSincronizacao]);

  const hoje = useMemo(() => acoesDoDia(estado.acoes, chaveHoje), [estado.acoes, chaveHoje]);
  const porCategoriaHoje = useMemo(() => contarPorCategoria(hoje), [hoje]);
  const pendencias =
    estado.exclusoesPendentes.length + estado.acoes.filter((a) => !a.sincronizada).length;

  const registrar = useCallback(
    (categoria: CategoriaId, rotulo?: string) => {
      const acao = criarAcao(categoria, relogio(), rotulo, gerarId);
      despachar({ tipo: "registrar", acao });
      return acao;
    },
    [relogio, gerarId],
  );
  const remover = useCallback((id: string) => despachar({ tipo: "remover", id }), []);
  const substituir = useCallback((acoes: Acao[]) => despachar({ tipo: "substituir", acoes }), []);
  const sincronizarAgora = useCallback(() => void rodarSincronizacao(), [rodarSincronizacao]);

  const valor = useMemo<UseAcoes>(
    () => ({
      acoes: estado.acoes,
      hoje,
      totalHoje: hoje.length,
      porCategoriaHoje,
      meta,
      relogio,
      sincronizacao,
      pendencias,
      registrar,
      remover,
      substituir,
      sincronizarAgora,
    }),
    [
      estado.acoes,
      hoje,
      porCategoriaHoje,
      meta,
      relogio,
      sincronizacao,
      pendencias,
      registrar,
      remover,
      substituir,
      sincronizarAgora,
    ],
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
