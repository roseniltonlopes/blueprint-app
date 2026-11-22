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
import type { AgendaRepository } from "../data/AgendaRepository";
import { gerarIdLocal, type Acao } from "../domain/acoes";
import {
  DADOS_AGENDA_VAZIOS,
  agendaDaData,
  agendaEmCurso,
  atividadeEmUso,
  dividirAPartirDe,
  duplicarParaProximoMes,
  ocorrenciasDoDia,
  validarAgenda,
  validarAtividade,
  validarAvulso,
  validarCompromisso,
  type Agenda,
  type Atividade,
  type Avulso,
  type Compromisso,
  type DadosAgenda,
  type IconeAtividade,
  type Ocorrencia,
  type Resultado,
} from "../domain/agenda";
import type { CategoriaId } from "../domain/categorias";
import { chaveDoDia } from "../domain/datas";
import {
  planejarMarcacao,
  registroDaOcorrencia,
  remapearRegistros,
  substituirRegistro,
  type RegistroCompromisso,
  type StatusDoRegistro,
} from "../domain/registros";
import { useAcoes, type Relogio } from "./useAcoes";

export type EscopoDaEdicao = "periodo" | "a-partir-de-hoje";

/** O que uma marcação mudou, para o Desfazer voltar exatamente ao estado anterior. */
export type Marcacao = {
  chave: string;
  data: string;
  anterior: RegistroCompromisso | null;
  atual: RegistroCompromisso | null;
  acaoCriada: Acao | null;
  acaoRemovida: Acao | null;
};
export type CompromissoRascunho = Omit<Compromisso, "id"> & { id?: string };
export type AvulsoRascunho = Omit<Avulso, "id"> & { id?: string };
export type PeriodoDaAgenda = { nome: string; inicio: string; fim: string };

export type UseAgenda = {
  dados: DadosAgenda;
  relogio: Relogio;
  ocorrenciasDe: (data: Date) => Ocorrencia[];
  agendaDe: (data: Date) => Agenda | undefined;
  criarAtividade: (e: {
    nome: string;
    icone: IconeAtividade;
    categoria: CategoriaId | null;
  }) => Resultado<Atividade>;
  removerAtividade: (id: string) => Resultado<void>;
  salvarCompromisso: (
    agendaId: string,
    compromisso: CompromissoRascunho,
    escopo?: EscopoDaEdicao,
  ) => Resultado<void>;
  removerCompromisso: (
    agendaId: string,
    compromissoId: string,
    escopo?: EscopoDaEdicao,
  ) => Resultado<void>;
  salvarAvulso: (avulso: AvulsoRascunho) => Resultado<void>;
  removerAvulso: (id: string) => Resultado<void>;
  criarAgenda: (periodo: PeriodoDaAgenda) => Resultado<Agenda>;
  editarAgenda: (id: string, periodo: PeriodoDaAgenda) => Resultado<void>;
  removerAgenda: (id: string) => Resultado<void>;
  duplicarAgenda: (id: string) => Resultado<Agenda>;
  registroDe: (chaveDaOcorrencia: string, data: Date) => RegistroCompromisso | undefined;
  /**
   * Marca "Feito" ou "Não fui" em um compromisso de hoje (tocar de novo no mesmo desmarca).
   * "Feito" de atividade com categoria também registra a ação de hábito.
   */
  marcar: (chaveDaOcorrencia: string, status: StatusDoRegistro) => Resultado<Marcacao>;
  desfazerMarcacao: (marcacao: Marcacao) => void;
  /** Só para a ferramenta de desenvolvimento. */
  substituir: (dados: DadosAgenda) => void;
};

const AgendaContext = createContext<UseAgenda | null>(null);

const SUCESSO: Resultado<void> = { ok: true, valor: undefined };

function falha(erro: string): { ok: false; erro: string } {
  return { ok: false, erro };
}

function ordenarAgendas(agendas: Agenda[]): Agenda[] {
  return [...agendas].sort((a, b) => a.inicio.localeCompare(b.inicio));
}

const gerarIdPadrao = () => gerarIdLocal(new Date());

type AgendaProviderProps = {
  children: ReactNode;
  agendaInicial?: DadosAgenda;
  /** Onde gravar cada mudança. Sem repositório, o estado fica só em memória (testes). */
  repositorio?: AgendaRepository;
  gerarId?: () => string;
};

/**
 * Estado da agenda compartilhado entre as telas. Cada mutação valida com as regras do
 * domínio e devolve um `Resultado`; só uma mutação válida altera o estado e grava.
 * Precisa estar dentro de um AcoesProvider (usa o mesmo relógio).
 */
export function AgendaProvider({
  children,
  agendaInicial = DADOS_AGENDA_VAZIOS,
  repositorio,
  gerarId = gerarIdPadrao,
}: AgendaProviderProps) {
  const { relogio, acoes, registrar, remover, restaurar } = useAcoes();
  const [dados, setDados] = useState<DadosAgenda>(agendaInicial);
  // Chamadas seguidas no mesmo ciclo precisam enxergar o estado mais novo.
  const atual = useRef(dados);
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    // O estado inicial veio do próprio repositório; só grava a partir da 1ª mudança.
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    repositorio?.salvar(dados).catch((erro: unknown) => {
      console.warn("Não foi possível salvar a agenda no aparelho.", erro);
    });
  }, [dados, repositorio]);

  const aplicar = useCallback((proximo: DadosAgenda) => {
    atual.current = proximo;
    setDados(proximo);
  }, []);

  const ocorrenciasDe = useCallback((data: Date) => ocorrenciasDoDia(dados, data), [dados]);
  const agendaDe = useCallback((data: Date) => agendaDaData(dados.agendas, data), [dados]);

  const criarAtividade = useCallback<UseAgenda["criarAtividade"]>(
    ({ nome, icone, categoria }) => {
      const base = atual.current;
      const erro = validarAtividade({ nome, icone, categoria }, base.atividades);
      if (erro !== null) return falha(erro);
      const atividade: Atividade = {
        id: gerarId(),
        nome: nome.trim(),
        icone,
        categoria,
        criadaEm: relogio().toISOString(),
      };
      aplicar({ ...base, atividades: [...base.atividades, atividade] });
      return { ok: true, valor: atividade };
    },
    [aplicar, gerarId, relogio],
  );

  const removerAtividade = useCallback<UseAgenda["removerAtividade"]>(
    (id) => {
      const base = atual.current;
      if (!base.atividades.some((a) => a.id === id)) return falha("Atividade não encontrada");
      if (atividadeEmUso(base, id)) return falha("Esta atividade está em uso por compromissos");
      aplicar({ ...base, atividades: base.atividades.filter((a) => a.id !== id) });
      return SUCESSO;
    },
    [aplicar],
  );

  /**
   * Agendas depois da divisão (se couber), a agenda onde a mudança deve ser aplicada e os
   * registros de hoje em diante já apontando para as cópias dos compromissos.
   */
  const prepararEscopo = useCallback(
    (base: DadosAgenda, agenda: Agenda, escopo: EscopoDaEdicao) => {
      const hoje = relogio();
      if (escopo !== "a-partir-de-hoje" || !agendaEmCurso(agenda, hoje)) {
        return { agendas: base.agendas, alvo: agenda, idsNovos: null, registros: base.registros };
      }
      const { anterior, nova, idsNovos } = dividirAPartirDe(agenda, hoje, gerarId);
      const agendas = base.agendas.map((a) => (a.id === agenda.id ? anterior : a));
      return {
        agendas: [...agendas, nova],
        alvo: nova,
        idsNovos,
        registros: remapearRegistros(base.registros, idsNovos, chaveDoDia(hoje)),
      };
    },
    [gerarId, relogio],
  );

  const salvarCompromisso = useCallback<UseAgenda["salvarCompromisso"]>(
    (agendaId, rascunho, escopo = "periodo") => {
      const base = atual.current;
      const agenda = base.agendas.find((a) => a.id === agendaId);
      if (!agenda) return falha("Agenda não encontrada");
      if (!base.atividades.some((a) => a.id === rascunho.atividadeId)) {
        return falha("Atividade não encontrada");
      }
      const { id, ...conteudo } = rascunho;
      const erro = validarCompromisso(conteudo);
      if (erro !== null) return falha(erro);

      const { agendas, alvo, idsNovos, registros } = prepararEscopo(base, agenda, escopo);
      const idNoAlvo = id === undefined ? undefined : (idsNovos?.[id] ?? id);
      if (idNoAlvo !== undefined && !alvo.compromissos.some((c) => c.id === idNoAlvo)) {
        return falha("Compromisso não encontrado");
      }
      const compromisso: Compromisso = { ...conteudo, id: idNoAlvo ?? gerarId() };
      const compromissos =
        idNoAlvo === undefined
          ? [...alvo.compromissos, compromisso]
          : alvo.compromissos.map((c) => (c.id === idNoAlvo ? compromisso : c));
      aplicar({
        ...base,
        registros,
        agendas: ordenarAgendas(
          agendas.map((a) => (a.id === alvo.id ? { ...alvo, compromissos } : a)),
        ),
      });
      return SUCESSO;
    },
    [aplicar, gerarId, prepararEscopo],
  );

  const removerCompromisso = useCallback<UseAgenda["removerCompromisso"]>(
    (agendaId, compromissoId, escopo = "periodo") => {
      const base = atual.current;
      const agenda = base.agendas.find((a) => a.id === agendaId);
      if (!agenda) return falha("Agenda não encontrada");
      const { agendas, alvo, idsNovos, registros } = prepararEscopo(base, agenda, escopo);
      const idNoAlvo = idsNovos?.[compromissoId] ?? compromissoId;
      if (!alvo.compromissos.some((c) => c.id === idNoAlvo)) {
        return falha("Compromisso não encontrado");
      }
      const compromissos = alvo.compromissos.filter((c) => c.id !== idNoAlvo);
      aplicar({
        ...base,
        registros,
        agendas: ordenarAgendas(
          agendas.map((a) => (a.id === alvo.id ? { ...alvo, compromissos } : a)),
        ),
      });
      return SUCESSO;
    },
    [aplicar, prepararEscopo],
  );

  const salvarAvulso = useCallback<UseAgenda["salvarAvulso"]>(
    (rascunho) => {
      const base = atual.current;
      if (!base.atividades.some((a) => a.id === rascunho.atividadeId)) {
        return falha("Atividade não encontrada");
      }
      const { id, ...conteudo } = rascunho;
      const erro = validarAvulso(conteudo);
      if (erro !== null) return falha(erro);
      if (id !== undefined && !base.avulsos.some((v) => v.id === id)) {
        return falha("Compromisso não encontrado");
      }
      const avulso: Avulso = { ...conteudo, id: id ?? gerarId() };
      const avulsos =
        id === undefined
          ? [...base.avulsos, avulso]
          : base.avulsos.map((v) => (v.id === id ? avulso : v));
      aplicar({ ...base, avulsos });
      return SUCESSO;
    },
    [aplicar, gerarId],
  );

  const removerAvulso = useCallback<UseAgenda["removerAvulso"]>(
    (id) => {
      const base = atual.current;
      if (!base.avulsos.some((v) => v.id === id)) return falha("Compromisso não encontrado");
      aplicar({ ...base, avulsos: base.avulsos.filter((v) => v.id !== id) });
      return SUCESSO;
    },
    [aplicar],
  );

  const criarAgenda = useCallback<UseAgenda["criarAgenda"]>(
    (periodo) => {
      const base = atual.current;
      const erro = validarAgenda(periodo, base.agendas);
      if (erro !== null) return falha(erro);
      const agenda: Agenda = {
        id: gerarId(),
        ...periodo,
        nome: periodo.nome.trim(),
        compromissos: [],
      };
      aplicar({ ...base, agendas: ordenarAgendas([...base.agendas, agenda]) });
      return { ok: true, valor: agenda };
    },
    [aplicar, gerarId],
  );

  const editarAgenda = useCallback<UseAgenda["editarAgenda"]>(
    (id, periodo) => {
      const base = atual.current;
      if (!base.agendas.some((a) => a.id === id)) return falha("Agenda não encontrada");
      const erro = validarAgenda({ id, ...periodo }, base.agendas);
      if (erro !== null) return falha(erro);
      const agendas = base.agendas.map((a) =>
        a.id === id ? { ...a, ...periodo, nome: periodo.nome.trim() } : a,
      );
      aplicar({ ...base, agendas: ordenarAgendas(agendas) });
      return SUCESSO;
    },
    [aplicar],
  );

  const removerAgenda = useCallback<UseAgenda["removerAgenda"]>(
    (id) => {
      const base = atual.current;
      if (!base.agendas.some((a) => a.id === id)) return falha("Agenda não encontrada");
      aplicar({ ...base, agendas: base.agendas.filter((a) => a.id !== id) });
      return SUCESSO;
    },
    [aplicar],
  );

  const duplicarAgenda = useCallback<UseAgenda["duplicarAgenda"]>(
    (id) => {
      const base = atual.current;
      const resultado = duplicarParaProximoMes(base, id, gerarId);
      if (resultado.ok) {
        aplicar({ ...base, agendas: ordenarAgendas([...base.agendas, resultado.valor]) });
      }
      return resultado;
    },
    [aplicar, gerarId],
  );

  const registroDe = useCallback<UseAgenda["registroDe"]>(
    (chave, data) => registroDaOcorrencia(dados.registros, chave, chaveDoDia(data)),
    [dados],
  );

  const marcar = useCallback<UseAgenda["marcar"]>(
    (chave, tocado) => {
      const base = atual.current;
      const agora = relogio();
      const data = chaveDoDia(agora);
      // A ocorrência vem da agenda atual, não da tela: o registro copia o nome de agora.
      const ocorrencia = ocorrenciasDoDia(base, agora).find((o) => o.chave === chave);
      if (!ocorrencia) return falha("Compromisso não encontrado na agenda de hoje");
      const anterior = registroDaOcorrencia(base.registros, chave, data) ?? null;
      const plano = planejarMarcacao({
        ocorrencia,
        data,
        anterior,
        tocado,
        agora,
        novoId: gerarId,
      });
      if (!plano.ok) return plano;

      const { criarAcao, removerAcaoId } = plano.valor;
      let registro = plano.valor.registro;
      let acaoCriada: Acao | null = null;
      if (criarAcao !== null && registro !== null) {
        acaoCriada = registrar(criarAcao.categoria, criarAcao.rotulo);
        registro = { ...registro, acaoId: acaoCriada.id };
      }
      // A ação pode já ter sido apagada pela pessoa; então não há o que recolocar no Desfazer.
      const acaoRemovida =
        removerAcaoId === null ? null : (acoes.find((a) => a.id === removerAcaoId) ?? null);
      if (removerAcaoId !== null) remover(removerAcaoId);

      aplicar({ ...base, registros: substituirRegistro(base.registros, chave, data, registro) });
      return {
        ok: true,
        valor: { chave, data, anterior, atual: registro, acaoCriada, acaoRemovida },
      };
    },
    [acoes, aplicar, gerarId, registrar, relogio, remover],
  );

  const desfazerMarcacao = useCallback<UseAgenda["desfazerMarcacao"]>(
    (marcacao) => {
      const base = atual.current;
      aplicar({
        ...base,
        registros: substituirRegistro(
          base.registros,
          marcacao.chave,
          marcacao.data,
          marcacao.anterior,
        ),
      });
      if (marcacao.acaoCriada !== null) remover(marcacao.acaoCriada.id);
      if (marcacao.acaoRemovida !== null) restaurar(marcacao.acaoRemovida);
    },
    [aplicar, remover, restaurar],
  );

  const valor = useMemo<UseAgenda>(
    () => ({
      dados,
      relogio,
      ocorrenciasDe,
      agendaDe,
      criarAtividade,
      removerAtividade,
      salvarCompromisso,
      removerCompromisso,
      salvarAvulso,
      removerAvulso,
      criarAgenda,
      editarAgenda,
      removerAgenda,
      duplicarAgenda,
      registroDe,
      marcar,
      desfazerMarcacao,
      substituir: aplicar,
    }),
    [
      registroDe,
      marcar,
      desfazerMarcacao,
      dados,
      relogio,
      ocorrenciasDe,
      agendaDe,
      criarAtividade,
      removerAtividade,
      salvarCompromisso,
      removerCompromisso,
      salvarAvulso,
      removerAvulso,
      criarAgenda,
      editarAgenda,
      removerAgenda,
      duplicarAgenda,
      aplicar,
    ],
  );

  return <AgendaContext.Provider value={valor}>{children}</AgendaContext.Provider>;
}

export function useAgenda(): UseAgenda {
  const contexto = useContext(AgendaContext);
  if (!contexto) {
    throw new Error("useAgenda precisa estar dentro de um AgendaProvider.");
  }
  return contexto;
}
