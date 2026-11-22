import {
  ERRO_EMAIL,
  ERRO_SENHA_CURTA,
  ERRO_SENHA_LONGA,
  ERRO_SENHA_SEM_LETRA_E_NUMERO,
  formularioValido,
  normalizarEmail,
  validarEmail,
  validarFormularioDeConta,
  validarSenha,
} from "../domain/conta";

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

  it("criar conta valida e-mail e tamanho da senha", () => {
    const erros = validarFormularioDeConta("criar", { email: "ana", senha: "curta" });
    expect(erros).toEqual({ email: ERRO_EMAIL, senha: ERRO_SENHA_CURTA });
    expect(formularioValido(erros)).toBe(false);
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
