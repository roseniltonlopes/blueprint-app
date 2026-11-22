import { ocorrenciasDoDia, type DadosAgenda } from "./agenda";
import { CATEGORIAS, type CategoriaId } from "./categorias";
import { chaveDoDia } from "./datas";
import { chaveDaOrigem, type RegistroCompromisso } from "./registros";

/** Uma atividade no mês: o que foi feito, o que não foi e o que ficou sem marcação. */
export type LinhaDoPainel = {
  atividadeId: string;
  nome: string;
  categoria: CategoriaId | null;
  feitos: number;
  naoFui: number;
  semRegistro: number;
  /** Dias do mês (1 a 31) em ordem */
  diasFeitos: number[];
  diasNaoFui: number[];
  diasSemRegistro: number[];
  feitosNoMesAnterior: number;
};

export type GrupoDoPainel = {
  categoria: CategoriaId | null;
  feitos: number;
  atividades: LinhaDoPainel[];
};

export type PainelDoMes = {
  feitos: number;
  naoFui: number;
  semRegistro: number;
  /** feitos sobre o planejado, de 0 a 100; null quando nada foi planejado */
  percentual: number | null;
  grupos: GrupoDoPainel[];
};

function prefixoDoMes(ano: number, mes: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-`;
}

function diaDaChave(data: string): number {
  return Number(data.slice(8, 10));
}

/**
 * Painel de compromissos de um mês (`mes` de 0 a 11). Conta os registros do mês, inclusive de
 * compromissos que já saíram da agenda, e marca como "sem registro" o que estava planejado em
 * dias que já passaram e ninguém marcou. Hoje só entra com o que já foi marcado.
 */
export function painelDoMes(dados: DadosAgenda, ano: number, mes: number, hoje: Date): PainelDoMes {
  const prefixo = prefixoDoMes(ano, mes);
  const anterior = new Date(ano, mes - 1, 1);
  const prefixoAnterior = prefixoDoMes(anterior.getFullYear(), anterior.getMonth());
  const atividades = new Map(dados.atividades.map((a) => [a.id, a]));
  const linhas = new Map<string, LinhaDoPainel>();

  function linhaDe(atividadeId: string, copia?: RegistroCompromisso): LinhaDoPainel {
    let linha = linhas.get(atividadeId);
    if (!linha) {
      const atual = atividades.get(atividadeId);
      linha = {
        atividadeId,
        nome: atual?.nome ?? copia?.nomeAtividade ?? "Atividade removida",
        categoria: atual ? atual.categoria : (copia?.categoria ?? null),
        feitos: 0,
        naoFui: 0,
        semRegistro: 0,
        diasFeitos: [],
        diasNaoFui: [],
        diasSemRegistro: [],
        feitosNoMesAnterior: 0,
      };
      linhas.set(atividadeId, linha);
    }
    return linha;
  }

  const registrados = new Set<string>();
  const doMes = dados.registros
    .filter((r) => r.data.startsWith(prefixo))
    .sort((a, b) => a.data.localeCompare(b.data));
  for (const registro of doMes) {
    registrados.add(`${chaveDaOrigem(registro)}@${registro.data}`);
    const linha = linhaDe(registro.atividadeId, registro);
    if (registro.status === "feito") {
      linha.feitos += 1;
      linha.diasFeitos.push(diaDaChave(registro.data));
    } else {
      linha.naoFui += 1;
      linha.diasNaoFui.push(diaDaChave(registro.data));
    }
  }

  const chaveHoje = chaveDoDia(hoje);
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const data = new Date(ano, mes, dia);
    const chave = chaveDoDia(data);
    if (chave >= chaveHoje) break;
    for (const ocorrencia of ocorrenciasDoDia(dados, data)) {
      if (registrados.has(`${ocorrencia.chave}@${chave}`)) continue;
      const linha = linhaDe(ocorrencia.atividade.id);
      linha.semRegistro += 1;
      linha.diasSemRegistro.push(dia);
    }
  }

  for (const registro of dados.registros) {
    if (registro.status === "feito" && registro.data.startsWith(prefixoAnterior)) {
      const linha = linhas.get(registro.atividadeId);
      if (linha) linha.feitosNoMesAnterior += 1;
    }
  }

  const ordemDaCategoria = (c: CategoriaId | null) =>
    c === null ? CATEGORIAS.length : CATEGORIAS.findIndex((x) => x.id === c);
  const grupos = new Map<CategoriaId | null, GrupoDoPainel>();
  for (const linha of linhas.values()) {
    const grupo = grupos.get(linha.categoria) ?? {
      categoria: linha.categoria,
      feitos: 0,
      atividades: [],
    };
    grupo.feitos += linha.feitos;
    grupo.atividades.push(linha);
    grupos.set(linha.categoria, grupo);
  }
  const ordenados = [...grupos.values()]
    .map((g) => ({
      ...g,
      atividades: g.atividades.sort((a, b) => b.feitos - a.feitos || a.nome.localeCompare(b.nome)),
    }))
    .sort(
      (a, b) =>
        b.feitos - a.feitos || ordemDaCategoria(a.categoria) - ordemDaCategoria(b.categoria),
    );

  const todas = [...linhas.values()];
  const feitos = todas.reduce((s, l) => s + l.feitos, 0);
  const naoFui = todas.reduce((s, l) => s + l.naoFui, 0);
  const semRegistro = todas.reduce((s, l) => s + l.semRegistro, 0);
  const planejados = feitos + naoFui + semRegistro;
  return {
    feitos,
    naoFui,
    semRegistro,
    percentual: planejados === 0 ? null : Math.round((feitos / planejados) * 100),
    grupos: ordenados,
  };
}

/** "2, 4 e 9" */
export function listarDias(dias: readonly number[]): string {
  if (dias.length <= 1) return dias.join("");
  return `${dias.slice(0, -1).join(", ")} e ${dias[dias.length - 1]}`;
}
