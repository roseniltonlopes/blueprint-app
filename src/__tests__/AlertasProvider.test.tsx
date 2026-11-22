import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import type { Agenda, Atividade, DadosAgenda } from "../domain/agenda";
import { useAgenda, type UseAgenda } from "../hooks/useAgenda";
import PerfilScreen from "../screens/PerfilScreen";
import type { EstadoDaPermissao } from "../services/alertas";
import { renderComTema, servicoDeAlertasFalso, type ServicoDeAlertasFalso } from "./utils";

// O relógio dos testes marca sábado, 17 de outubro de 2026, 15:58.

const academia: Atividade = {
  id: "academia",
  nome: "Academia",
  icone: "exercicio",
  categoria: "exercicio",
  criadaEm: "2026-10-01T00:00:00.000Z",
};

const outubro: Agenda = {
  id: "out",
  nome: "Outubro de 2026",
  inicio: "2026-10-01",
  fim: "2026-10-31",
  compromissos: [
    {
      id: "c1",
      atividadeId: "academia",
      dias: [6],
      inicio: "18:00",
      fim: null,
      antecedenciaMin: 30,
    },
  ],
};

const DADOS: DadosAgenda = {
  atividades: [academia],
  agendas: [outubro],
  avulsos: [],
  registros: [],
};

let api: UseAgenda;

function Sonda() {
  const atual = useAgenda();
  useEffect(() => {
    api = atual;
  });
  return null;
}

async function abrir(estado: EstadoDaPermissao, aoPedir: EstadoDaPermissao = "concedida") {
  const servico = servicoDeAlertasFalso(estado, aoPedir);
  await renderComTema(
    <>
      <Sonda />
      <PerfilScreen />
    </>,
    { agenda: DADOS, servicoDeAlertas: servico },
  );
  return servico;
}

function estado() {
  return screen.getByTestId("estado-dos-alertas").props.children as string;
}

async function agendadosDe(servico: ServicoDeAlertasFalso) {
  await waitFor(() => expect(servico.agendados).not.toBeNull());
  return servico.agendados ?? [];
}

describe("Alertas (etapa 3)", () => {
  it("sem permissão, oferece permitir e agenda depois que a pessoa aceita", async () => {
    const servico = await abrir("perguntar");
    await waitFor(() => expect(estado()).toMatch(/^Desligados/));
    expect(servico.agendados).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Permitir alertas" }));
    await waitFor(() => expect(estado()).toMatch(/^Ligados/));
    const agendados = await agendadosDe(servico);
    // Janela de 14 dias: de 17 a 30 de outubro.
    expect(agendados.map((a) => a.id)).toEqual(["agenda:c1@2026-10-17", "agenda:c1@2026-10-24"]);
  });

  it("com a permissão bloqueada, leva às configurações e não agenda", async () => {
    const servico = await abrir("negada");
    await waitFor(() => expect(estado()).toMatch(/^Bloqueados/));
    expect(screen.getByRole("button", { name: "Abrir configurações" })).toBeTruthy();
    expect(servico.agendados).toBeNull();
  });

  it("marcar o compromisso de hoje tira o alerta de hoje", async () => {
    const servico = await abrir("concedida");
    expect((await agendadosDe(servico))[0].data).toBe("2026-10-17");
    servico.agendados = null;

    await act(async () => {
      api.marcar("agenda:c1", "nao_fui");
    });
    const depois = await agendadosDe(servico);
    expect(depois.map((a) => a.data)).toEqual(["2026-10-24"]);
  });

  it("o botão Feito da notificação marca o compromisso de hoje uma vez só", async () => {
    const servico = await abrir("concedida");
    await act(async () => {
      servico.responder({ chave: "agenda:c1", data: "2026-10-17", feito: true });
    });
    expect(api.dados.registros).toHaveLength(1);
    expect(api.dados.registros[0].status).toBe("feito");

    // Repetir não desmarca (marcar de novo no app desmarcaria).
    await act(async () => {
      servico.responder({ chave: "agenda:c1", data: "2026-10-17", feito: true });
    });
    expect(api.dados.registros[0].status).toBe("feito");
  });

  it("ignora toque fora do botão Feito e alerta de outro dia", async () => {
    const servico = await abrir("concedida");
    await act(async () => {
      servico.responder({ chave: "agenda:c1", data: "2026-10-17", feito: false });
      servico.responder({ chave: "agenda:c1", data: "2026-10-10", feito: true });
    });
    expect(api.dados.registros).toEqual([]);
  });
});
