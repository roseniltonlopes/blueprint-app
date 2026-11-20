import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import { criarPerfilRepositoryLocal } from "../data/PerfilRepository";
import { ERRO_NOME } from "../domain/perfil";
import PerfilScreen from "../screens/PerfilScreen";
import { escolherFoto } from "../services/escolherFoto";
import { renderComTema } from "./utils";

jest.mock("../services/escolherFoto", () => ({ escolherFoto: jest.fn() }));
const escolherFotoMock = jest.mocked(escolherFoto);

const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD=";

async function digitarNome(texto: string) {
  await fireEvent.changeText(screen.getByLabelText("Seu nome"), texto);
}

afterEach(() => {
  jest.resetAllMocks();
});

describe("PerfilScreen: nome", () => {
  it("começa como Convidado, com as iniciais e o convite para adicionar o nome", async () => {
    await renderComTema(<PerfilScreen />);

    expect(screen.getByText("Convidado")).toBeTruthy();
    expect(screen.getByLabelText("Avatar de Convidado")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adicionar seu nome" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adicionar foto" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remover foto" })).toBeNull();
  });

  it("salva o nome limpo e atualiza o avatar", async () => {
    await renderComTema(<PerfilScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Adicionar seu nome" }));
    await digitarNome("  Gabriel    Barroso ");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText("Gabriel Barroso")).toBeTruthy();
    expect(screen.getByText("GB")).toBeTruthy();
    expect(screen.getByLabelText("Avatar de Gabriel Barroso")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar nome" })).toBeTruthy();
    expect(screen.queryByLabelText("Seu nome")).toBeNull();
  });

  it("não aceita nome vazio e continua editando", async () => {
    await renderComTema(<PerfilScreen />, { perfil: { nome: "Ana", foto: null } });

    await fireEvent.press(screen.getByRole("button", { name: "Editar nome" }));
    await digitarNome("   ");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(ERRO_NOME);
    expect(screen.getByLabelText("Seu nome")).toBeTruthy();
  });

  it("cancelar mantém o nome que já estava", async () => {
    await renderComTema(<PerfilScreen />, { perfil: { nome: "Ana Souza", foto: null } });
    expect(screen.getByText("AS")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Editar nome" }));
    expect(screen.getByLabelText("Seu nome").props.value).toBe("Ana Souza");
    await digitarNome("Outro");
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByText("Ana Souza")).toBeTruthy();
    expect(screen.queryByText("Outro")).toBeNull();
  });

  it("grava o nome no aparelho", async () => {
    const repositorio = criarPerfilRepositoryLocal(criarArmazenamentoEmMemoria());
    await renderComTema(<PerfilScreen />, { repositorioPerfil: repositorio });

    await fireEvent.press(screen.getByRole("button", { name: "Adicionar seu nome" }));
    await digitarNome("Gabriel");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(async () => {
      expect(await repositorio.carregar()).toEqual({ nome: "Gabriel", foto: null });
    });
  });
});

describe("PerfilScreen: foto", () => {
  it("mostra a foto escolhida no lugar das iniciais e deixa remover", async () => {
    escolherFotoMock.mockResolvedValue({ ok: true, valor: FOTO });
    await renderComTema(<PerfilScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Adicionar foto" }));
    await waitFor(() => expect(screen.getByLabelText("Foto de Convidado")).toBeTruthy());
    expect(screen.queryByLabelText("Avatar de Convidado")).toBeNull();
    expect(screen.getByRole("button", { name: "Trocar foto" })).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Remover foto" }));
    expect(screen.getByLabelText("Avatar de Convidado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remover foto" })).toBeNull();
  });

  it("cancelar a escolha não muda nada", async () => {
    escolherFotoMock.mockResolvedValue({ ok: true, valor: null });
    await renderComTema(<PerfilScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Adicionar foto" }));
    await waitFor(() => expect(escolherFotoMock).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Avatar de Convidado")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mostra o erro quando a foto não pôde ser lida", async () => {
    escolherFotoMock.mockResolvedValue({
      ok: false,
      erro: "Essa foto é pesada demais. Escolha outra.",
    });
    await renderComTema(<PerfilScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Adicionar foto" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/pesada demais/));
    expect(screen.getByLabelText("Avatar de Convidado")).toBeTruthy();
  });

  it("carrega nome e foto salvos e grava a remoção", async () => {
    const repositorio = criarPerfilRepositoryLocal(criarArmazenamentoEmMemoria());
    await renderComTema(<PerfilScreen />, {
      perfil: { nome: "Ana Souza", foto: FOTO },
      repositorioPerfil: repositorio,
    });

    expect(screen.getByText("Ana Souza")).toBeTruthy();
    expect(screen.getByLabelText("Foto de Ana Souza")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Remover foto" }));
    await waitFor(async () => {
      expect(await repositorio.carregar()).toEqual({ nome: "Ana Souza", foto: null });
    });
  });
});
