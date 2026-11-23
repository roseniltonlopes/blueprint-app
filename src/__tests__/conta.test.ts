import {
  ERRO_EMAIL,
  ERRO_NASCIMENTO_FORMATO,
  ERRO_NASCIMENTO_FUTURA,
  ERRO_NASCIMENTO_IDADE_MAXIMA,
  ERRO_NASCIMENTO_IDADE_MINIMA,
  ERRO_NASCIMENTO_INVALIDA,
  ERRO_SENHA_CURTA,
  ERRO_SENHA_LONGA,
  ERRO_SENHA_SEM_LETRA_E_NUMERO,
  formularioValido,
  idadeEm,
  mascararData,
  nascimentoParaIso,
  normalizarEmail,
  validarEmail,
  validarFormularioDeConta,
  validarNascimento,
  validarSenha,
} from "../domain/conta";
import { primeiroNome } from "../domain/perfil";

const HOJE = new Date(2026, 10, 23, 10, 0);

describe("validação da conta", () => {
  it("aceita e-mails comuns e normaliza espaços e maiúsculas", () => {
    expect(validarEmail("nome@exemplo.com")).toBeNull();
    expect(validarEmail("  Nome.Sobrenome+tag@sub.exemplo.com.br ")).toBeNull();
    expect(normalizarEmail("  Ana@Exemplo.COM ")).toBe("ana@exemplo.com");
  });

  it("recusa e-mails sem formato válido", () => {
    for (const email of ["", "ana", "ana@", "@exemplo.com", "ana@exemplo", "ana @x.com", "a@b.c"]) {
      expect(validarEmail(email)).toBe(ERRO_EMAIL);
    }
  });

  it("senha com 8 a 72 caracteres, letras e números (regra do Supabase Auth)", () => {
    expect(validarSenha("abc1234")).toBe(ERRO_SENHA_CURTA);
    expect(validarSenha("abcd1234")).toBeNull();
    expect(validarSenha("Senha forte 9")).toBeNull();
    expect(validarSenha("12345678")).toBe(ERRO_SENHA_SEM_LETRA_E_NUMERO);
    expect(validarSenha("abcdefgh")).toBe(ERRO_SENHA_SEM_LETRA_E_NUMERO);
    // Letra acentuada não conta como letra para o Supabase.
    expect(validarSenha("çãéíóú12")).toBe(ERRO_SENHA_SEM_LETRA_E_NUMERO);
    expect(validarSenha("x".repeat(73))).toBe(ERRO_SENHA_LONGA);
  });

  it("criar conta pede nome, data de nascimento, e-mail e senha", () => {
    const erros = validarFormularioDeConta("criar", { email: "ana", senha: "curta" }, HOJE);
    expect(erros).toEqual({
      email: ERRO_EMAIL,
      senha: ERRO_SENHA_CURTA,
      nome: "Digite o seu nome",
      nascimento: ERRO_NASCIMENTO_FORMATO,
    });
    expect(formularioValido(erros)).toBe(false);

    const certos = validarFormularioDeConta(
      "criar",
      { nome: "  Ana  ", nascimento: "03/12/1990", email: "ana@x.com", senha: "senha123" },
      HOJE,
    );
    expect(certos).toEqual({});
    expect(formularioValido(certos)).toBe(true);
  });

  it("entrar só exige a senha preenchida (o servidor confere)", () => {
    expect(validarFormularioDeConta("entrar", { email: "ana@x.com", senha: "" })).toEqual({
      senha: "Digite a sua senha",
    });
    expect(
      formularioValido(validarFormularioDeConta("entrar", { email: "ana@x.com", senha: "curta" })),
    ).toBe(true);
  });

  it("recuperar a senha só olha o e-mail", () => {
    expect(validarFormularioDeConta("recuperar", { email: "ana@x.com", senha: "" })).toEqual({});
  });
});

describe("data de nascimento", () => {
  it("coloca as barras enquanto a pessoa digita", () => {
    expect(mascararData("0")).toBe("0");
    expect(mascararData("031")).toBe("03/1");
    expect(mascararData("03121")).toBe("03/12/1");
    expect(mascararData("031219901234")).toBe("03/12/1990");
    expect(mascararData("03/12/1990")).toBe("03/12/1990");
  });

  it("recusa formato incompleto e datas que não existem", () => {
    expect(validarNascimento("3/12/1990", HOJE)).toBe(ERRO_NASCIMENTO_FORMATO);
    expect(validarNascimento("31/02/2000", HOJE)).toBe(ERRO_NASCIMENTO_INVALIDA);
    expect(validarNascimento("29/02/2001", HOJE)).toBe(ERRO_NASCIMENTO_INVALIDA);
    expect(validarNascimento("29/02/2000", HOJE)).toBeNull();
  });

  it("não aceita data futura e pede de 13 a 120 anos", () => {
    expect(validarNascimento("24/11/2026", HOJE)).toBe(ERRO_NASCIMENTO_FUTURA);
    // Faz 13 anos hoje: pode. Faz amanhã: ainda não.
    expect(validarNascimento("23/11/2013", HOJE)).toBeNull();
    expect(validarNascimento("24/11/2013", HOJE)).toBe(ERRO_NASCIMENTO_IDADE_MINIMA);
    expect(validarNascimento("01/01/1900", HOJE)).toBe(ERRO_NASCIMENTO_IDADE_MAXIMA);
  });

  it("calcula a idade pelo aniversário", () => {
    expect(idadeEm({ dia: 23, mes: 11, ano: 1990 }, HOJE)).toBe(36);
    expect(idadeEm({ dia: 24, mes: 11, ano: 1990 }, HOJE)).toBe(35);
  });

  it("converte para o formato do banco", () => {
    expect(nascimentoParaIso("03/12/1990")).toBe("1990-12-03");
    expect(nascimentoParaIso("31/02/1990")).toBeNull();
  });
});

describe("primeiro nome", () => {
  it("usa a primeira palavra do nome para a saudação", () => {
    expect(primeiroNome({ nome: "Ana Souza" })).toBe("Ana");
    expect(primeiroNome({ nome: "  Bia   Lima " })).toBe("Bia");
    expect(primeiroNome({ nome: "" })).toBe("");
  });
});
