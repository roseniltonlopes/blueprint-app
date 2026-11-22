import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import type { Agenda, Atividade, Avulso, DadosAgenda } from "../domain/agenda";
import { useAgenda, type UseAgenda } from "../hooks/useAgenda";
import type { RaizParamList } from "../navigation/Raiz";
import AgendasScreen from "../screens/AgendasScreen";
import { Text } from "../ui/Text";
import { renderComTema } from "./utils";

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

function Tela({ params }: { params?: RaizParamList["Agendas"] }) {
  return (
    <>
      <Sonda />
      <NavigationContainer
        initialState={{ routes: [{ name: "Abas" }, { name: "Agendas", params }], index: 1 }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Abas" component={Voltou} />
          <Stack.Screen name="Agendas" component={AgendasScreen} />
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

const novembro: Agenda = {
  id: "nov",
  nome: "Novembro de 2026",
  inicio: "2026-11-01",
  fim: "2026-11-30",
  compromissos: [{ id: "n1", atividadeId: "academia", dias: [1], inicio: "08:00", fim: "09:00" }],
};

const avulso: Avulso = {
  id: "v1",
  atividadeId: "academia",
  data: "2026-11-10",
  inicio: "07:00",
  fim: null,
};

const DADOS: DadosAgenda = {
  atividades: [academia],
  agendas: [novembro],
  avulsos: [avulso],
  registros: [],
};

// AGORA nos testes é sábado, 17/10/2026.
async function abrir(params?: RaizParamList["Agendas"], dados: DadosAgenda = DADOS) {
  await renderComTema(<Tela params={params} />, { agenda: dados });
}

async function tocar(nome: string) {
  await fireEvent.press(screen.getByRole("button", { name: nome }));
}

async function digitar(rotulo: string, texto: string) {
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
}

describe("AgendasScreen: lista", () => {
  it("mostra nome, período e quantidade de compromissos de cada agenda", async () => {
    await abrir();
    expect(screen.getByText("Novembro de 2026")).toBeTruthy();
    expect(screen.getByText("01/11/2026 a 30/11/2026")).toBeTruthy();
    expect(screen.getByText("1 compromisso")).toBeTruthy();
  });

  it("explica que não há agendas quando a lista está vazia", async () => {
    await abrir(undefined, { atividades: [], agendas: [], avulsos: [], registros: [] });
    expect(screen.getByText("Nenhuma agenda ainda")).toBeTruthy();
  });
});

describe("AgendasScreen: duplicar", () => {
  it("cria o mês seguinte e o destaca; duplicar de novo avisa que o período está ocupado", async () => {
    await abrir();
    await tocar("Duplicar Novembro de 2026 para o próximo mês");

    expect(screen.getByText("Dezembro de 2026")).toBeTruthy();
    expect(screen.getByText("Agenda criada: Dezembro de 2026")).toBeTruthy();
    expect(api.dados.agendas.map((a) => a.nome)).toEqual(["Novembro de 2026", "Dezembro de 2026"]);

    await tocar("Duplicar Novembro de 2026 para o próximo mês");
    expect(screen.getByRole("alert")).toHaveTextContent("Já existe agenda neste período");
    expect(api.dados.agendas).toHaveLength(2);
  });
});

describe("AgendasScreen: nova agenda", () => {
  it("abre o formulário com o mês atual preenchido e cria uma agenda válida", async () => {
    await abrir();
    await tocar("Nova agenda");

    expect(screen.getByDisplayValue("Outubro de 2026")).toBeTruthy();
    expect(screen.getByDisplayValue("2026-10-01")).toBeTruthy();
    expect(screen.getByDisplayValue("2026-10-31")).toBeTruthy();

    await tocar("Salvar agenda");
    expect(api.dados.agendas.map((a) => a.nome)).toEqual(["Outubro de 2026", "Novembro de 2026"]);
    expect(screen.queryByLabelText("Nome da agenda")).toBeNull();
  });

  it("recusa período que se sobrepõe a outra agenda e mantém o formulário aberto", async () => {
    await abrir();
    await tocar("Nova agenda");
    await digitar("Fim (AAAA-MM-DD)", "2026-11-05");
    await tocar("Salvar agenda");

    expect(screen.getByRole("alert")).toHaveTextContent("Já existe agenda neste período");
    expect(api.dados.agendas).toHaveLength(1);
    expect(screen.getByLabelText("Nome da agenda")).toBeTruthy();
  });

  it("abre já com o formulário quando a rota pede uma nova agenda", async () => {
    await abrir({ nova: true });
    expect(screen.getByDisplayValue("Outubro de 2026")).toBeTruthy();
  });

  it("abre o formulário com o período livre do dia pedido", async () => {
    const curta: Agenda = {
      ...novembro,
      id: "out",
      nome: "Outubro de 2026",
      inicio: "2026-10-01",
      fim: "2026-10-28",
    };
    await abrir({ nova: true, data: "2026-10-30" }, { ...DADOS, agendas: [curta] });
    expect(screen.getByDisplayValue("Outubro de 2026")).toBeTruthy();
    expect(screen.getByDisplayValue("2026-10-29")).toBeTruthy();
    expect(screen.getByDisplayValue("2026-10-31")).toBeTruthy();
  });

  it("cancelar fecha o formulário sem criar nada", async () => {
    await abrir({ nova: true });
    await tocar("Cancelar");
    expect(screen.queryByLabelText("Nome da agenda")).toBeNull();
    expect(api.dados.agendas).toHaveLength(1);
  });
});

describe("AgendasScreen: editar período", () => {
  it("recusa fim antes do início", async () => {
    await abrir();
    await tocar("Editar período de Novembro de 2026");
    expect(screen.getByDisplayValue("2026-11-30")).toBeTruthy();

    await digitar("Fim (AAAA-MM-DD)", "2026-10-01");
    await tocar("Salvar agenda");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "O fim do período deve ser igual ou depois do início",
    );
    expect(api.dados.agendas[0].fim).toBe("2026-11-30");
  });

  it("salva um período novo e atualiza a lista", async () => {
    await abrir();
    await tocar("Editar período de Novembro de 2026");
    await digitar("Fim (AAAA-MM-DD)", "2026-11-29");
    await tocar("Salvar agenda");

    expect(screen.getByText("01/11/2026 a 29/11/2026")).toBeTruthy();
    expect(api.dados.agendas[0]).toMatchObject({ id: "nov", fim: "2026-11-29" });
  });
});

describe("AgendasScreen: remover", () => {
  it("pede confirmação e remove só a agenda, mantendo atividades e avulsos", async () => {
    await abrir();
    await tocar("Remover Novembro de 2026");
    expect(screen.getByText(/Remove só os compromissos desta agenda/)).toBeTruthy();
    await tocar("Confirmar remoção");

    expect(api.dados.agendas).toEqual([]);
    expect(api.dados.atividades).toHaveLength(1);
    expect(api.dados.avulsos).toHaveLength(1);
    expect(screen.getByText("Nenhuma agenda ainda")).toBeTruthy();
  });

  it("cancelar a confirmação mantém a agenda", async () => {
    await abrir();
    await tocar("Remover Novembro de 2026");
    await tocar("Cancelar");
    expect(api.dados.agendas).toHaveLength(1);
  });
});

describe("AgendasScreen: navegação", () => {
  it("o botão Voltar do cabeçalho retorna à tela anterior", async () => {
    await abrir();
    await tocar("Voltar");
    expect(screen.getByText("Voltou")).toBeTruthy();
  });
});
