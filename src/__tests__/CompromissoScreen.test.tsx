import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import type { Agenda, Atividade, Avulso, DadosAgenda } from "../domain/agenda";
import { useAgenda, type UseAgenda } from "../hooks/useAgenda";
import type { RaizParamList } from "../navigation/Raiz";
import CompromissoScreen from "../screens/CompromissoScreen";
import { Text } from "../ui/Text";
import { renderComTema } from "./utils";

// O seletor real tem teste próprio (componentesAgenda); aqui um campo de texto simples basta.
jest.mock("../components/SeletorDeHorario", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { TextInput } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: ({
      valor,
      aoMudar,
      rotulo,
    }: {
      valor: string | null;
      aoMudar: (hora: string) => void;
      rotulo: string;
    }) =>
      React.createElement(TextInput, {
        accessibilityLabel: rotulo,
        value: valor ?? "",
        onChangeText: aoMudar,
      }),
  };
});

let api: UseAgenda;

function Sonda() {
  const atual = useAgenda();
  useEffect(() => {
    api = atual;
  });
  return null;
}

const Stack = createNativeStackNavigator<RaizParamList>();

function Voltou() {
  return <Text>Voltou</Text>;
}

function Parametros({ route }: { route: { params?: object } }) {
  return <Text testID="parametros">{JSON.stringify(route.params ?? null)}</Text>;
}

function Tela({ params }: { params?: RaizParamList["Compromisso"] }) {
  return (
    <>
      <Sonda />
      <NavigationContainer
        initialState={{
          routes: [{ name: "Abas" }, { name: "Compromisso", params }],
          index: 1,
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Abas" component={Voltou} />
          <Stack.Screen name="Compromisso" component={CompromissoScreen} />
          <Stack.Screen name="Agendas" component={Parametros} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const academia: Atividade = {
  id: "academia",
  nome: "Academia",
  icone: "exercicio",
  categoria: "exercicio",
  criadaEm: "2026-10-01T00:00:00.000Z",
};
const aula: Atividade = {
  id: "aula",
  nome: "Aula",
  icone: "estudo",
  categoria: "estudo",
  criadaEm: "2026-10-01T00:00:00.000Z",
};

// AGORA nos testes é sábado, 17/10/2026. Outubro está em curso; novembro ainda não começou.
const outubro: Agenda = {
  id: "out",
  nome: "Outubro de 2026",
  inicio: "2026-10-01",
  fim: "2026-10-31",
  compromissos: [
    { id: "c1", atividadeId: "academia", dias: [5, 6], inicio: "05:00", fim: "06:00" },
  ],
};
const novembro: Agenda = {
  id: "nov",
  nome: "Novembro de 2026",
  inicio: "2026-11-01",
  fim: "2026-11-30",
  compromissos: [{ id: "n1", atividadeId: "academia", dias: [1], inicio: "08:00", fim: "09:00" }],
};
const avulso: Avulso = {
  id: "v1",
  atividadeId: "aula",
  data: "2026-10-20",
  inicio: "19:00",
  fim: null,
};

const DADOS: DadosAgenda = {
  atividades: [academia, aula],
  agendas: [outubro, novembro],
  avulsos: [avulso],
};

async function abrir(params?: RaizParamList["Compromisso"], dados: DadosAgenda = DADOS) {
  await renderComTema(<Tela params={params} />, { agenda: dados });
}

async function digitar(rotulo: string, texto: string) {
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
}

async function tocar(nome: string) {
  await fireEvent.press(screen.getByRole("button", { name: nome }));
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("CompromissoScreen: criar", () => {
  it("cria um compromisso toda semana com o dia da rota já marcado", async () => {
    await abrir({ data: "2026-11-06" });

    expect(
      screen.getByRole("checkbox", { name: "Sexta-feira" }).props.accessibilityState,
    ).toMatchObject({
      checked: true,
    });
    await fireEvent.press(screen.getByRole("radio", { name: "Academia" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Segunda-feira" }));
    await digitar("Início", "05:00");
    await digitar("Término", "06:00");
    await tocar("Salvar");

    const criados = api.dados.agendas.find((a) => a.id === "nov")?.compromissos ?? [];
    expect(criados).toHaveLength(2);
    expect(criados[1]).toMatchObject({
      atividadeId: "academia",
      dias: [1, 5],
      inicio: "05:00",
      fim: "06:00",
    });
    expect(screen.getByText("Voltou")).toBeTruthy();
  });

  it("cria um avulso quando a repetição é Só neste dia, sem mexer na agenda", async () => {
    await abrir({ data: "2026-10-16" });

    await fireEvent.press(screen.getByRole("radio", { name: "Só neste dia" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Aula" }));
    await digitar("Início", "10:00");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Sem horário de término" }));
    await tocar("Salvar");

    expect(api.dados.avulsos).toHaveLength(2);
    expect(api.dados.avulsos[1]).toMatchObject({
      atividadeId: "aula",
      data: "2026-10-16",
      inicio: "10:00",
      fim: null,
    });
    expect(api.dados.agendas).toEqual(DADOS.agendas);
    expect(screen.getByText("Voltou")).toBeTruthy();
  });

  it("exige uma atividade escolhida", async () => {
    await abrir({ data: "2026-11-06" });
    await digitar("Início", "05:00");
    await tocar("Salvar");
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha uma atividade");
    expect(screen.queryByText("Voltou")).toBeNull();
  });

  it("recusa término antes do início e continua na tela", async () => {
    await abrir({ data: "2026-11-06" });
    await fireEvent.press(screen.getByRole("radio", { name: "Academia" }));
    await digitar("Início", "06:00");
    await digitar("Término", "05:00");
    await tocar("Salvar");

    expect(screen.getByRole("alert")).toHaveTextContent("O término deve ser depois do início");
    expect(api.dados.agendas.find((a) => a.id === "nov")?.compromissos).toHaveLength(1);
    expect(screen.queryByText("Voltou")).toBeNull();
  });

  it("recusa antecedência fora de 0 a 120", async () => {
    await abrir({ data: "2026-11-06" });
    await fireEvent.press(screen.getByRole("radio", { name: "Academia" }));
    await digitar("Início", "05:00");
    await digitar("Avisar antes (minutos)", "150");
    await tocar("Salvar");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A antecedência deve ficar entre 0 e 120 minutos",
    );
  });

  it("avisa quando não há agenda para o período e oferece criar uma", async () => {
    await abrir({ data: "2027-03-01" });
    await fireEvent.press(screen.getByRole("radio", { name: "Academia" }));
    await digitar("Início", "05:00");
    await tocar("Salvar");

    expect(screen.getByRole("alert")).toHaveTextContent("Crie uma agenda para este período antes");
    await tocar("Criar agenda");
    expect(screen.getByTestId("parametros").props.children).toBe(
      JSON.stringify({ nova: true, data: "2027-03-01" }),
    );
  });

  it("numa agenda em curso pergunta o escopo antes de criar", async () => {
    await abrir({ data: "2026-10-16" });
    await fireEvent.press(screen.getByRole("radio", { name: "Aula" }));
    await digitar("Início", "18:00");
    await tocar("Salvar");

    expect(screen.getByText("A partir de hoje")).toBeTruthy();
    expect(screen.getByText(/muda também os dias já passados/i)).toBeTruthy();
    await fireEvent.press(screen.getByText("O período todo"));

    expect(api.dados.agendas).toHaveLength(2);
    expect(api.dados.agendas.find((a) => a.id === "out")?.compromissos).toHaveLength(2);
    expect(screen.getByText("Voltou")).toBeTruthy();
  });
});

describe("CompromissoScreen: nova atividade", () => {
  it("recusa nome repetido sem fechar a tela", async () => {
    await abrir({ data: "2026-11-06" });
    await tocar("Nova atividade");
    await digitar("Nome da atividade", " academia");
    await tocar("Criar atividade");

    expect(screen.getByRole("alert")).toHaveTextContent("Já existe uma atividade com este nome");
    expect(api.dados.atividades).toHaveLength(2);
    expect(screen.queryByText("Voltou")).toBeNull();
  });

  it("cria a atividade com categoria e já a seleciona", async () => {
    await abrir({ data: "2026-11-06" });
    await tocar("Nova atividade");
    await digitar("Nome da atividade", "Corrida");
    await fireEvent.press(screen.getByRole("radio", { name: "Categoria Exercício" }));
    await tocar("Criar atividade");

    expect(api.dados.atividades.map((a) => a.nome)).toEqual(["Academia", "Aula", "Corrida"]);
    expect(api.dados.atividades[2].categoria).toBe("exercicio");
    expect(screen.getByRole("radio", { name: "Corrida" }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it("filtra a lista de atividades pela busca", async () => {
    await abrir({ data: "2026-11-06" });
    await digitar("Buscar atividade", "aul");
    expect(screen.queryByRole("radio", { name: "Academia" })).toBeNull();
    expect(screen.getByRole("radio", { name: "Aula" })).toBeTruthy();
  });
});

describe("CompromissoScreen: editar", () => {
  it("carrega os dados do compromisso", async () => {
    await abrir({ compromissoId: "c1", agendaId: "out" });
    expect(screen.getByDisplayValue("05:00")).toBeTruthy();
    expect(screen.getByDisplayValue("06:00")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Academia" }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByRole("checkbox", { name: "Sábado" }).props.accessibilityState).toMatchObject(
      {
        checked: true,
      },
    );
    expect(screen.queryByRole("radio", { name: "Só neste dia" })).toBeNull();
  });

  it("em agenda em curso, A partir de hoje divide a agenda", async () => {
    await abrir({ compromissoId: "c1", agendaId: "out" });
    await digitar("Início", "06:00");
    await digitar("Término", "07:00");
    await tocar("Salvar");

    expect(screen.getByText(/muda também os dias já passados/i)).toBeTruthy();
    await fireEvent.press(screen.getByText("A partir de hoje"));

    expect(api.dados.agendas).toHaveLength(3);
    expect(api.dados.agendas.find((a) => a.id === "out")).toMatchObject({ fim: "2026-10-16" });
    expect(screen.getByText("Voltou")).toBeTruthy();
  });

  it("em agenda em curso, O período todo altera sem dividir", async () => {
    await abrir({ compromissoId: "c1", agendaId: "out" });
    await digitar("Início", "06:00");
    await digitar("Término", "07:00");
    await tocar("Salvar");
    await fireEvent.press(screen.getByText("O período todo"));

    expect(api.dados.agendas).toHaveLength(2);
    expect(api.dados.agendas.find((a) => a.id === "out")?.compromissos[0]).toMatchObject({
      inicio: "06:00",
      fim: "07:00",
    });
  });

  it("em agenda que não começou, salva direto sem perguntar", async () => {
    await abrir({ compromissoId: "n1", agendaId: "nov" });
    await digitar("Início", "07:00");
    await digitar("Término", "08:00");
    await tocar("Salvar");

    expect(screen.queryByText("A partir de hoje")).toBeNull();
    expect(api.dados.agendas.find((a) => a.id === "nov")?.compromissos[0].inicio).toBe("07:00");
    expect(screen.getByText("Voltou")).toBeTruthy();
  });

  it("edita um avulso, inclusive a data e o detalhe", async () => {
    await abrir({ avulsoId: "v1" });
    expect(screen.getByDisplayValue("2026-10-20")).toBeTruthy();
    await digitar("Data", "2026-10-21");
    await digitar("Detalhe (opcional)", "Sala 3");
    await tocar("Salvar");

    expect(api.dados.avulsos[0]).toMatchObject({ id: "v1", data: "2026-10-21", detalhe: "Sala 3" });
    expect(screen.getByText("Voltou")).toBeTruthy();
  });

  it("mostra Compromisso não encontrado e volta, sem lançar erro", async () => {
    await abrir({ compromissoId: "fantasma", agendaId: "out" });
    expect(screen.getByText("Compromisso não encontrado")).toBeTruthy();
    await tocar("Voltar");
    expect(screen.getByText("Voltou")).toBeTruthy();
  });
});

describe("CompromissoScreen: remover", () => {
  it("pede confirmação e remove de uma agenda que não começou", async () => {
    await abrir({ compromissoId: "n1", agendaId: "nov" });
    await tocar("Remover");
    expect(screen.getByText("Remover este compromisso?")).toBeTruthy();
    await tocar("Confirmar remoção");

    expect(api.dados.agendas.find((a) => a.id === "nov")?.compromissos).toEqual([]);
    expect(screen.getByText("Voltou")).toBeTruthy();
  });

  it("cancelar a confirmação mantém o compromisso", async () => {
    await abrir({ compromissoId: "n1", agendaId: "nov" });
    await tocar("Remover");
    await tocar("Cancelar");

    expect(api.dados.agendas.find((a) => a.id === "nov")?.compromissos).toHaveLength(1);
    expect(screen.queryByText("Voltou")).toBeNull();
  });

  it("em agenda em curso, remove só a partir de hoje", async () => {
    await abrir({ compromissoId: "c1", agendaId: "out" });
    await tocar("Remover");
    await fireEvent.press(screen.getByText("A partir de hoje"));

    expect(api.dados.agendas).toHaveLength(3);
    expect(api.dados.agendas.find((a) => a.id === "out")?.compromissos).toHaveLength(1);
    expect(screen.getByText("Voltou")).toBeTruthy();
  });

  it("remove um avulso depois de confirmar", async () => {
    await abrir({ avulsoId: "v1" });
    await tocar("Remover");
    await tocar("Confirmar remoção");
    expect(api.dados.avulsos).toEqual([]);
  });
});

describe("CompromissoScreen: vindo da semana modelo", () => {
  it("abre sem nenhum dia marcado e os atalhos preenchem a semana de uma vez", async () => {
    await abrir({ data: "2026-11-02", modelo: true });

    const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira"];
    for (const dia of dias) {
      expect(screen.getByRole("checkbox", { name: dia }).props.accessibilityState).toMatchObject({
        checked: false,
      });
    }

    await tocar("Seg a sex");
    for (const dia of dias.slice(1)) {
      expect(screen.getByRole("checkbox", { name: dia }).props.accessibilityState).toMatchObject({
        checked: true,
      });
    }
    expect(
      screen.getByRole("checkbox", { name: "Domingo" }).props.accessibilityState,
    ).toMatchObject({ checked: false });
  });
});
