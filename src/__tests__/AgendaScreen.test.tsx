import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import type { Agenda, Atividade, Avulso, DadosAgenda } from "../domain/agenda";
import { useAgenda, type UseAgenda } from "../hooks/useAgenda";
import Raiz from "../navigation/Raiz";
import AgendaScreen from "../screens/AgendaScreen";
import { Text } from "../ui/Text";
import { renderComTema } from "./utils";

const Stack = createNativeStackNavigator();

let api: UseAgenda;

function Sonda() {
  const atual = useAgenda();
  useEffect(() => {
    api = atual;
  });
  return null;
}

function Parametros({ route }: { route: { params?: object } }) {
  return <Text testID="parametros">{JSON.stringify(route.params ?? null)}</Text>;
}

function ComPilha() {
  return (
    <>
      <Sonda />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Abas" component={AgendaScreen} />
          <Stack.Screen name="Compromisso" component={Parametros} />
          <Stack.Screen name="Agendas" component={Parametros} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

function atividade(id: string, nome: string): Atividade {
  return { id, nome, icone: "outro", categoria: null, criadaEm: "2026-10-01T00:00:00.000Z" };
}

const academia = atividade("academia", "Academia");
const culto = atividade("culto", "Culto");
const aula = atividade("aula", "Aula");

function agenda(id: string, nome: string, inicio: string, fim: string): Agenda {
  return {
    id,
    nome,
    inicio,
    fim,
    compromissos: [
      {
        id: `${id}-academia`,
        atividadeId: "academia",
        dias: [1, 2, 3, 4, 5],
        inicio: "05:00",
        fim: "06:00",
      },
      { id: `${id}-culto`, atividadeId: "culto", dias: [0], inicio: "08:00", fim: "10:30" },
    ],
  };
}

function dados(agendas: Agenda[], avulsos: Avulso[] = []): DadosAgenda {
  return { atividades: [academia, culto, aula], agendas, avulsos };
}

function parametros(): unknown {
  return JSON.parse(String(screen.getByTestId("parametros").props.children));
}

function diaDaLinha(linha: number, nome: string) {
  return screen.getAllByRole("checkbox", { name: nome })[linha];
}

// Hoje nos testes é sábado, 17 de outubro de 2026: outubro já começou.
const OUTUBRO = agenda("out", "Outubro de 2026", "2026-10-01", "2026-10-31");

describe("AgendaScreen", () => {
  it("mostra o mês de hoje com um compromisso por linha e os sete dias ao lado", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });

    expect(screen.getByText("outubro de 2026")).toBeTruthy();
    expect(screen.getAllByText("Academia")).toHaveLength(1);
    expect(screen.getAllByText("Culto")).toHaveLength(1);
    expect(screen.getByText("05:00 a 06:00")).toBeTruthy();
    expect(screen.getAllByRole("checkbox", { name: "Segunda-feira" })).toHaveLength(2);
    expect(diaDaLinha(0, "Quarta-feira").props.accessibilityState).toMatchObject({ checked: true });
    expect(diaDaLinha(0, "Sábado").props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText(/já começou/)).toBeTruthy();
  });

  it("ordena as linhas por horário", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });

    const nomes = screen
      .getAllByRole("button", { name: /^Editar (Academia|Culto)/ })
      .map((botao) => botao.props.accessibilityLabel);
    expect(nomes).toEqual(["Editar Academia, 05:00 a 06:00", "Editar Culto, 08:00 a 10:30"]);
  });

  it("navega entre os meses, sem limite para frente", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });

    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("setembro de 2026")).toBeTruthy();
    expect(screen.getByText("Montar a agenda de setembro")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText("outubro de 2026")).toBeTruthy();
    expect(screen.getAllByText("Academia")).toHaveLength(1);

    for (let i = 0; i < 3; i++) {
      await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
    }
    expect(screen.getByText("janeiro de 2027")).toBeTruthy();
  });

  it("oferece montar a agenda do mês quando não há nenhuma", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([]) });

    expect(screen.getByText("Montar a agenda de outubro")).toBeTruthy();
    expect(screen.getByText("Começar em branco")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Novo compromisso" })).toBeNull();

    await fireEvent.press(screen.getByText("Começar em branco"));
    expect(screen.queryByText("Montar a agenda de outubro")).toBeNull();
    expect(screen.getByRole("button", { name: "Novo compromisso" })).toBeTruthy();
    expect(screen.getByText("Nenhum compromisso ainda")).toBeTruthy();
  });

  it("abre a criação de agenda pelo convite, a partir de hoje no mês atual", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([]) });
    await fireEvent.press(screen.getByText("Montar a agenda de outubro"));
    expect(parametros()).toEqual({ nova: true, data: "2026-10-17" });
  });

  it("oferece a agenda de um mês futuro a partir do dia 1", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });
    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));

    await fireEvent.press(screen.getByText("Montar a agenda de novembro"));
    expect(parametros()).toEqual({ nova: true, data: "2026-11-01" });
  });

  it("abre o gerenciamento de agendas pelo botão Editar", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });
    await fireEvent.press(screen.getByRole("button", { name: "Editar agendas" }));
    expect(screen.getByTestId("parametros")).toBeTruthy();
  });
});

describe("AgendaScreen: montar a semana", () => {
  it("marca um dia com um toque e, em agenda em curso, vale só de hoje em diante", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });

    await fireEvent.press(diaDaLinha(0, "Sábado"));
    expect(diaDaLinha(0, "Sábado").props.accessibilityState).toMatchObject({ checked: true });

    // A agenda foi dividida em hoje: o que já passou continua como era.
    const [passada, atual] = api.dados.agendas;
    expect(passada.fim).toBe("2026-10-16");
    expect(passada.compromissos.find((c) => c.atividadeId === "academia")?.dias).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(atual.inicio).toBe("2026-10-17");
    expect(atual.compromissos.find((c) => c.atividadeId === "academia")?.dias).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("numa agenda que ainda não começou, vale para todas as semanas sem dividir", async () => {
    const novembro = agenda("nov", "Novembro de 2026", "2026-11-01", "2026-11-30");
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO, novembro]) });
    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));

    expect(screen.getByText(/Vale para todas as semanas desta agenda/)).toBeTruthy();
    await fireEvent.press(diaDaLinha(0, "Domingo"));
    expect(diaDaLinha(0, "Domingo").props.accessibilityState).toMatchObject({ checked: true });
    expect(api.dados.agendas).toHaveLength(2);
    expect(api.dados.agendas[1].compromissos[0].dias).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("não deixa um compromisso ficar sem nenhum dia", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });

    await fireEvent.press(diaDaLinha(1, "Domingo"));
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha pelo menos um dia");
    expect(diaDaLinha(1, "Domingo").props.accessibilityState).toMatchObject({ checked: true });
  });

  it("abre o compromisso para editar horário e detalhes", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });

    await fireEvent.press(screen.getByRole("button", { name: /^Editar Culto/ }));
    expect(parametros()).toEqual({ compromissoId: "out-culto", agendaId: "out" });
  });

  it("cria um compromisso novo sem dia pré-marcado, no início da agenda", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });

    await fireEvent.press(screen.getByRole("button", { name: "Novo compromisso" }));
    expect(parametros()).toEqual({ data: "2026-10-01", modelo: true });
  });

  it("explica o estado vazio de uma agenda sem compromissos", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([{ ...OUTUBRO, compromissos: [] }]) });

    expect(screen.getByText("Nenhum compromisso ainda")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Novo compromisso" })).toBeTruthy();
  });

  it("avisa quando dois compromissos dividem um dia e têm horários sobrepostos", async () => {
    const sobreposta: Agenda = {
      ...OUTUBRO,
      compromissos: [
        ...OUTUBRO.compromissos,
        { id: "out-aula", atividadeId: "aula", dias: [1, 6], inicio: "05:30", fim: "07:00" },
      ],
    };
    await renderComTema(<ComPilha />, { agenda: dados([sobreposta]) });

    expect(screen.getAllByText("Conflito de horário")).toHaveLength(2);
  });

  it("não avisa conflito quando os horários não se sobrepõem", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });
    expect(screen.queryByText("Conflito de horário")).toBeNull();
  });
});

describe("AgendaScreen: só em um dia", () => {
  const avulso: Avulso = {
    id: "v1",
    atividadeId: "aula",
    data: "2026-10-20",
    inicio: "19:00",
    fim: null,
  };

  it("lista os compromissos de um dia só do mês exibido e abre ao tocar", async () => {
    const dezembro: Avulso = { ...avulso, id: "v2", data: "2026-12-03" };
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO], [avulso, dezembro]) });

    expect(screen.getByText("Só em um dia")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /só neste dia$/ })).toHaveLength(1);

    await fireEvent.press(screen.getByRole("button", { name: /^Aula, 19:00/ }));
    expect(parametros()).toEqual({ avulsoId: "v1" });
  });

  it("não mostra a seção quando não há compromisso de um dia só", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([OUTUBRO]) });
    expect(screen.queryByText("Só em um dia")).toBeNull();
  });
});

describe("AgendaScreen: ferramentas de desenvolvimento", () => {
  it("carrega a agenda de exemplo do mês e depois limpa", async () => {
    await renderComTema(<ComPilha />, { agenda: dados([]) });
    expect(screen.getByText("Montar a agenda de outubro")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Carregar agenda de exemplo" }));
    expect(screen.queryByText("Montar a agenda de outubro")).toBeNull();
    expect(screen.getAllByText("Acordar")).toHaveLength(1);
    expect(screen.getAllByText("Academia")).toHaveLength(1);

    await fireEvent.press(screen.getByRole("button", { name: "Limpar agenda" }));
    expect(screen.getByText("Montar a agenda de outubro")).toBeTruthy();
    expect(screen.queryByText("Acordar")).toBeNull();
  });
});

describe("Raiz e barra de abas", () => {
  it("tem 5 abas na ordem Hoje, Agenda, Calendário, Histórico e Perfil", async () => {
    await renderComTema(
      <NavigationContainer>
        <Raiz />
      </NavigationContainer>,
    );
    const abas = screen.getAllByRole("tab").map((aba) => aba.props.accessibilityLabel);
    expect(abas).toEqual(["Hoje", "Agenda", "Calendário", "Histórico", "Perfil"]);
  });

  it("troca para a aba Agenda", async () => {
    await renderComTema(
      <NavigationContainer>
        <Raiz />
      </NavigationContainer>,
      { agenda: dados([OUTUBRO]) },
    );
    await fireEvent.press(screen.getByRole("tab", { name: "Agenda" }));
    expect(screen.getByText("outubro de 2026")).toBeTruthy();
  });
});
