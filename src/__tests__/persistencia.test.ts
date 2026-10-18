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
import { carregarEstadoDaConta, chaveDaConta } from "../data/conta";
import { ehUuid, type EstadoAcoes } from "../domain/acoes";
import { gerarIdDeTeste, nova } from "./utils";

const AGORA = new Date(2026, 9, 17, 15, 58);

function opcoes() {
  const avisos: string[] = [];
  return {
    avisos,
    gerarId: gerarIdDeTeste,
    aoAvisar: (m: string) => {
      avisos.push(m);
    },
    agora: () => AGORA,
  };
}

function estado(parcial: Partial<EstadoAcoes>): EstadoAcoes {
  return { acoes: [], exclusoesPendentes: [], lapides: [], ...parcial };
}

describe("AcoesRepository local (formato v2)", () => {
  it("salva e carrega ações, exclusões pendentes e lápides", async () => {
    const armazenamento = criarArmazenamentoEmMemoria();
    const repo = criarAcoesRepositoryLocal(armazenamento, opcoes());
    const salvo = estado({
      acoes: [nova("estudo", AGORA), { ...nova("outro", AGORA, "Meditação"), sincronizada: true }],
      exclusoesPendentes: ["00000000-0000-4000-8000-0000000000ff"],
      lapides: ["00000000-0000-4000-8000-0000000000ff"],
    });

    await repo.salvar(salvo);
    expect(JSON.parse(armazenamento.dados.get(CHAVE_ACOES) ?? "")).toMatchObject({ versao: 2 });
    expect(await repo.carregar()).toEqual(salvo);
  });

  it("usa a chave informada (uma por conta)", async () => {
    const armazenamento = criarArmazenamentoEmMemoria();
    const repo = criarAcoesRepositoryLocal(armazenamento, { ...opcoes(), chave: "x" });
    await repo.salvar(estado({ acoes: [nova("estudo", AGORA)] }));
    expect(armazenamento.dados.has("x")).toBe(true);
    expect(armazenamento.dados.has(CHAVE_ACOES)).toBe(false);
  });

  it("sem nada salvo, começa vazio", async () => {
    const repo = criarAcoesRepositoryLocal(criarArmazenamentoEmMemoria(), opcoes());
    expect(await repo.carregar()).toEqual(estado({}));
  });

  it("JSON corrompido não quebra: guarda cópia, limpa a chave e avisa", async () => {
    const armazenamento = criarArmazenamentoEmMemoria({ [CHAVE_ACOES]: "{isso não é json" });
    const log = opcoes();
    const resultado = await criarAcoesRepositoryLocal(armazenamento, log).ler();

    expect(resultado).toEqual({ estado: estado({}), descartados: 0, corrompido: true });
    expect(armazenamento.dados.has(CHAVE_ACOES)).toBe(false);
    expect(armazenamento.dados.get(`${CHAVE_ACOES}:corrompido:${AGORA.getTime()}`)).toBe(
      "{isso não é json",
    );
    expect(log.avisos).toHaveLength(1);
  });

  it("formato de versão desconhecida também é tratado como corrompido", async () => {
    const armazenamento = criarArmazenamentoEmMemoria({
      [CHAVE_ACOES]: JSON.stringify({ versao: 99, itens: [] }),
    });
    expect((await criarAcoesRepositoryLocal(armazenamento, opcoes()).ler()).corrompido).toBe(true);
  });

  it("gravações em sequência terminam com o último retrato", async () => {
    const repo = criarAcoesRepositoryLocal(criarArmazenamentoEmMemoria(), opcoes());
    const a = nova("estudo", AGORA);
    const b = nova("descanso", AGORA);
    await Promise.all([
      repo.salvar(estado({ acoes: [a] })),
      repo.salvar(estado({ acoes: [a, b] })),
      repo.salvar(estado({ acoes: [b] })),
    ]);
    expect((await repo.carregar()).acoes).toEqual([b]);
  });
});

describe("migração de formatos antigos", () => {
  it("v0 (array solto): descarta inválidos e repetidos", () => {
    const valida = nova("hidratacao", AGORA);
    const v0 = [
      valida,
      valida,
      { id: "x", categoria: "dança", criadoEm: AGORA.toISOString() },
      { id: "y", categoria: "estudo", criadoEm: "ontem" },
      { id: "z", categoria: "outro", criadoEm: AGORA.toISOString(), rotulo: "   " },
      null,
    ];
    const resultado = migrarConteudo(v0, gerarIdDeTeste);
    expect(resultado?.estado.acoes).toEqual([valida]);
    expect(resultado?.descartados).toBe(5);
  });

  it("v1 (Etapa 6): troca ids antigos por UUID e ajusta o nome do Outro", () => {
    const v1 = {
      versao: 1,
      acoes: [
        { id: "local-abc-1", categoria: "outro", criadoEm: AGORA.toISOString() },
        { id: "local-abc-2", categoria: "estudo", criadoEm: AGORA.toISOString(), rotulo: "x" },
      ],
    };
    const acoes = migrarConteudo(v1, gerarIdDeTeste)?.estado.acoes ?? [];
    expect(acoes).toHaveLength(2);
    expect(acoes.every((a) => ehUuid(a.id) && !a.sincronizada)).toBe(true);
    expect(acoes[0].rotulo).toBe("Outro");
    expect(acoes[1].rotulo).toBeUndefined();
  });

  it("v2 ignora itens que não são ids nas listas de sincronização", () => {
    const resultado = migrarConteudo(
      { versao: 2, acoes: [], exclusoesPendentes: ["a", 3, "", "a"], lapides: "x" },
      gerarIdDeTeste,
    );
    expect(resultado?.estado).toEqual(estado({ exclusoesPendentes: ["a"] }));
  });

  it("acaoValida exige id, categoria conhecida e data válida", () => {
    expect(acaoValida(nova("estudo", AGORA))).toBe(true);
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
    expect(migrarConteudo(undefined, gerarIdDeTeste)).toBeNull();
    expect(migrarConteudo("texto", gerarIdDeTeste)).toBeNull();
  });
});

describe("dados por conta", () => {
  it("a primeira entrada adota as ações feitas sem conta e limpa a chave antiga", async () => {
    const semConta = estado({ acoes: [nova("estudo", AGORA), nova("descanso", AGORA)] });
    const armazenamento = criarArmazenamentoEmMemoria({
      [CHAVE_ACOES]: JSON.stringify({ versao: 2, ...semConta }),
    });

    const adotado = await carregarEstadoDaConta(armazenamento, "usuario-1", gerarIdDeTeste);
    expect(adotado.acoes.map((a) => a.id)).toEqual(semConta.acoes.map((a) => a.id));
    expect(armazenamento.dados.has(CHAVE_ACOES)).toBe(false);
    expect(armazenamento.dados.has(chaveDaConta("usuario-1"))).toBe(true);
  });

  it("conta que já tem dados não adota nada e não mistura contas", async () => {
    const daConta = estado({ acoes: [{ ...nova("estudo", AGORA), sincronizada: true }] });
    const armazenamento = criarArmazenamentoEmMemoria({
      [chaveDaConta("usuario-1")]: JSON.stringify({ versao: 2, ...daConta }),
      [CHAVE_ACOES]: JSON.stringify({ versao: 2, ...estado({ acoes: [nova("descanso", AGORA)] }) }),
    });

    expect(await carregarEstadoDaConta(armazenamento, "usuario-1", gerarIdDeTeste)).toEqual(
      daConta,
    );
    expect(armazenamento.dados.has(CHAVE_ACOES)).toBe(true);
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
