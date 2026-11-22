import { act, render } from "@testing-library/react-native";
import { useEffect } from "react";
import type { AgendaRepository } from "../data/AgendaRepository";
import type { Agenda, Compromisso, DadosAgenda } from "../domain/agenda";
import { useAgenda, type UseAgenda } from "../hooks/useAgenda";
import { renderComTema } from "./utils";

let api: UseAgenda;

function Sonda() {
  const atual = useAgenda();
  useEffect(() => {
    api = atual;
  });
  return null;
}

function agendaDeOutubro(compromissos: Compromisso[] = []): Agenda {
  return {
    id: "out",
    nome: "Outubro de 2026",
    inicio: "2026-10-01",
    fim: "2026-10-31",
    compromissos,
  };
}

const academia = {
  id: "academia",
  nome: "Academia",
  icone: "exercicio" as const,
  categoria: "exercicio" as const,
  criadaEm: "2026-10-01T00:00:00.000Z",
};

const compromisso: Compromisso = {
  id: "c1",
  atividadeId: "academia",
  dias: [5, 6],
  inicio: "05:00",
  fim: "06:00",
};

function comAgenda(agenda: Agenda = agendaDeOutubro([compromisso])): DadosAgenda {
  return { atividades: [academia], agendas: [agenda], avulsos: [], registros: [] };
}

function repositorioFalso() {
  const salvar = jest.fn<Promise<void>, [DadosAgenda]>().mockResolvedValue(undefined);
  const repositorio: AgendaRepository = { carregar: jest.fn(), salvar };
  return { repositorio, salvar };
}

// 2026-10-17 (AGORA nos testes) é sábado; 2026-10-16 é sexta.
const SABADO = new Date(2026, 9, 17, 15, 58);
const SEXTA = new Date(2026, 9, 16);

describe("useAgenda", () => {
  it("cria atividade e compromisso e devolve a ocorrência do dia", async () => {
    await renderComTema(<Sonda />, {
      agenda: { atividades: [], agendas: [agendaDeOutubro()], avulsos: [], registros: [] },
    });
    let atividadeId = "";
    await act(async () => {
      const r = api.criarAtividade({ nome: "Corrida", icone: "exercicio", categoria: "exercicio" });
      if (!r.ok) throw new Error(r.erro);
      atividadeId = r.valor.id;
    });
    await act(async () => {
      const r = api.salvarCompromisso("out", {
        atividadeId,
        dias: [6],
        inicio: "05:00",
        fim: "06:00",
      });
      expect(r).toEqual({ ok: true, valor: undefined });
    });
    expect(api.ocorrenciasDe(SABADO).map((o) => o.atividade.nome)).toEqual(["Corrida"]);
  });

  it("recusa atividade com nome repetido sem alterar o catálogo", async () => {
    await renderComTema(<Sonda />, { agenda: comAgenda() });
    await act(async () => {
      const r = api.criarAtividade({ nome: " academia", icone: "outro", categoria: null });
      expect(r).toEqual({ ok: false, erro: "Já existe uma atividade com este nome" });
    });
    expect(api.dados.atividades).toHaveLength(1);
  });

  it("bloqueia a remoção de atividade em uso e remove a livre", async () => {
    await renderComTema(<Sonda />, { agenda: comAgenda() });
    await act(async () => {
      const livre = api.criarAtividade({ nome: "Corrida", icone: "outro", categoria: null });
      if (!livre.ok) throw new Error(livre.erro);
      expect(api.removerAtividade("academia")).toEqual({
        ok: false,
        erro: "Esta atividade está em uso por compromissos",
      });
      expect(api.removerAtividade(livre.valor.id).ok).toBe(true);
    });
    expect(api.dados.atividades.map((a) => a.id)).toEqual(["academia"]);
  });

  it("editar com escopo do período muda a agenda inteira sem criar outra", async () => {
    await renderComTema(<Sonda />, { agenda: comAgenda() });
    await act(async () => {
      expect(
        api.salvarCompromisso("out", { ...compromisso, inicio: "06:00", fim: "07:00" }, "periodo")
          .ok,
      ).toBe(true);
    });
    expect(api.dados.agendas).toHaveLength(1);
    expect(api.dados.agendas[0].compromissos[0]).toMatchObject({ id: "c1", inicio: "06:00" });
  });

  it("editar a partir de hoje divide a agenda e preserva os dias passados", async () => {
    await renderComTema(<Sonda />, { agenda: comAgenda() });
    await act(async () => {
      expect(
        api.salvarCompromisso(
          "out",
          { ...compromisso, inicio: "06:00", fim: "07:00" },
          "a-partir-de-hoje",
        ).ok,
      ).toBe(true);
    });
    expect(api.dados.agendas).toHaveLength(2);
    const original = api.dados.agendas.find((a) => a.id === "out");
    const nova = api.dados.agendas.find((a) => a.id !== "out");
    expect(original).toMatchObject({ fim: "2026-10-16" });
    expect(original?.compromissos[0]).toMatchObject({ inicio: "05:00", fim: "06:00" });
    expect(nova).toMatchObject({ inicio: "2026-10-17", fim: "2026-10-31" });
    expect(api.ocorrenciasDe(SEXTA).map((o) => o.inicio)).toEqual(["05:00"]);
    expect(api.ocorrenciasDe(SABADO).map((o) => o.inicio)).toEqual(["06:00"]);
  });

  it("criar a partir de hoje também divide e só a agenda nova recebe o compromisso", async () => {
    await renderComTema(<Sonda />, { agenda: comAgenda(agendaDeOutubro()) });
    await act(async () => {
      expect(
        api.salvarCompromisso(
          "out",
          { atividadeId: "academia", dias: [5, 6], inicio: "18:00", fim: null },
          "a-partir-de-hoje",
        ).ok,
      ).toBe(true);
    });
    expect(api.ocorrenciasDe(SEXTA)).toEqual([]);
    expect(api.ocorrenciasDe(SABADO).map((o) => o.inicio)).toEqual(["18:00"]);
  });

  it("agenda que ainda não começou é editada direto, sem dividir", async () => {
    const novembro: Agenda = {
      ...agendaDeOutubro([compromisso]),
      id: "nov",
      inicio: "2026-11-01",
      fim: "2026-11-30",
    };
    await renderComTema(<Sonda />, { agenda: comAgenda(novembro) });
    await act(async () => {
      expect(
        api.salvarCompromisso(
          "nov",
          { ...compromisso, inicio: "06:00", fim: "07:00" },
          "a-partir-de-hoje",
        ).ok,
      ).toBe(true);
    });
    expect(api.dados.agendas).toHaveLength(1);
    expect(api.dados.agendas[0].compromissos[0].inicio).toBe("06:00");
  });

  it("remover a partir de hoje retira só da agenda nova", async () => {
    await renderComTema(<Sonda />, { agenda: comAgenda() });
    await act(async () => {
      expect(api.removerCompromisso("out", "c1", "a-partir-de-hoje").ok).toBe(true);
    });
    expect(api.dados.agendas).toHaveLength(2);
    expect(api.ocorrenciasDe(SEXTA)).toHaveLength(1);
    expect(api.ocorrenciasDe(SABADO)).toEqual([]);
  });

  it("recusa compromisso inválido sem alterar o estado", async () => {
    await renderComTema(<Sonda />, { agenda: comAgenda() });
    await act(async () => {
      expect(api.salvarCompromisso("out", { ...compromisso, id: undefined, dias: [] })).toEqual({
        ok: false,
        erro: "Escolha pelo menos um dia",
      });
      expect(api.salvarCompromisso("nada", compromisso).ok).toBe(false);
    });
    expect(api.dados.agendas[0].compromissos).toHaveLength(1);
  });

  it("salva e remove avulsos", async () => {
    await renderComTema(<Sonda />, { agenda: comAgenda() });
    await act(async () => {
      expect(
        api.salvarAvulso({
          atividadeId: "academia",
          data: "2026-10-20",
          inicio: "07:00",
          fim: null,
        }).ok,
      ).toBe(true);
    });
    expect(api.ocorrenciasDe(new Date(2026, 9, 20)).some((o) => o.origem === "avulso")).toBe(true);
    const id = api.dados.avulsos[0].id;
    await act(async () => {
      expect(api.removerAvulso(id).ok).toBe(true);
    });
    expect(api.dados.avulsos).toEqual([]);
  });

  it("recusa agenda sobreposta, duplica para o mês seguinte e remove mantendo atividades e avulsos", async () => {
    const avulso = {
      id: "v1",
      atividadeId: "academia",
      data: "2026-10-20",
      inicio: "07:00",
      fim: null,
    };
    await renderComTema(<Sonda />, { agenda: { ...comAgenda(), avulsos: [avulso] } });
    await act(async () => {
      expect(api.criarAgenda({ nome: "Meio", inicio: "2026-10-15", fim: "2026-11-15" })).toEqual({
        ok: false,
        erro: "Já existe agenda neste período",
      });
      const copia = api.duplicarAgenda("out");
      if (!copia.ok) throw new Error(copia.erro);
      expect(copia.valor).toMatchObject({
        nome: "Novembro de 2026",
        inicio: "2026-11-01",
        fim: "2026-11-30",
      });
    });
    expect(api.dados.agendas).toHaveLength(2);
    await act(async () => {
      expect(api.removerAgenda("out").ok).toBe(true);
    });
    expect(api.dados.agendas.map((a) => a.nome)).toEqual(["Novembro de 2026"]);
    expect(api.dados.atividades).toHaveLength(1);
    expect(api.dados.avulsos).toHaveLength(1);
  });

  it("edita o período de uma agenda e recusa fim antes do início", async () => {
    await renderComTema(<Sonda />, { agenda: comAgenda() });
    await act(async () => {
      expect(
        api.editarAgenda("out", { nome: "Outubro", inicio: "2026-10-01", fim: "2026-10-30" }).ok,
      ).toBe(true);
      expect(
        api.editarAgenda("out", { nome: "Outubro", inicio: "2026-10-10", fim: "2026-10-01" }).ok,
      ).toBe(false);
    });
    expect(api.dados.agendas[0]).toMatchObject({ nome: "Outubro", fim: "2026-10-30" });
  });

  it("grava no repositório só mutações válidas, e não na primeira renderização", async () => {
    const { repositorio, salvar } = repositorioFalso();
    await renderComTema(<Sonda />, { agenda: comAgenda(), repositorioAgenda: repositorio });
    expect(salvar).not.toHaveBeenCalled();
    await act(async () => {
      api.criarAtividade({ nome: "  ", icone: "outro", categoria: null });
    });
    expect(salvar).not.toHaveBeenCalled();
    await act(async () => {
      api.criarAtividade({ nome: "Corrida", icone: "outro", categoria: null });
    });
    expect(salvar).toHaveBeenCalledTimes(1);
    expect(salvar.mock.calls[0][0].atividades.map((a) => a.nome)).toEqual(["Academia", "Corrida"]);
  });

  it("gera ids distintos numa duplicação grande", async () => {
    const muitos = Array.from({ length: 40 }, (_, i): Compromisso => ({
      ...compromisso,
      id: `m${i}`,
    }));
    await renderComTema(<Sonda />, { agenda: comAgenda(agendaDeOutubro(muitos)) });
    await act(async () => {
      const copia = api.duplicarAgenda("out");
      if (!copia.ok) throw new Error(copia.erro);
      const ids = [copia.valor.id, ...copia.valor.compromissos.map((c) => c.id)];
      expect(new Set(ids).size).toBe(41);
    });
  });

  it("lança um erro claro fora do provider", async () => {
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<Sonda />)).rejects.toThrow(
      "useAgenda precisa estar dentro de um AgendaProvider.",
    );
    erro.mockRestore();
  });
});
