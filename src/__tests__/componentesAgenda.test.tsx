import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import SeletorDeDias from "../components/SeletorDeDias";
import SeletorDeHorario from "../components/SeletorDeHorario";
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
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("no iOS abre o seletor nativo e devolve a hora escolhida", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor="05:00" aoMudar={aoMudar} rotulo="Início" />);
    expect(screen.getByText("05:00")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Início" }));
    const seletor = screen.getByTestId("datetimepicker");
    await fireEvent(seletor, "change", { type: "set" }, new Date(2026, 10, 1, 5, 30));
    expect(aoMudar).toHaveBeenCalledWith("05:30");
  });

  it("no iOS, abrir sem valor já propõe 08:00 e o botão OK fecha a roda", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor={null} aoMudar={aoMudar} rotulo="Início" />);

    await fireEvent.press(screen.getByRole("button", { name: "Início" }));
    expect(aoMudar).toHaveBeenCalledWith("08:00");
    expect(screen.getByTestId("datetimepicker")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByTestId("datetimepicker")).toBeNull();
  });

  it("no iOS, abrir com valor não troca a hora até a pessoa girar a roda", async () => {
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor="05:00" aoMudar={aoMudar} rotulo="Início" />);
    await fireEvent.press(screen.getByRole("button", { name: "Início" }));
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("no Android abre o diálogo nativo", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor={null} aoMudar={aoMudar} rotulo="Início" />);

    await fireEvent.press(screen.getByRole("button", { name: "Início" }));
    expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "time", is24Hour: true }),
    );
    const { onChange } = jest.mocked(DateTimePickerAndroid.open).mock.calls[0][0];
    onChange?.({ type: "set" } as never, new Date(2026, 10, 1, 7, 5));
    expect(aoMudar).toHaveBeenCalledWith("07:05");
  });

  it("na web aplica a máscara HH:MM e só avisa quando a hora é válida", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    const aoMudar = jest.fn();
    await renderComTema(<SeletorDeHorario valor={null} aoMudar={aoMudar} rotulo="Início" />);

    const campo = screen.getByLabelText("Início");
    await fireEvent.changeText(campo, "053");
    expect(aoMudar).not.toHaveBeenCalled();
    await fireEvent.changeText(campo, "0530");
    expect(aoMudar).toHaveBeenCalledWith("05:30");
    expect(screen.getByDisplayValue("05:30")).toBeTruthy();

    await fireEvent.changeText(campo, "2599");
    expect(aoMudar).toHaveBeenCalledTimes(1);
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
