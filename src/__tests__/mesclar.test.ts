import { chaveEstavel, iguais, mesclar } from "../sincronizacao/mesclar";

type Item = { nome: string; extra?: number };

const mapa = (entradas: Record<string, Item>) => new Map(Object.entries(entradas));
const v = (nome: string): Item => ({ nome });

describe("chaveEstavel e iguais", () => {
  it("não depende da ordem das chaves e ignora campos undefined", () => {
    expect(chaveEstavel({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe(
      chaveEstavel({ a: [2, { c: 4, d: 3 }], b: 1 }),
    );
    expect(iguais({ nome: "a", extra: undefined }, { nome: "a" })).toBe(true);
    expect(iguais({ nome: "a" }, { nome: "b" })).toBe(false);
    expect(iguais([1, 2], [2, 1])).toBe(false);
  });
});

describe("mesclar com base (sincronizações seguintes)", () => {
  const base = mapa({ x: v("x"), y: v("y") });

  it("só no local e fora da base: criado aqui, enviar", () => {
    const r = mesclar(base, mapa({ x: v("x"), y: v("y"), novo: v("n") }), base);
    expect(r.enviar).toEqual(["novo"]);
    expect(r.resultado.get("novo")).toEqual(v("n"));
  });

  it("só no remoto e fora da base: criado em outro aparelho, trazer", () => {
    const r = mesclar(base, base, mapa({ x: v("x"), y: v("y"), la: v("l") }));
    expect(r.trazer).toEqual(["la"]);
    expect(r.resultado.has("la")).toBe(true);
  });

  it("na base e sumiu do local: apagar no servidor", () => {
    const r = mesclar(base, mapa({ x: v("x") }), base);
    expect(r.apagarNoServidor).toEqual(["y"]);
    expect(r.resultado.has("y")).toBe(false);
  });

  it("apagado aqui e alterado lá: no conflito vale o local (apaga)", () => {
    const r = mesclar(base, mapa({ x: v("x") }), mapa({ x: v("x"), y: v("y2") }));
    expect(r.apagarNoServidor).toEqual(["y"]);
    expect(r.resultado.has("y")).toBe(false);
  });

  it("na base e sumiu do remoto: apagar aqui", () => {
    const r = mesclar(base, base, mapa({ x: v("x") }));
    expect(r.apagarLocal).toEqual(["y"]);
    expect(r.resultado.has("y")).toBe(false);
  });

  it("apagado lá e alterado aqui: a edição local vence e volta para a nuvem", () => {
    const r = mesclar(base, mapa({ x: v("x"), y: v("y2") }), mapa({ x: v("x") }));
    expect(r.enviar).toEqual(["y"]);
    expect(r.resultado.get("y")).toEqual(v("y2"));
  });

  it("apagado dos dois lados: some sem nenhuma escrita", () => {
    const r = mesclar(base, mapa({ x: v("x") }), mapa({ x: v("x") }));
    expect(r.resultado.has("y")).toBe(false);
    expect(r.enviar).toEqual([]);
    expect(r.apagarLocal).toEqual([]);
    expect(r.apagarNoServidor).toEqual([]);
  });

  it("só o local mudou: vale o local", () => {
    const r = mesclar(base, mapa({ x: v("x2"), y: v("y") }), base);
    expect(r.resultado.get("x")).toEqual(v("x2"));
    expect(r.enviar).toEqual(["x"]);
  });

  it("só o remoto mudou: vale o remoto", () => {
    const r = mesclar(base, base, mapa({ x: v("x3"), y: v("y") }));
    expect(r.resultado.get("x")).toEqual(v("x3"));
    expect(r.trazer).toEqual(["x"]);
  });

  it("os dois mudaram: vale o local", () => {
    const r = mesclar(base, mapa({ x: v("aqui"), y: v("y") }), mapa({ x: v("la"), y: v("y") }));
    expect(r.resultado.get("x")).toEqual(v("aqui"));
    expect(r.enviar).toEqual(["x"]);
  });

  it("os dois mudaram para o mesmo conteúdo: nada a fazer", () => {
    const r = mesclar(base, mapa({ x: v("z"), y: v("y") }), mapa({ x: v("z"), y: v("y") }));
    expect(r.enviar).toEqual([]);
    expect(r.trazer).toEqual([]);
  });

  it("com conflito remoto (ações), os dois mudaram: vale o remoto", () => {
    const r = mesclar(base, mapa({ x: v("aqui"), y: v("y") }), mapa({ x: v("la"), y: v("y") }), {
      conflito: "remoto",
    });
    expect(r.resultado.get("x")).toEqual(v("la"));
  });
});

describe("mesclar sem base (primeira sincronização)", () => {
  it("faz a união, o conflito vale o local e nada é apagado", () => {
    const r = mesclar(null, mapa({ a: v("a"), c: v("aqui") }), mapa({ b: v("b"), c: v("la") }));
    expect([...r.resultado.keys()].sort()).toEqual(["a", "b", "c"]);
    expect(r.resultado.get("c")).toEqual(v("aqui"));
    expect(r.enviar.sort()).toEqual(["a", "c"]);
    expect(r.trazer).toEqual(["b"]);
    expect(r.apagarLocal).toEqual([]);
    expect(r.apagarNoServidor).toEqual([]);
  });

  it("com conflito remoto, fica o remoto", () => {
    const r = mesclar(null, mapa({ c: v("aqui") }), mapa({ c: v("la") }), { conflito: "remoto" });
    expect(r.resultado.get("c")).toEqual(v("la"));
  });
});
