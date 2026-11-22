/**
 * O coração da sincronização offline-first, puro e testável: mescla as três fotos, conserta o que
 * a mesclagem por tabela não enxerga (nomes repetidos, órfãos, agendas sobrepostas) e decide a
 * ordem das escritas na nuvem.
 */
import { migrarAgenda, VERSAO_AGENDA } from "../data/AgendaRepository";
import { periodosSeSobrepoem, type Atividade } from "../domain/agenda";
import {
  acaoParaLinha,
  agendaParaLinha,
  atividadeParaLinha,
  avulsoParaLinha,
  compromissoParaLinha,
  registroParaLinha,
  type AcaoLinha,
  type AgendaLinha,
  type AgendaSemCompromissos,
  type AtividadeLinha,
  type AvulsoLinha,
  type CompromissoLinha,
  type RegistroLinha,
} from "./conversores";
import { fotoDoEstado, type Foto, type Tabela } from "./foto";
import { iguais, mesclar } from "./mesclar";

export type Linha =
  AtividadeLinha | AgendaLinha | CompromissoLinha | AvulsoLinha | RegistroLinha | AcaoLinha;

/** Uma escrita na nuvem. Quem executa segue a ordem da lista e para no primeiro erro. */
export type Passo =
  | { tipo: "apagar"; tabela: Tabela; ids: string[] }
  | { tipo: "enviar"; tabela: Tabela; linhas: Linha[] }
  | { tipo: "nome"; nome: string | null };

export type FotoConsolidada = {
  foto: Foto;
  /** Itens que não cabiam no resultado (agenda sobreposta, compromisso sem agenda etc.) */
  descartados: number;
};

function nomeChave(nome: string): string {
  return nome.trim().toLowerCase();
}

function mesclarNome(base: Foto | null, local: string | null, remoto: string | null) {
  if (local === remoto) return local;
  if (base === null) return local ?? remoto;
  if (local === base.nome) return remoto;
  return local;
}

/**
 * Depois de mesclar cada tabela, o conjunto pode ferir regras que cruzam tabelas. Conserta sem
 * perder o que foi feito em outro aparelho, preferindo sempre o que já está neste:
 * 1. duas atividades com o mesmo nome (criadas em aparelhos diferentes) viram uma só, com o id
 *    da nuvem e o conteúdo deste aparelho; compromissos, avulsos e registros passam a apontar
 *    para ela;
 * 2. atividade apagada aqui, mas usada por um compromisso novo de outro aparelho, volta;
 * 3. agendas que se sobrepõem: fica a deste aparelho, a outra sai com os seus compromissos;
 * 4. o resto passa pela mesma validação da leitura do aparelho (migrarAgenda).
 */
export function consolidar(mesclada: Foto, local: Foto, remoto: Foto): FotoConsolidada {
  const atividades = new Map(mesclada.atividades);
  const compromissos = new Map(mesclada.compromissos);
  const avulsos = new Map(mesclada.avulsos);
  const registros = new Map(mesclada.registros);

  // 1. Nomes repetidos: fica o id que já está na nuvem (o banco não aceita dois nomes iguais, e
  // trocar o id exigiria apagar a de lá antes de mover os compromissos que a usam), com o
  // conteúdo deste aparelho. As outras viram apelidos dela.
  const apelidos = new Map<string, string>();
  const porNome = new Map<string, Atividade>();
  const grupos = new Map<string, Atividade[]>();
  for (const atividade of atividades.values()) {
    const chave = nomeChave(atividade.nome);
    grupos.set(chave, [...(grupos.get(chave) ?? []), atividade]);
  }
  for (const [chave, grupo] of grupos) {
    const dona = grupo.find((a) => remoto.atividades.has(a.id)) ?? grupo[0];
    const conteudo = grupo.find((a) => local.atividades.has(a.id)) ?? dona;
    const escolhida = { ...conteudo, id: dona.id };
    porNome.set(chave, escolhida);
    atividades.set(dona.id, escolhida);
    for (const outra of grupo) {
      if (outra.id !== dona.id) {
        apelidos.set(outra.id, dona.id);
        atividades.delete(outra.id);
      }
    }
  }
  if (apelidos.size > 0) {
    const trocar = <T extends { atividadeId: string }>(mapa: Map<string, T>) => {
      for (const [id, item] of mapa) {
        const nova = apelidos.get(item.atividadeId);
        if (nova !== undefined) mapa.set(id, { ...item, atividadeId: nova });
      }
    };
    trocar(compromissos);
    trocar(avulsos);
    trocar(registros);
  }

  // 2. Atividade em uso não some: recupera a versão deste aparelho ou a da nuvem. Se o nome
  // dela já estiver em uso por outra atividade, o compromisso passa a usar essa outra.
  const recuperar = <T extends { atividadeId: string }>(mapa: Map<string, T>) => {
    for (const [idDoItem, item] of mapa) {
      const id = item.atividadeId;
      const recuperada = local.atividades.get(id) ?? remoto.atividades.get(id);
      if (atividades.has(id) || recuperada === undefined) continue;
      const repetida = porNome.get(nomeChave(recuperada.nome));
      if (repetida === undefined) {
        atividades.set(id, recuperada);
        porNome.set(nomeChave(recuperada.nome), recuperada);
      } else {
        mapa.set(idDoItem, { ...item, atividadeId: repetida.id });
      }
    }
  };
  recuperar(compromissos);
  recuperar(avulsos);

  // 3. Agendas sobrepostas: as deste aparelho primeiro, depois as outras por data de início.
  const aceitas: AgendaSemCompromissos[] = [];
  const candidatas = [...mesclada.agendas.values()].sort((a, b) => {
    const prioridade = Number(!local.agendas.has(a.id)) - Number(!local.agendas.has(b.id));
    return prioridade !== 0 ? prioridade : a.inicio.localeCompare(b.inicio);
  });
  let descartados = 0;
  for (const agenda of candidatas) {
    if (aceitas.some((outra) => periodosSeSobrepoem(agenda, outra))) {
      descartados += 1;
    } else {
      aceitas.push(agenda);
    }
  }
  const idsAceitos = new Set(aceitas.map((a) => a.id));

  // 4. Mesma validação da leitura do aparelho. Os registros deste aparelho vêm primeiro: no
  // mesmo compromisso e dia, o registro daqui vence.
  const registrosOrdenados = [...registros.values()].sort(
    (a, b) => Number(!local.registros.has(a.id)) - Number(!local.registros.has(b.id)),
  );
  const ordemDasAgendas = [...mesclada.agendas.keys()].filter((id) => idsAceitos.has(id));
  const bruto = {
    versao: VERSAO_AGENDA,
    atividades: [...atividades.values()],
    agendas: ordemDasAgendas.map((id) => ({
      ...mesclada.agendas.get(id),
      compromissos: [...compromissos.values()]
        .filter((c) => c.agendaId === id)
        .map(({ agendaId: _agendaId, ...c }) => c),
    })),
    avulsos: [...avulsos.values()],
    registros: registrosOrdenados,
  };
  descartados += [...compromissos.values()].filter((c) => !idsAceitos.has(c.agendaId)).length;

  const lida = migrarAgenda(bruto);
  if (lida === null) {
    throw new Error("Falha interna ao consolidar a agenda sincronizada.");
  }
  descartados += lida.descartados;

  const consolidada = fotoDoEstado({
    acoes: [...mesclada.acoes.values()],
    agenda: lida.dados,
    nome: mesclada.nome ?? "",
  });
  return { foto: consolidada, descartados };
}

/** Mescla tabela a tabela e consolida. Com base null é a primeira sincronização (união). */
export function mesclarFotos(base: Foto | null, local: Foto, remoto: Foto): FotoConsolidada {
  const mesclada: Foto = {
    atividades: mesclar(base?.atividades ?? null, local.atividades, remoto.atividades).resultado,
    agendas: mesclar(base?.agendas ?? null, local.agendas, remoto.agendas).resultado,
    compromissos: mesclar(base?.compromissos ?? null, local.compromissos, remoto.compromissos)
      .resultado,
    avulsos: mesclar(base?.avulsos ?? null, local.avulsos, remoto.avulsos).resultado,
    registros: mesclar(base?.registros ?? null, local.registros, remoto.registros).resultado,
    acoes: mesclar(base?.acoes ?? null, local.acoes, remoto.acoes, { conflito: "remoto" })
      .resultado,
    nome: mesclarNome(base, local.nome, remoto.nome),
  };
  return consolidar(mesclada, local, remoto);
}

type Diferenca = { enviar: string[]; apagar: string[] };

function diferenca<T>(
  final: ReadonlyMap<string, T>,
  remoto: ReadonlyMap<string, T>,
  soInserir = false,
): Diferenca {
  const enviar: string[] = [];
  for (const [id, valor] of final) {
    const atual = remoto.get(id);
    if (atual === undefined || (!soInserir && !iguais(atual, valor))) enviar.push(id);
  }
  const apagar = [...remoto.keys()].filter((id) => !final.has(id));
  return { enviar, apagar };
}

function linhasDe<T>(
  mapa: ReadonlyMap<string, T>,
  ids: readonly string[],
  converter: (item: T, userId: string) => Linha,
  userId: string,
): Linha[] {
  return ids.map((id) => converter(mapa.get(id) as T, userId));
}

export type PlanoDeSincronizacao = FotoConsolidada & {
  /** Escritas na nuvem, já na ordem que respeita as chaves estrangeiras */
  passos: Passo[];
};

/**
 * Calcula o estado final e as escritas para a nuvem ficar igual a ele.
 * Ordem: apaga dos filhos para os pais (ações, registros, avulsos, compromissos, agendas), apaga as
 * atividades que já não são usadas na nuvem, envia dos pais para os filhos (atividades, agendas,
 * compromissos, avulsos, registros, ações) e por fim apaga as atividades que só ficaram livres
 * depois do envio (um compromisso que trocou de atividade). Apagar a atividade antes do envio
 * libera o nome para uma atividade nova com o mesmo nome (apagou "Academia" e criou outra).
 */
export function planejarSincronizacao(
  base: Foto | null,
  local: Foto,
  remoto: Foto,
  userId: string,
): PlanoDeSincronizacao {
  const { foto: final, descartados } = mesclarFotos(base, local, remoto);

  const d = {
    atividades: diferenca(final.atividades, remoto.atividades),
    agendas: diferenca(final.agendas, remoto.agendas),
    compromissos: diferenca(final.compromissos, remoto.compromissos),
    avulsos: diferenca(final.avulsos, remoto.avulsos),
    registros: diferenca(final.registros, remoto.registros),
    acoes: diferenca(final.acoes, remoto.acoes, true),
  };

  const passos: Passo[] = [];
  const apagar = (tabela: Tabela, ids: string[]) => {
    if (ids.length > 0) passos.push({ tipo: "apagar", tabela, ids });
  };
  const enviar = (tabela: Tabela, linhas: Linha[]) => {
    if (linhas.length > 0) passos.push({ tipo: "enviar", tabela, linhas });
  };

  apagar("acoes", d.acoes.apagar);
  apagar("registros", d.registros.apagar);
  apagar("avulsos", d.avulsos.apagar);
  apagar("compromissos", d.compromissos.apagar);
  apagar("agendas", d.agendas.apagar);

  // Filhos que continuam na nuvem até o envio: os que não foram apagados acima.
  const apagadosCompromissos = new Set(d.compromissos.apagar);
  const apagadosAvulsos = new Set(d.avulsos.apagar);
  const apagadasAgendas = new Set(d.agendas.apagar);
  const aindaUsadas = new Set<string>();
  for (const c of remoto.compromissos.values()) {
    if (!apagadosCompromissos.has(c.id) && !apagadasAgendas.has(c.agendaId)) {
      aindaUsadas.add(c.atividadeId);
    }
  }
  for (const v of remoto.avulsos.values()) {
    if (!apagadosAvulsos.has(v.id)) aindaUsadas.add(v.atividadeId);
  }
  apagar(
    "atividades",
    d.atividades.apagar.filter((id) => !aindaUsadas.has(id)),
  );

  enviar("atividades", linhasDe(final.atividades, d.atividades.enviar, atividadeParaLinha, userId));
  enviar("agendas", linhasDe(final.agendas, d.agendas.enviar, agendaParaLinha, userId));
  enviar(
    "compromissos",
    linhasDe(final.compromissos, d.compromissos.enviar, compromissoParaLinha, userId),
  );
  enviar("avulsos", linhasDe(final.avulsos, d.avulsos.enviar, avulsoParaLinha, userId));
  enviar("registros", linhasDe(final.registros, d.registros.enviar, registroParaLinha, userId));
  enviar("acoes", linhasDe(final.acoes, d.acoes.enviar, acaoParaLinha, userId));

  apagar(
    "atividades",
    d.atividades.apagar.filter((id) => aindaUsadas.has(id)),
  );

  if (final.nome !== remoto.nome) {
    passos.push({ tipo: "nome", nome: final.nome });
  }

  return { foto: final, descartados, passos };
}

/**
 * Enquanto a sincronização conversava com a nuvem, a pessoa pode ter mexido no app. Aplica essas
 * mudanças (de `antes` para `agora`) por cima do resultado `final`, que já está na nuvem. O que
 * sobrar de diferença sobe na próxima sincronização.
 */
export function reaplicarMudancasLocais(antes: Foto, agora: Foto, final: Foto): FotoConsolidada {
  return mesclarFotos(antes, agora, final);
}

/** Igualdade de conteúdo entre duas fotos (ordem das listas não importa). */
export function fotosIguais(a: Foto, b: Foto): boolean {
  if (a.nome !== b.nome) return false;
  const tabelas: Tabela[] = [
    "atividades",
    "agendas",
    "compromissos",
    "avulsos",
    "registros",
    "acoes",
  ];
  return tabelas.every((tabela) => {
    const x: ReadonlyMap<string, unknown> = a[tabela];
    const y: ReadonlyMap<string, unknown> = b[tabela];
    if (x.size !== y.size) return false;
    for (const [id, valor] of x) {
      if (!y.has(id) || !iguais(valor, y.get(id))) return false;
    }
    return true;
  });
}
