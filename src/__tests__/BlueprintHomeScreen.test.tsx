import { fireEvent, render, screen } from "@testing-library/react-native";
import BlueprintHomeScreen from "../screens/BlueprintHomeScreen";

describe("BlueprintHomeScreen", () => {
  it("começa com zero ações e nenhuma categoria", async () => {
    await render(<BlueprintHomeScreen />);
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("Foco atual: Nenhuma categoria selecionada")).toBeTruthy();
  });

  it("seleciona categoria e incrementa o contador ao registrar", async () => {
    await render(<BlueprintHomeScreen />);
    await fireEvent.press(screen.getByText("Exercício"));
    expect(screen.getByText("Foco atual: Exercício")).toBeTruthy();
    await fireEvent.press(screen.getByText("Registrar ação no Blueprint"));
    expect(screen.getByText("1")).toBeTruthy();
  });
});
