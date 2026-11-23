import { fireEvent, screen } from "@testing-library/react-native";
import SeletorDeDias from "../components/SeletorDeDias";
import SeletorDeHorario, {
  HORAS,
  MINUTOS,
  montarHora,
  partesDaHora,
} from "../components/SeletorDeHorario";
import type { DiaDaSemana } from "../domain/agenda";
import { renderComTema } from "./utils";

describe("SeletorDeDias", () => {
  it("adiciona e remove dias mantendo a ordem crescente", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeDias valor={[1]} aoMudar={aoMudar} />);

    await fireEvent.press(screen.getByRole("checkbox", { name: "Terça-feira" }));
    expect(aoMudar).toHaveBeenLastCalledWith([1, 2]);

    await fireEvent.press(screen.getByRole("checkbox", { name: "Segunda-feira" }));
    expect(aoMudar).toHaveBeenLastCalledWith([]);
  });

  it("ordena o resultado ao marcar um dia anterior", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeDias valor={[3, 5]} aoMudar={aoMudar} />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Domingo" }));
    expect(aoMudar).toHaveBeenLastCalledWith([0, 3, 5] satisfies DiaDaSemana[]);
  });

  it("expõe o estado marcado para leitores de tela", async () => {
    await renderComTema(<SeletorDeDias valor={[2]} aoMudar={() => {}} />);
    const marcado = screen.getByRole("checkbox", { name: "Terça-feira" });
    const livre = screen.getByRole("checkbox", { name: "Quarta-feira" });
    expect(marcado.props.accessibilityState).toMatchObject({ checked: true });
    expect(livre.props.accessibilityState).toMatchObject({ checked: false });
  });
});

describe("SeletorDeHorario", () => {
  it("abre o painel com a hora atual e devolve a hora escolhida na grade", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor="05:00" aoMudar={aoMudar} rotulo="Início" />);
    expect(screen.getByText("05:00")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Início: 05:00" }));
    expect(screen.getByTestId("visor-do-horario").props.children).toBe("05:00");
    expect(screen.getByRole("radio", { name: "Hora 05" }).props.accessibilityState).toMatchObject({
      selected: true,
    });

    await fireEvent.press(screen.getByRole("radio", { name: "Hora 07" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Minuto 30" }));
    expect(screen.getByTestId("visor-do-horario").props.children).toBe("07:30");
    expect(aoMudar).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Definir horário" }));
    expect(aoMudar).toHaveBeenCalledWith("07:30");
    expect(screen.queryByTestId("visor-do-horario")).toBeNull();
  });

  it("sem valor, o painel começa em 08:00", async () => {
    await renderComTema(<SeletorDeHorario valor={null} aoMudar={() => {}} rotulo="Término" />);
    expect(screen.getByText("--:--")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Término: escolher horário" }));
    expect(screen.getByTestId("visor-do-horario").props.children).toBe("08:00");
  });

  it("Cancelar fecha sem mudar a hora", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor="09:15" aoMudar={aoMudar} rotulo="Início" />);
    await fireEvent.press(screen.getByRole("button", { name: "Início: 09:15" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Hora 10" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(aoMudar).not.toHaveBeenCalled();
    expect(screen.queryByTestId("visor-do-horario")).toBeNull();
  });

  it("oferece as 24 horas e os minutos de 5 em 5", async () => {
    expect(HORAS).toHaveLength(24);
    expect(MINUTOS).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(partesDaHora("23:45")).toEqual({ horas: 23, minutos: 45 });
    expect(partesDaHora("25:00")).toEqual({ horas: 8, minutos: 0 });
    expect(montarHora(7, 5)).toBe("07:05");
  });
});

describe("SeletorDeDias: atalhos", () => {
  it("não mostra atalhos por padrão", async () => {
    await renderComTema(<SeletorDeDias valor={[]} aoMudar={() => {}} />);
    expect(screen.queryByRole("button", { name: "Seg a sex" })).toBeNull();
  });

  it.each([
    ["Seg a sex", [1, 2, 3, 4, 5]],
    ["Fim de semana", [0, 6]],
    ["Todos os dias", [0, 1, 2, 3, 4, 5, 6]],
  ] satisfies [string, DiaDaSemana[]][])("o atalho %s marca os dias certos", async (nome, dias) => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeDias valor={[3]} aoMudar={aoMudar} atalhos />);

    await fireEvent.press(screen.getByRole("button", { name: nome }));
    expect(aoMudar).toHaveBeenLastCalledWith(dias);
  });

  it("destaca o atalho que corresponde à seleção atual", async () => {
    await renderComTema(<SeletorDeDias valor={[1, 2, 3, 4, 5]} aoMudar={() => {}} atalhos />);

    const ativo = screen.getByRole("button", { name: "Seg a sex" });
    const outro = screen.getByRole("button", { name: "Fim de semana" });
    expect(ativo.props.accessibilityState).toMatchObject({ selected: true });
    expect(outro.props.accessibilityState).toMatchObject({ selected: false });
  });
});
