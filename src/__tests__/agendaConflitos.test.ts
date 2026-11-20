import { compromissosEmConflito, type Compromisso, type DiaDaSemana } from "../domain/agenda";

function compromisso(
  id: string,
  dias: DiaDaSemana[],
  inicio: string,
  fim: string | null,
): Compromisso {
  return { id, atividadeId: "a", dias, inicio, fim };
}

describe("compromissosEmConflito", () => {
  it("marca os dois quando dividem um dia e os horários se sobrepõem", () => {
    const ids = compromissosEmConflito([
      compromisso("aula", [1, 2], "07:30", "09:00"),
      compromisso("trabalho", [2, 3], "08:00", "12:00"),
    ]);
    expect([...ids].sort()).toEqual(["aula", "trabalho"]);
  });

  it("ignora horários que se sobrepõem em dias diferentes", () => {
    const ids = compromissosEmConflito([
      compromisso("uber-qua", [3], "15:30", "19:00"),
      compromisso("uber-sex", [5], "15:30", "20:00"),
    ]);
    expect(ids.size).toBe(0);
  });

  it("encostar no término do outro não é conflito", () => {
    const ids = compromissosEmConflito([
      compromisso("academia", [1], "05:00", "06:00"),
      compromisso("aula", [1], "06:00", "07:00"),
    ]);
    expect(ids.size).toBe(0);
  });

  it("compromisso sem término conflita se cai dentro de outro", () => {
    const ids = compromissosEmConflito([
      compromisso("trabalho", [1], "12:00", "18:00"),
      compromisso("casa", [1], "15:00", null),
    ]);
    expect([...ids].sort()).toEqual(["casa", "trabalho"]);
  });

  it("lista vazia ou com um só compromisso não tem conflito", () => {
    expect(compromissosEmConflito([]).size).toBe(0);
    expect(compromissosEmConflito([compromisso("a", [0], "08:00", "09:00")]).size).toBe(0);
  });
});
