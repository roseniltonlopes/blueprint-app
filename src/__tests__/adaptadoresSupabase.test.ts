import { AuthApiError, AuthRetryableFetchError, type SupabaseClient } from "@supabase/supabase-js";
import { ErroDaConta } from "../domain/conta";
import { traduzirErroDeAutenticacao } from "../services/contaSupabase";
import { criarRemotoSupabase, falhaDaResposta } from "../services/remotoSupabase";
import { ErroDeSincronizacao } from "../sincronizacao/porta";

describe("traduzirErroDeAutenticacao", () => {
  it.each([
    ["credenciais", new AuthApiError("Invalid login credentials", 400, "invalid_credentials")],
    ["emailNaoConfirmado", new AuthApiError("Email not confirmed", 400, "email_not_confirmed")],
    ["emailJaCadastrado", new AuthApiError("User already registered", 422, "user_already_exists")],
    ["muitasTentativas", new AuthApiError("Too many", 429, undefined)],
    ["desconhecido", new AuthApiError("Estranho", 500, "unexpected_failure")],
    ["rede", new AuthRetryableFetchError("Failed to fetch", 0)],
    ["rede", new TypeError("Network request failed")],
    ["desconhecido", new Error("?")],
  ])("vira %s (caso %#)", (codigo, erro) => {
    const traduzido = traduzirErroDeAutenticacao(erro);
    expect(traduzido).toBeInstanceOf(ErroDaConta);
    expect(traduzido.codigo).toBe(codigo);
  });
});

describe("falhaDaResposta", () => {
  it("classifica as respostas do PostgREST", () => {
    expect(falhaDaResposta({ error: null, status: 200 })).toBeNull();
    expect(
      falhaDaResposta({ error: { message: "TypeError: x", code: "" }, status: 0 })?.motivo,
    ).toBe("rede");
    expect(falhaDaResposta({ error: { message: "x" }, status: 503 })?.motivo).toBe("rede");
    expect(
      falhaDaResposta({
        error: { message: "Could not find the table 'public.registros'", code: "PGRST205" },
        status: 404,
      })?.motivo,
    ).toBe("migracao");
    expect(
      falhaDaResposta({ error: { message: "JWT expired", code: "PGRST303" }, status: 401 })?.motivo,
    ).toBe("sessao");
    expect(
      falhaDaResposta({ error: { message: "violates check", code: "23514" }, status: 400 })?.motivo,
    ).toBe("servidor");
  });
});

type Chamada = { tabela: string; metodo: string; args: unknown[] };

/** Cliente com a mesma cadeia de métodos usada pelo adaptador, gravando as chamadas. */
function clienteFalso(paginas: Record<string, unknown[][]>, chamadas: Chamada[]) {
  const usadas: Record<string, number> = {};
  return {
    from(tabela: string) {
      const resposta = () => {
        if (tabela === "perfis") return { data: { nome: "Ana" }, error: null, status: 200 };
        const indice = usadas[tabela] ?? 0;
        usadas[tabela] = indice + 1;
        return { data: paginas[tabela]?.[indice] ?? [], error: null, status: 200 };
      };
      const cadeia: Record<string, unknown> = {};
      for (const metodo of ["select", "eq", "order", "in", "delete", "upsert"]) {
        cadeia[metodo] = (...args: unknown[]) => {
          chamadas.push({ tabela, metodo, args });
          return cadeia;
        };
      }
      cadeia.range = (...args: unknown[]) => {
        chamadas.push({ tabela, metodo: "range", args });
        return Promise.resolve(resposta());
      };
      cadeia.maybeSingle = () => Promise.resolve(resposta());
      cadeia.then = (ok: (valor: unknown) => unknown) =>
        Promise.resolve({ error: null, status: 201 }).then(ok);
      return cadeia;
    },
  } as unknown as SupabaseClient;
}

describe("criarRemotoSupabase", () => {
  it("baixa em páginas de 1000 até a última incompleta", async () => {
    const chamadas: Chamada[] = [];
    const cheia = Array.from({ length: 1000 }, (_, i) => ({ id: `a${i}` }));
    const remoto = criarRemotoSupabase(
      clienteFalso({ acoes: [cheia, [{ id: "ultima" }]] }, chamadas),
    );
    const linhas = await remoto.baixar("u1");
    expect(linhas.acoes).toHaveLength(1001);
    expect(linhas.perfil).toEqual({ nome: "Ana" });
    expect(
      chamadas.filter((c) => c.tabela === "acoes" && c.metodo === "range").map((c) => c.args),
    ).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("upsert por (user_id, id); ações ignoram repetidas; delete filtra o dono", async () => {
    const chamadas: Chamada[] = [];
    const remoto = criarRemotoSupabase(clienteFalso({}, chamadas));
    await remoto.executar("u1", [
      { tipo: "apagar", tabela: "registros", ids: ["r1"] },
      { tipo: "enviar", tabela: "atividades", linhas: [] },
      {
        tipo: "enviar",
        tabela: "acoes",
        linhas: [
          {
            user_id: "u1",
            id: "a1",
            categoria: "estudo",
            rotulo: null,
            criado_em: "2026-11-20T08:00:00.000Z",
          },
        ],
      },
      { tipo: "nome", nome: "Ana" },
    ]);
    expect(chamadas).toEqual([
      { tabela: "registros", metodo: "delete", args: [] },
      { tabela: "registros", metodo: "eq", args: ["user_id", "u1"] },
      { tabela: "registros", metodo: "in", args: ["id", ["r1"]] },
      {
        tabela: "acoes",
        metodo: "upsert",
        args: [
          [expect.objectContaining({ id: "a1" })],
          { onConflict: "user_id,id", ignoreDuplicates: true },
        ],
      },
      {
        tabela: "perfis",
        metodo: "upsert",
        args: [{ id: "u1", nome: "Ana" }, { onConflict: "id" }],
      },
    ]);
  });

  it("falha de rede no fetch vira o motivo rede", async () => {
    const cliente = {
      from: () => {
        throw new TypeError("Network request failed");
      },
    } as unknown as SupabaseClient;
    await expect(criarRemotoSupabase(cliente).baixar("u1")).rejects.toEqual(
      new ErroDeSincronizacao("rede"),
    );
  });
});
