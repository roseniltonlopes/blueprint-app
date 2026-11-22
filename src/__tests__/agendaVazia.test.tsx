import { NavigationContainer } from "@react-navigation/native";
import { fireEvent, screen } from "@testing-library/react-native";
import { AGENDA_COMECA_VAZIA, DADOS_AGENDA_VAZIOS } from "../domain/agenda";
import Raiz from "../navigation/Raiz";
import { renderComTema } from "./utils";

describe("Primeiro acesso: a agenda começa vazia", () => {
  it("Home e aba Agenda avisam que nada vem preenchido", async () => {
    await renderComTema(
      <NavigationContainer>
        <Raiz />
      </NavigationContainer>,
      { agenda: DADOS_AGENDA_VAZIOS },
    );
    expect(screen.getByText(AGENDA_COMECA_VAZIA)).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Montar agenda" }));
    expect(screen.getByTestId("agenda-comeca-vazia")).toHaveTextContent(AGENDA_COMECA_VAZIA);
  });

  it("com alguma agenda, o aviso de agenda vazia não aparece", async () => {
    await renderComTema(
      <NavigationContainer>
        <Raiz />
      </NavigationContainer>,
      {
        agenda: {
          ...DADOS_AGENDA_VAZIOS,
          agendas: [
            {
              id: "nov",
              nome: "Novembro de 2026",
              inicio: "2026-11-01",
              fim: "2026-11-30",
              compromissos: [],
            },
          ],
        },
      },
    );
    expect(screen.queryByText(AGENDA_COMECA_VAZIA)).toBeNull();
  });
});
