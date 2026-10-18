import {
  CHAVE_ACOES,
  acaoValida,
  criarAcoesRepositoryLocal,
  migrarConteudo,
} from "../data/AcoesRepository";
import {
  CHAVE_PREFERENCIAS,
  PREFERENCIAS_PADRAO,
  criarPreferenciasRepositoryLocal,
  normalizarPreferencias,
} from "../data/PreferenciasRepository";
import { criarArmazenamentoEmMemoria, criarFilaDeGravacao } from "../data/armazenamento";
import { criarAcao } from "../domain/acoes";

const AGORA = new Date(2026, 9, 17, 15, 58);

function silencioso() {
  const avisos: string[] = [];
  return { avisos, aoAvisar: (m: string) => avisos.push(m), agora: () => AGORA };
}

describe("AcoesRepository local", () => {
  it("salva e carrega as mesmas ações", async () => {
    const armazenamento = criarArmazenamentoEmMemoria();
    const repo = criarAcoesRepositoryLocal(armazenamento, silencioso());
    const acoes = [criarAcao("estudo", AGORA), criarAcao("outro", AGORA, "Meditação")];

    await repo.salvar(acoes);
    expect(JSON.parse(armazenamento.dados.get(CHAVE_ACOES) ?? "")).toMatchObject({ versao: 1 });
    expect(await repo.carregar()).toEqual(acoes);
  });

  it("sem nada salvo, começa vazio", async () => {
    const repo = criarAcoesRepositoryLocal(criarArmazenamentoEmMemoria(), silencioso());
    expect(await repo.carregar()).toEqual([]);
  });

  it("JSON corrompido não quebra: guarda cópia, limpa a chave e avisa", async () => {
    const armazenamento = criarArmazenamentoEmMemoria({ [CHAVE_ACOES]: "{isso não é json" });
    const log = silencioso();
    const repo = criarAcoesRepositoryLocal(armazenamento, log);

    const resultado = await repo.ler();
    expect(resultado).toEqual({ acoes: [], descartados: 0, corrompido: true });
    expect(armazenamento.dados.has(CHAVE_ACOES)).toBe(false);
    expect(armazenamento.dados.get(`${CHAVE_ACOES}:corrompido:${AGORA.getTime()}`)).toBe(
      "{isso não é json",
    );
    expect(log.avisos).toHaveLength(1);
  });

  it("formato desconhecido (outra versão) também é tratado como corrompido", async () => {
    const armazenamento = criarArmazenamentoEmMemoria({
      [CHAVE_ACOES]: JSON.stringify({ versao: 99, itens: [] }),
    });
    const repo = criarAcoesRepositoryLocal(armazenamento, silencioso());
    expect((await repo.ler()).corrompido).toBe(true);
  });

  it("migra a versão 0 (array solto) e descarta itens inválidos e duplicados", async () => {
    const valida = criarAcao("hidratacao", AGORA);
    const v0 = [
      valida,
      valida,
      { id: "x", categoria: "dança", criadoEm: AGORA.toISOString() },
      { id: "y", categoria: "estudo", criadoEm: "ontem" },
      { id: "z", categoria: "outro", criadoEm: AGORA.toISOString(), rotulo: "   " },
      null,
    ];
    const armazenamento = criarArmazenamentoEmMemoria({ [CHAVE_ACOES]: JSON.stringify(v0) });
    const log = silencioso();
    const resultado = await criarAcoesRepositoryLocal(armazenamento, log).ler();

    expect(resultado.acoes).toEqual([valida]);
    expect(resultado.descartados).toBe(5);
    expect(log.avisos[0]).toMatch(/5 ação/);
  });

  it("gravações em sequência terminam com o último snapshot", async () => {
    const armazenamento = criarArmazenamentoEmMemoria();
    const repo = criarAcoesRepositoryLocal(armazenamento, silencioso());
    const a = criarAcao("estudo", AGORA);
    const b = criarAcao("descanso", AGORA);
    await Promise.all([repo.salvar([a]), repo.salvar([a, b]), repo.salvar([b])]);
    expect(await repo.carregar()).toEqual([b]);
  });
});

describe("validação e migração", () => {
  it("acaoValida exige id, categoria conhecida e data válida", () => {
    expect(acaoValida(criarAcao("estudo", AGORA))).toBe(true);
    expect(acaoValida({ id: "", categoria: "estudo", criadoEm: AGORA.toISOString() })).toBe(false);
    expect(acaoValida({ id: "1", categoria: "estudo" })).toBe(false);
    expect(
      acaoValida({
        id: "1",
        categoria: "outro",
        criadoEm: AGORA.toISOString(),
        rotulo: "x".repeat(41),
      }),
    ).toBe(false);
  });

  it("migrarConteudo devolve null para o que não reconhece", () => {
    expect(migrarConteudo(undefined)).toBeNull();
    expect(migrarConteudo("texto")).toBeNull();
    expect(migrarConteudo({ versao: 1, acoes: [] })).toEqual({
      acoes: [],
      descartados: 0,
      corrompido: false,
    });
  });
});

describe("PreferenciasRepository local", () => {
  it("salva e carrega tema, destaque e meta", async () => {
    const repo = criarPreferenciasRepositoryLocal(criarArmazenamentoEmMemoria());
    await repo.salvar({ modo: "dark", destaque: "laranja", meta: 8 });
    expect(await repo.carregar()).toEqual({ modo: "dark", destaque: "laranja", meta: 8 });
  });

  it("usa o padrão quando não há nada ou o conteúdo está corrompido", async () => {
    expect(
      await criarPreferenciasRepositoryLocal(criarArmazenamentoEmMemoria()).carregar(),
    ).toEqual(PREFERENCIAS_PADRAO);
    const corrompido = criarArmazenamentoEmMemoria({ [CHAVE_PREFERENCIAS]: "[[[" });
    expect(await criarPreferenciasRepositoryLocal(corrompido).carregar()).toEqual(
      PREFERENCIAS_PADRAO,
    );
  });

  it("aproveita campos válidos e corrige os inválidos", () => {
    expect(normalizarPreferencias({ modo: "dark", destaque: "roxo", meta: 50 })).toEqual({
      modo: "dark",
      destaque: "gradiente",
      meta: 20,
    });
    expect(normalizarPreferencias({ meta: 0 }).meta).toBe(1);
    expect(normalizarPreferencias({ meta: 2.5 }).meta).toBe(5);
  });
});

describe("fila de gravação", () => {
  it("continua depois de uma falha", async () => {
    const fila = criarFilaDeGravacao();
    const ordem: string[] = [];
    const falha = fila(async () => {
      ordem.push("a");
      throw new Error("disco cheio");
    });
    const ok = fila(async () => {
      ordem.push("b");
    });
    await expect(falha).rejects.toThrow("disco cheio");
    await ok;
    expect(ordem).toEqual(["a", "b"]);
  });
});
