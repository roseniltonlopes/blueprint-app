import { gerarIdDeTeste, nova } from "./utils";
import {
  ESTADO_INICIAL,
  acoesDoDia,
  acoesReducer,
  contarPorCategoria,
  criarAcao,
  mensagemDeProgresso,
  normalizarRotulo,
  type Acao,
} from "../domain/acoes";
import { nomeDaCategoria } from "../domain/categorias";
import { chaveDoDia, formatarDataCabecalho, formatarHora } from "../domain/datas";

const HOJE = new Date(2026, 9, 17, 15, 58);
const ONTEM_23H59 = new Date(2026, 9, 16, 23, 59);
const HOJE_00H00 = new Date(2026, 9, 17, 0, 0);

function acao(categoria: Acao["categoria"], quando: Date): Acao {
  return nova(categoria, quando);
}

describe("datas", () => {
  it("formata o cabeçalho e a hora como no design", () => {
    expect(formatarDataCabecalho(HOJE)).toBe("Sábado, 17 de outubro");
    expect(formatarHora(HOJE)).toBe("15:58");
    expect(formatarHora(new Date(2026, 0, 1, 7, 5))).toBe("07:05");
  });

  it("separa dias na virada da meia-noite", () => {
    expect(chaveDoDia(ONTEM_23H59)).toBe("2026-10-16");
    expect(chaveDoDia(HOJE_00H00)).toBe("2026-10-17");
  });
});

describe("contagens", () => {
  const acoes = [
    acao("hidratacao", ONTEM_23H59),
    acao("hidratacao", HOJE_00H00),
    acao("hidratacao", HOJE),
    acao("estudo", HOJE),
  ];

  it("filtra só as ações do dia", () => {
    expect(acoesDoDia(acoes, chaveDoDia(HOJE))).toHaveLength(3);
  });

  it("conta por categoria, com zero nas que não têm registro", () => {
    expect(contarPorCategoria(acoesDoDia(acoes, chaveDoDia(HOJE)))).toEqual({
      hidratacao: 2,
      exercicio: 0,
      descanso: 0,
      estudo: 1,
      outro: 0,
    });
  });
});

describe("mensagemDeProgresso", () => {
  it.each([
    [0, "Toque em uma categoria para começar o plano."],
    [3, "Faltam 2 para fechar o dia."],
    [4, "Falta 1 para fechar o dia."],
    [5, "Meta do dia concluída."],
    [6, "Meta do dia concluída."],
  ])("%i de 5 → %s", (total, esperado) => {
    expect(mensagemDeProgresso(total, 5)).toBe(esperado);
  });
});

describe("reducer", () => {
  it("registra e remove ações", () => {
    const a = acao("descanso", HOJE);
    const comAcao = acoesReducer(ESTADO_INICIAL, { tipo: "registrar", acao: a });
    expect(comAcao.acoes).toEqual([a]);
    expect(acoesReducer(comAcao, { tipo: "remover", id: a.id }).acoes).toEqual([]);
  });

  it("ignora o mesmo id registrado duas vezes", () => {
    const a = acao("descanso", HOJE);
    const uma = acoesReducer(ESTADO_INICIAL, { tipo: "registrar", acao: a });
    expect(acoesReducer(uma, { tipo: "registrar", acao: a })).toBe(uma);
  });

  it("gera ids diferentes no mesmo milissegundo", () => {
    expect(acao("estudo", HOJE).id).not.toBe(acao("estudo", HOJE).id);
  });
});

describe("rótulo do Outro", () => {
  it("aceita de 1 a 40 caracteres após remover espaços", () => {
    expect(normalizarRotulo("  meditação  ")).toBe("meditação");
    expect(normalizarRotulo("   ")).toBeNull();
    expect(normalizarRotulo("x".repeat(40))).toHaveLength(40);
    expect(normalizarRotulo("x".repeat(41))).toBeNull();
  });

  it("recusa criar Outro com rótulo inválido", () => {
    expect(() => criarAcao("outro", HOJE, " ", gerarIdDeTeste)).toThrow("1 a 40 caracteres");
    expect(criarAcao("outro", HOJE, " Alongamento ", gerarIdDeTeste).rotulo).toBe("Alongamento");
  });
});

describe("categorias", () => {
  it("devolve o nome de exibição", () => {
    expect(nomeDaCategoria("hidratacao")).toBe("Hidratação");
  });
});
