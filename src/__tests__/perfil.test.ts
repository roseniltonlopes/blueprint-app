import { criarArmazenamentoEmMemoria } from "../data/armazenamento";
import {
  CHAVE_PERFIL,
  criarPerfilRepositoryLocal,
  normalizarPerfil,
} from "../data/PerfilRepository";
import {
  ERRO_NOME,
  FOTO_MAX_CARACTERES,
  NOME_MAX,
  fotoValida,
  nomeParaExibir,
  normalizarNome,
  validarNome,
} from "../domain/perfil";

const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD=";

describe("regras do perfil", () => {
  it("normaliza o nome tirando espaços das pontas e repetidos", () => {
    expect(normalizarNome("  Gabriel    Barroso  ")).toBe("Gabriel Barroso");
  });

  it("aceita nomes de 1 a 40 caracteres e recusa vazio ou longo demais", () => {
    expect(validarNome("A")).toBeNull();
    expect(validarNome("x".repeat(NOME_MAX))).toBeNull();
    expect(validarNome("")).toBe(ERRO_NOME);
    expect(validarNome("   ")).toBe(ERRO_NOME);
    expect(validarNome("x".repeat(NOME_MAX + 1))).toBe(ERRO_NOME);
  });

  it("só aceita foto como data URI de imagem, e pequena", () => {
    expect(fotoValida(FOTO)).toBe(true);
    expect(fotoValida("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(fotoValida("https://exemplo.com/foto.jpg")).toBe(false);
    expect(fotoValida("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(fotoValida("data:image/jpeg;base64,")).toBe(false);
    expect(fotoValida(42)).toBe(false);
    expect(fotoValida(`data:image/jpeg;base64,${"A".repeat(FOTO_MAX_CARACTERES)}`)).toBe(false);
  });

  it("mostra Convidado enquanto não há nome", () => {
    expect(nomeParaExibir({ nome: "" })).toBe("Convidado");
    expect(nomeParaExibir({ nome: "Ana" })).toBe("Ana");
  });
});

describe("PerfilRepository local", () => {
  it("devolve o perfil vazio quando nada foi salvo", async () => {
    const repo = criarPerfilRepositoryLocal(criarArmazenamentoEmMemoria());
    expect(await repo.carregar()).toEqual({ nome: "", foto: null });
  });

  it("grava e lê de volta nome e foto", async () => {
    const armazenamento = criarArmazenamentoEmMemoria();
    await criarPerfilRepositoryLocal(armazenamento).salvar({ nome: "Ana Souza", foto: FOTO });

    const lido = await criarPerfilRepositoryLocal(armazenamento).carregar();
    expect(lido).toEqual({ nome: "Ana Souza", foto: FOTO });
    expect(JSON.parse(armazenamento.dados.get(CHAVE_PERFIL) ?? "{}")).toMatchObject({ versao: 1 });
  });

  it("não lança com conteúdo corrompido e aproveita o que for válido", async () => {
    const corrompido = criarArmazenamentoEmMemoria({ [CHAVE_PERFIL]: "{isto não é json" });
    expect(await criarPerfilRepositoryLocal(corrompido).carregar()).toEqual({
      nome: "",
      foto: null,
    });

    expect(normalizarPerfil({ nome: "  Bia  ", foto: "https://x.com/a.jpg" })).toEqual({
      nome: "Bia",
      foto: null,
    });
    expect(normalizarPerfil({ nome: 42, foto: FOTO })).toEqual({ nome: "", foto: FOTO });
    expect(normalizarPerfil(null)).toEqual({ nome: "", foto: null });
    expect(normalizarPerfil({ nome: "x".repeat(100) }).nome).toHaveLength(NOME_MAX);
  });
});
