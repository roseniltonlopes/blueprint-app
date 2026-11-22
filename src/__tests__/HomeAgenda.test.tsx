import { NavigationContainer } from "@react-navigation/native";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import type { Agenda, Atividade, Compromisso, DadosAgenda } from "../domain/agenda";
import { useAgenda, type UseAgenda } from "../hooks/useAgenda";
import Raiz from "../navigation/Raiz";
import HomeScreen from "../screens/HomeScreen";
import { renderComTema } from "./utils";

// O relógio dos testes marca sábado, 17 de outubro de 2026, 15:58 (dia da semana 6).

function atividade(id: string, nome: string, categoria: Atividade["categoria"]): Atividade {
  return { id, nome, icone: "outro", categoria, criadaEm: "2026-10-01T00:00:00.000Z" };
}

const academia = atividade("academia", "Academia", "exercicio");
const trabalho = atividade("trabalho", "Trabalho", null);
const culto = atividade("culto", "Culto", "outro");
const aula = atividade("aula", "Aula", "estudo");

function compromisso(
  id: string,
  atividadeId: string,
  dias: Compromisso["dias"],
  inicio: string,
  fim: string | null,
): Compromisso {
  return { id, atividadeId, dias, inicio, fim };
}

const outubro: Agenda = {
  id: "out",
  nome: "Outubro de 2026",
  inicio: "2026-10-01",
  fim: "2026-10-31",
  compromissos: [
    compromisso("c1", "academia", [6], "05:00", "06:00"),
    compromisso("c2", "trabalho", [6], "12:00", "18:00"),
    compromisso("c3", "culto", [6], "19:00", null),
    compromisso("c4", "aula", [1], "07:30", null),
  ],
};

function dados(agendas: Agenda[] = [outubro]): DadosAgenda {
  return {
    atividades: [academia, trabalho, culto, aula],
    agendas,
    avulsos: [],
    registros: [],
  };
}

let api: UseAgenda;

function Sonda() {
  const atual = useAgenda();
  useEffect(() => {
    api = atual;
  });
  return null;
}

async function abrirHome(agenda: DadosAgenda = dados()) {
  await renderComTema(
    <>
      <Sonda />
      <HomeScreen />
    </>,
    { agenda },
  );
}

const FEITO_ACADEMIA = "Feito: Academia, 05:00 a 06:00";
const NAO_FUI_ACADEMIA = "Não fui: Academia, 05:00 a 06:00";

function resumo() {
  return screen.getByTestId("resumo-agenda-hoje").props.children;
}

function total() {
  return screen.getByTestId("progresso-total").props.children;
}

function marcado(nome: string) {
  return screen.getByRole("button", { name: nome }).props.accessibilityState?.selected;
}

describe("Home: compromissos de hoje com Feito e Não fui (etapa 2)", () => {
  it("lista só os compromissos de hoje, em ordem de horário", async () => {
    await abrirHome();
    expect(screen.getByText("Hoje na agenda")).toBeTruthy();
    expect(resumo()).toBe("Feitos: 0 de 3");
    expect(screen.getByText("Academia")).toBeTruthy();
    expect(screen.getByText("12:00 a 18:00")).toBeTruthy();
    expect(screen.queryByText("Aula")).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /^Feito: / }).map((b) => b.props.accessibilityLabel),
    ).toEqual([
      "Feito: Academia, 05:00 a 06:00",
      "Feito: Trabalho, 12:00 a 18:00",
      "Feito: Culto, 19:00",
    ]);
  });

  it("Feito em atividade com categoria marca o compromisso e anda o anel", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: FEITO_ACADEMIA }));
    expect(resumo()).toBe("Feitos: 1 de 3");
    expect(marcado(FEITO_ACADEMIA)).toBe(true);
    expect(total()).toBe(1);
    expect(screen.getByRole("button", { name: "Exercício, 1 hoje" })).toBeTruthy();
    expect(screen.getByText("Feito: Academia")).toBeTruthy();
  });

  it("Feito em atividade sem categoria não gera ação de hábito", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: "Feito: Trabalho, 12:00 a 18:00" }));
    expect(resumo()).toBe("Feitos: 1 de 3");
    expect(total()).toBe(0);
  });

  it("Feito em atividade da categoria Outro gera ação com o nome da atividade", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: "Feito: Culto, 19:00" }));
    expect(total()).toBe(1);
    expect(api.dados.registros[0]).toMatchObject({ nomeAtividade: "Culto", status: "feito" });
    expect(screen.getByRole("button", { name: "Outro, 1 hoje" })).toBeTruthy();
  });

  it("Não fui marca sem contar como feito nem gerar ação", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: NAO_FUI_ACADEMIA }));
    expect(resumo()).toBe("Feitos: 0 de 3");
    expect(marcado(NAO_FUI_ACADEMIA)).toBe(true);
    expect(total()).toBe(0);
    expect(screen.getByText("Não fui: Academia")).toBeTruthy();
  });

  it("trocar de Feito para Não fui remove a ação gerada", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: FEITO_ACADEMIA }));
    await fireEvent.press(screen.getByRole("button", { name: NAO_FUI_ACADEMIA }));
    expect(total()).toBe(0);
    expect(marcado(FEITO_ACADEMIA)).toBe(false);
    expect(marcado(NAO_FUI_ACADEMIA)).toBe(true);
  });

  it("tocar de novo em Feito desmarca", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: FEITO_ACADEMIA }));
    await fireEvent.press(screen.getByRole("button", { name: FEITO_ACADEMIA }));
    expect(resumo()).toBe("Feitos: 0 de 3");
    expect(total()).toBe(0);
    expect(api.dados.registros).toEqual([]);
    expect(screen.getByText("Registro removido: Academia")).toBeTruthy();
  });

  it("Desfazer volta ao estado anterior, inclusive a ação", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: FEITO_ACADEMIA }));
    await fireEvent.press(screen.getByText("Desfazer"));
    expect(resumo()).toBe("Feitos: 0 de 3");
    expect(total()).toBe(0);
    expect(api.dados.registros).toEqual([]);
  });

  it("Desfazer a troca para Não fui devolve o Feito e a mesma ação", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: FEITO_ACADEMIA }));
    const acaoId = api.dados.registros[0].acaoId;
    await fireEvent.press(screen.getByRole("button", { name: NAO_FUI_ACADEMIA }));
    await fireEvent.press(screen.getByText("Desfazer"));
    expect(marcado(FEITO_ACADEMIA)).toBe(true);
    expect(total()).toBe(1);
    expect(api.dados.registros[0].acaoId).toBe(acaoId);
  });

  it("editar a agenda a partir de hoje mantém a marcação de hoje", async () => {
    await abrirHome();
    await fireEvent.press(screen.getByRole("button", { name: FEITO_ACADEMIA }));
    await act(async () => {
      const resultado = api.salvarCompromisso(
        "out",
        { ...outubro.compromissos[0], fim: "06:30" },
        "a-partir-de-hoje",
      );
      expect(resultado.ok).toBe(true);
    });
    expect(api.dados.agendas).toHaveLength(2);
    expect(marcado("Feito: Academia, 05:00 a 06:30")).toBe(true);
    expect(resumo()).toBe("Feitos: 1 de 3");
  });

  it("não deixa marcar compromisso que não é de hoje", async () => {
    await abrirHome();
    await act(async () => {
      expect(api.marcar("agenda:c4", "feito")).toEqual({
        ok: false,
        erro: "Compromisso não encontrado na agenda de hoje",
      });
    });
    expect(api.dados.registros).toEqual([]);
  });

  it("sem agenda para hoje mostra o convite", async () => {
    await abrirHome(dados([]));
    expect(screen.getByText("Sem agenda para hoje")).toBeTruthy();
    expect(screen.queryByTestId("resumo-agenda-hoje")).toBeNull();
    // Fora do navegador não há para onde ir: o botão não aparece.
    expect(screen.queryByRole("button", { name: "Montar agenda" })).toBeNull();
  });

  it("com agenda mas nada hoje, avisa que não há nada marcado", async () => {
    const soSegunda = { ...outubro, compromissos: [outubro.compromissos[3]] };
    await abrirHome(dados([soSegunda]));
    expect(screen.getByText("Nada marcado para hoje.")).toBeTruthy();
  });

  it("o convite leva à aba Agenda", async () => {
    await renderComTema(
      <NavigationContainer>
        <Raiz />
      </NavigationContainer>,
      { agenda: dados([]) },
    );
    await fireEvent.press(screen.getByRole("button", { name: "Montar agenda" }));
    expect(screen.getByText("outubro de 2026")).toBeTruthy();
  });
});
