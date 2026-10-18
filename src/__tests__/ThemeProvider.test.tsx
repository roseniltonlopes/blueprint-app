import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { THEMES } from "../styles/theme";
import { ThemeProvider, useTheme, type ThemeMode } from "../theme/ThemeProvider";
import { SegmentedControl } from "../ui";

function Sonda() {
  const { mode, scheme, colors, setMode } = useTheme();
  return (
    <>
      <Text testID="estado">{`${mode}|${scheme}|${colors.bg}`}</Text>
      <SegmentedControl<ThemeMode>
        accessibilityLabel="Aparência"
        value={mode}
        onChange={setMode}
        options={[
          { value: "light", label: "Claro" },
          { value: "dark", label: "Escuro" },
          { value: "system", label: "Automático" },
        ]}
      />
    </>
  );
}

describe("ThemeProvider", () => {
  it("começa no modo automático e resolve para um esquema concreto", async () => {
    await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("estado").props.children).toMatch(/^system\|(light|dark)\|/);
  });

  it("alterna entre claro e escuro pelo SegmentedControl", async () => {
    await render(
      <ThemeProvider initialMode="light">
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("estado").props.children).toBe(`light|light|${THEMES.light.bg}`);

    await fireEvent.press(screen.getByText("Escuro"));
    expect(screen.getByTestId("estado").props.children).toBe(`dark|dark|${THEMES.dark.bg}`);
    expect(screen.getByRole("radio", { name: "Escuro" }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it("useTheme fora do provider gera erro claro", async () => {
    const erro = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(render(<Sonda />)).rejects.toThrow(
      "useTheme precisa estar dentro de um ThemeProvider.",
    );
    erro.mockRestore();
  });
});
