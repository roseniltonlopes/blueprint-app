import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type { AcoesRepository } from "../data/AcoesRepository";
import type { AgendaRepository } from "../data/AgendaRepository";
import type { PerfilRepository } from "../data/PerfilRepository";
import type { SincronizacaoRepository } from "../data/SincronizacaoRepository";
import type { Acao } from "../domain/acoes";
import { DADOS_AGENDA_VAZIOS, type DadosAgenda, type Resultado } from "../domain/agenda";
import { PERFIL_PADRAO, type Perfil } from "../domain/perfil";
import type { EstadoDaSincronizacao } from "../sincronizacao/estado";
import {
  acoesDaFoto,
  agendaDaFoto,
  fotoDasLinhas,
  fotoDoEstado,
  fotoVazia,
  type Foto,
} from "../sincronizacao/foto";
import {
  fotosIguais,
  planejarSincronizacao,
  reaplicarMudancasLocais,
} from "../sincronizacao/plano";
import {
  ErroDeSincronizacao,
  MENSAGENS_DA_SINCRONIZACAO,
  type PortaRemota,
} from "../sincronizacao/porta";
import { useAcoes } from "./useAcoes";
import { useAgenda } from "./useAgenda";
import { useConta } from "./useConta";
import { usePerfil } from "./usePerfil";

export type UseSincronizacao = {
  estado: EstadoDaSincronizacao;
  /** Fim da última sincronização bem-sucedida desta conta, ou null */
  ultimaSincronizacao: Date | null;
  sincronizarAgora: () => Promise<void>;
  /** Troca os dados do aparelho pelos da conta que entrou (outra conta no mesmo aparelho) */
  confirmarTroca: () => Promise<void>;
  /** Desiste da troca: sai da conta e deixa os dados do aparelho como estão */
  cancelarTroca: () => Promise<void>;
  /** Sai da conta. Sem `manterDados`, apaga ações, agenda, perfil e a base deste aparelho. */
  sair: (opcoes: { manterDados: boolean }) => Promise<Resultado<void>>;
  /**
   * Exclui a conta e os dados na nuvem (função do banco, migração 003), sai e apaga os dados deste
   * aparelho. Se a nuvem recusar (sem internet, migração ausente), nada é apagado.
   */
  excluirConta: () => Promise<Resultado<void>>;
  /** Sem conta: apaga ações, agenda, perfil e a base deste aparelho. */
  apagarDadosDoAparelho: () => Promise<Resultado<void>>;
};

export type NuvemDaSincronizacao = {
  remoto: PortaRemota;
  repositorio: SincronizacaoRepository;
};

/** Repositórios do aparelho: o resultado é gravado neles ANTES da base (ver `executar`). */
export type PersistenciaLocal = {
  acoes: AcoesRepository;
  agenda: AgendaRepository;
  perfil: PerfilRepository;
};

const SincronizacaoContext = createContext<UseSincronizacao | null>(null);

/** Espera depois de uma mudança local, para juntar vários toques numa sincronização só. */
export const ESPERA_APOS_MUDANCA_MS = 2000;
/** Sem internet: nova tentativa depois deste tempo (e sempre que o app volta ao primeiro plano). */
export const ESPERA_APOS_FALHA_MS = 30_000;

const ERRO_AO_APAGAR = "Não foi possível apagar os dados do aparelho. Tente de novo.";
const ERRO_SINCRONIZANDO = "Aguarde a sincronização terminar e tente de novo.";
const ERRO_APOS_EXCLUIR =
  'A conta foi excluída, mas os dados deste aparelho não foram apagados. Use "Apagar dados deste aparelho".';

type Modo = "normal" | "substituir";

type SincronizacaoProviderProps = {
  children: ReactNode;
  /** null quando o Supabase não está configurado (e nos testes que não usam nuvem) */
  nuvem: NuvemDaSincronizacao | null;
  persistencia?: PersistenciaLocal;
  /** Motivo para não sincronizar (por exemplo, a agenda do aparelho não pôde ser lida) */
  pausada?: string | null;
  esperaMs?: number;
  esperaAposFalhaMs?: number;
};

type PorConta<T> = { userId: string | null; valor: T };

/**
 * Sincronização offline-first. O app continua lendo e gravando no aparelho; a nuvem é uma cópia.
 * Cada sincronização baixa tudo, mescla em três vias com a base (src/sincronizacao/plano.ts),
 * envia as diferenças, aplica o resultado no app e só então grava a nova base. Se falhar no meio,
 * a base fica como estava e a próxima recalcula (os envios são idempotentes).
 * Precisa estar dentro de ContaProvider, AcoesProvider, AgendaProvider e PerfilProvider.
 */
export function SincronizacaoProvider({
  children,
  nuvem,
  persistencia,
  pausada = null,
  esperaMs = ESPERA_APOS_MUDANCA_MS,
  esperaAposFalhaMs = ESPERA_APOS_FALHA_MS,
}: SincronizacaoProviderProps) {
  const conta = useConta();
  const { acoes, relogio, substituir: substituirAcoes } = useAcoes();
  const { dados, substituir: substituirAgenda } = useAgenda();
  const { perfil, substituir: substituirPerfil } = usePerfil();

  const sessao = conta.estado.situacao === "conectado" ? conta.estado.sessao : null;
  const userId = sessao?.userId ?? null;
  const ativa = nuvem !== null && userId !== null;

  const [interno, setInterno] = useState<PorConta<EstadoDaSincronizacao>>({
    userId: null,
    valor: { tipo: "aguardando" },
  });
  const [ultima, setUltima] = useState<PorConta<Date | null>>({ userId: null, valor: null });

  // Valores mais novos para o código assíncrono (a sincronização dura alguns segundos).
  const local = useRef<{ acoes: readonly Acao[]; agenda: DadosAgenda; perfil: Perfil }>({
    acoes,
    agenda: dados,
    perfil,
  });
  const sessaoAtual = useRef(sessao);
  /** Foto da última sincronização desta abertura; undefined antes da primeira tentativa */
  const base = useRef<Foto | null | undefined>(undefined);
  const emAndamento = useRef(false);
  const pendente = useRef(false);
  const trocaPendente = useRef(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    local.current = { acoes, agenda: dados, perfil };
  }, [acoes, dados, perfil]);

  useEffect(() => {
    sessaoAtual.current = sessao;
  }, [sessao]);

  const definirEstado = useCallback((dono: string, valor: EstadoDaSincronizacao) => {
    if (sessaoAtual.current?.userId === dono) setInterno({ userId: dono, valor });
  }, []);

  const fotoAtual = useCallback(
    () =>
      fotoDoEstado({
        acoes: local.current.acoes,
        agenda: local.current.agenda,
        nome: local.current.perfil.nome,
      }),
    [],
  );

  /** Grava no aparelho primeiro (se houver repositórios) e depois troca o estado das telas. */
  const aplicarNoApp = useCallback(
    async (novas: { acoes: Acao[]; agenda: DadosAgenda; perfil: Perfil }) => {
      if (persistencia) {
        await Promise.all([
          persistencia.acoes.salvar(novas.acoes),
          persistencia.agenda.salvar(novas.agenda),
          persistencia.perfil.salvar(novas.perfil),
        ]);
      }
      substituirAcoes(novas.acoes);
      substituirAgenda(novas.agenda);
      substituirPerfil(novas.perfil);
    },
    [persistencia, substituirAcoes, substituirAgenda, substituirPerfil],
  );

  const executarRef = useRef<(modo: Modo) => Promise<void>>(async () => {});

  const agendar = useCallback((ms: number) => {
    if (espera.current !== null) clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      espera.current = null;
      void executarRef.current("normal");
    }, ms);
  }, []);

  const executar = useCallback(
    async (modo: Modo) => {
      const sessaoDaVez = sessaoAtual.current;
      if (nuvem === null || pausada !== null || sessaoDaVez === null) return;
      if (modo === "normal" && trocaPendente.current) return;
      if (emAndamento.current) {
        pendente.current = true;
        return;
      }
      emAndamento.current = true;
      const { userId: dono, email } = sessaoDaVez;
      definirEstado(dono, { tipo: "sincronizando" });
      try {
        if (modo === "normal") {
          const donoLocal = await nuvem.repositorio.lerDono();
          if (donoLocal !== null && donoLocal !== dono) {
            trocaPendente.current = true;
            definirEstado(dono, { tipo: "confirmarTroca", email });
            return;
          }
        }
        const baseLida = modo === "substituir" ? null : await nuvem.repositorio.lerBase(dono);
        const antes = fotoAtual();
        const remota = fotoDasLinhas(await nuvem.remoto.baixar(dono));
        if (remota.ignoradas > 0) {
          console.warn(`${remota.ignoradas} linha(s) inválida(s) da nuvem ignorada(s).`);
        }
        const plano = planejarSincronizacao(
          baseLida?.foto ?? null,
          modo === "substituir" ? fotoVazia() : antes,
          remota.foto,
          dono,
        );
        if (plano.descartados > 0) {
          console.warn(`${plano.descartados} item(ns) em conflito descartado(s) na sincronização.`);
        }
        await nuvem.remoto.executar(dono, plano.passos);

        // Saiu da conta enquanto a nuvem respondia: não mexe no aparelho.
        if (sessaoAtual.current?.userId !== dono) return;

        const agora = fotoAtual();
        const aplicada =
          modo === "substituir" || fotosIguais(antes, agora)
            ? plano.foto
            : reaplicarMudancasLocais(antes, agora, plano.foto).foto;
        if (modo === "substituir" || !fotosIguais(aplicada, agora)) {
          await aplicarNoApp({
            acoes: acoesDaFoto(aplicada),
            agenda: agendaDaFoto(aplicada),
            // Na troca de conta a foto do perfil era da outra pessoa: volta para as iniciais.
            perfil: {
              nome: aplicada.nome ?? "",
              foto: modo === "substituir" ? null : local.current.perfil.foto,
            },
          });
        }
        const em = relogio();
        await nuvem.repositorio.gravarBase(dono, plano.foto, em);
        await nuvem.repositorio.gravarDono(dono);
        base.current = plano.foto;
        trocaPendente.current = false;
        setUltima({ userId: dono, valor: em });
        definirEstado(dono, { tipo: "sincronizada", em });
      } catch (erro) {
        if (!(erro instanceof ErroDeSincronizacao)) {
          console.warn("Falha inesperada na sincronização.", erro);
        }
        const motivo = erro instanceof ErroDeSincronizacao ? erro.motivo : "servidor";
        // Sem base conhecida, qualquer mudança local pede uma nova tentativa.
        if (base.current === undefined) base.current = null;
        definirEstado(dono, {
          tipo: "falhou",
          motivo,
          mensagem: MENSAGENS_DA_SINCRONIZACAO[motivo],
        });
        if (motivo === "rede" && sessaoAtual.current?.userId === dono) {
          agendar(esperaAposFalhaMs);
        }
      } finally {
        emAndamento.current = false;
        if (pendente.current) {
          pendente.current = false;
          agendar(0);
        }
      }
    },
    [agendar, aplicarNoApp, definirEstado, esperaAposFalhaMs, fotoAtual, nuvem, pausada, relogio],
  );

  useEffect(() => {
    executarRef.current = executar;
  }, [executar]);

  // Ao entrar (ou abrir o app já com sessão): lê a hora da última sincronização e sincroniza.
  useEffect(() => {
    base.current = undefined;
    trocaPendente.current = false;
    if (nuvem === null || userId === null || pausada !== null) return undefined;
    let vigente = true;
    nuvem.repositorio
      .lerBase(userId)
      .then((lida) => {
        if (vigente && lida !== null) setUltima({ userId, valor: lida.sincronizadoEm });
      })
      .catch((erro: unknown) => console.warn("Não foi possível ler a última sincronização.", erro));
    const inicio = setTimeout(() => void executarRef.current("normal"), 0);
    return () => {
      vigente = false;
      clearTimeout(inicio);
      if (espera.current !== null) {
        clearTimeout(espera.current);
        espera.current = null;
      }
    };
  }, [nuvem, pausada, userId]);

  // Ao voltar ao primeiro plano.
  useEffect(() => {
    if (!ativa || pausada !== null) return undefined;
    const inscricao = AppState.addEventListener("change", (estadoDoApp) => {
      if (estadoDoApp === "active") void executarRef.current("normal");
    });
    return () => inscricao.remove();
  }, [ativa, pausada]);

  // Depois de mudanças locais, com espera para juntar toques seguidos.
  useEffect(() => {
    if (!ativa || pausada !== null) return undefined;
    const conhecida = base.current;
    if (conhecida === undefined) return undefined;
    const mudou =
      conhecida === null ||
      !fotosIguais(fotoDoEstado({ acoes, agenda: dados, nome: perfil.nome }), conhecida);
    if (!mudou) return undefined;
    const temporizador = setTimeout(() => void executarRef.current("normal"), esperaMs);
    return () => clearTimeout(temporizador);
  }, [acoes, dados, perfil.nome, ativa, pausada, esperaMs]);

  const sincronizarAgora = useCallback(() => executarRef.current("normal"), []);

  const confirmarTroca = useCallback(async () => {
    trocaPendente.current = false;
    await executarRef.current("substituir");
  }, []);

  const cancelarTroca = useCallback(async () => {
    trocaPendente.current = false;
    await conta.sair();
  }, [conta]);

  /** Uma sincronização em andamento deixa de aplicar o resultado no aparelho. */
  const suspender = useCallback(() => {
    const anterior = sessaoAtual.current;
    sessaoAtual.current = null;
    if (espera.current !== null) {
      clearTimeout(espera.current);
      espera.current = null;
    }
    return anterior;
  }, []);

  /**
   * Volta o aparelho ao estado da primeira abertura: ações, agenda e perfil vazios, sem base de
   * sincronização e sem dono. As preferências de aparência ficam (não são dados pessoais). Com a
   * agenda vazia, o AlertasProvider reagenda os alertas para nenhum.
   */
  const limparAparelho = useCallback(
    async (userId: string | null) => {
      await aplicarNoApp({ acoes: [], agenda: DADOS_AGENDA_VAZIOS, perfil: { ...PERFIL_PADRAO } });
      if (nuvem !== null) {
        const dono = await nuvem.repositorio.lerDono();
        for (const id of new Set([userId, dono])) {
          if (id !== null) await nuvem.repositorio.apagarBase(id);
        }
        await nuvem.repositorio.gravarDono(null);
      }
    },
    [aplicarNoApp, nuvem],
  );

  const sair = useCallback<UseSincronizacao["sair"]>(
    async ({ manterDados }) => {
      const anterior = suspender();
      if (!manterDados) {
        try {
          await limparAparelho(anterior?.userId ?? null);
        } catch (erro) {
          console.warn("Falha ao apagar os dados do aparelho.", erro);
          sessaoAtual.current = anterior;
          return { ok: false, erro: ERRO_AO_APAGAR };
        }
      }
      await conta.sair();
      return { ok: true, valor: undefined };
    },
    [conta, limparAparelho, suspender],
  );

  const excluirConta = useCallback<UseSincronizacao["excluirConta"]>(async () => {
    if (emAndamento.current) return { ok: false, erro: ERRO_SINCRONIZANDO };
    const anterior = suspender();
    const resultado = await conta.excluirConta();
    if (!resultado.ok) {
      sessaoAtual.current = anterior;
      return resultado;
    }
    try {
      await limparAparelho(anterior?.userId ?? null);
    } catch (erro) {
      console.warn("Conta excluída, mas os dados do aparelho não foram apagados.", erro);
      return { ok: false, erro: ERRO_APOS_EXCLUIR };
    }
    return { ok: true, valor: undefined };
  }, [conta, limparAparelho, suspender]);

  const apagarDadosDoAparelho = useCallback<UseSincronizacao["apagarDadosDoAparelho"]>(async () => {
    try {
      await limparAparelho(null);
      return { ok: true, valor: undefined };
    } catch (erro) {
      console.warn("Falha ao apagar os dados do aparelho.", erro);
      return { ok: false, erro: ERRO_AO_APAGAR };
    }
  }, [limparAparelho]);

  const estado = useMemo<EstadoDaSincronizacao>(() => {
    if (!ativa) return { tipo: "desligada" };
    if (pausada !== null) return { tipo: "pausada", mensagem: pausada };
    return interno.userId === userId ? interno.valor : { tipo: "aguardando" };
  }, [ativa, interno, pausada, userId]);

  const ultimaSincronizacao = ultima.userId === userId ? ultima.valor : null;

  const valor = useMemo<UseSincronizacao>(
    () => ({
      estado,
      ultimaSincronizacao,
      sincronizarAgora,
      confirmarTroca,
      cancelarTroca,
      sair,
      excluirConta,
      apagarDadosDoAparelho,
    }),
    [
      estado,
      ultimaSincronizacao,
      sincronizarAgora,
      confirmarTroca,
      cancelarTroca,
      sair,
      excluirConta,
      apagarDadosDoAparelho,
    ],
  );

  return <SincronizacaoContext.Provider value={valor}>{children}</SincronizacaoContext.Provider>;
}

export function useSincronizacao(): UseSincronizacao {
  const contexto = useContext(SincronizacaoContext);
  if (!contexto) {
    throw new Error("useSincronizacao precisa estar dentro de um SincronizacaoProvider.");
  }
  return contexto;
}
