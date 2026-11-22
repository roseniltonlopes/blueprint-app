import {
  nomeDeAgendaDoMes,
  type Atividade,
  type Compromisso,
  type DadosAgenda,
  type DiaDaSemana,
  type IconeAtividade,
} from "../domain/agenda";
import type { CategoriaId } from "../domain/categorias";
import { chaveDoDia } from "../domain/datas";

/**
 * SOMENTE DESENVOLVIMENTO. A agenda de novembro do caderno, aplicada ao mês de `agora`, para ver
 * a aba Agenda cheia. A interface só oferece isto quando __DEV__ é true. A linha de sábado de
 * manhã ("piscina, café, cortar cabelo") não tem horário no caderno e fica de fora.
 */
export function gerarAgendaDeExemplo(novoId: () => string, agora: Date): DadosAgenda {
  const ano = agora.getFullYear();
  const mes = agora.getMonth();
  const criadaEm = agora.toISOString();

  function atividade(
    nome: string,
    icone: IconeAtividade,
    categoria: CategoriaId | null,
  ): Atividade {
    return { id: novoId(), nome, icone, categoria, criadaEm };
  }

  const acordar = atividade("Acordar", "sol", null);
  const academia = atividade("Academia", "exercicio", "exercicio");
  const aula = atividade("Aula", "estudo", "estudo");
  const estudar = atividade("Estudar", "estudo", "estudo");
  const trabalho = atividade("Trabalho", "outro", null);
  const uber = atividade("Uber", "outro", null);
  const casa = atividade("Casa", "outro", null);
  const montese = atividade("Montese", "outro", null);
  const isabela = atividade("Isabela", "outro", null);
  const culto = atividade("Culto", "outro", null);

  function compromisso(
    de: Atividade,
    dias: DiaDaSemana[],
    inicio: string,
    fim: string | null,
  ): Compromisso {
    return { id: novoId(), atividadeId: de.id, dias, inicio, fim };
  }

  return {
    atividades: [acordar, academia, aula, estudar, trabalho, uber, casa, montese, isabela, culto],
    agendas: [
      {
        id: novoId(),
        nome: nomeDeAgendaDoMes(ano, mes),
        inicio: chaveDoDia(new Date(ano, mes, 1)),
        fim: chaveDoDia(new Date(ano, mes + 1, 0)),
        compromissos: [
          compromisso(acordar, [0, 1, 2, 3, 4, 5, 6], "04:30", null),
          compromisso(academia, [1, 2, 3, 4, 5], "05:00", "06:00"),
          compromisso(aula, [1, 2], "07:30", null),
          compromisso(aula, [1], "19:00", "21:00"),
          compromisso(trabalho, [1, 2, 4], "12:00", "18:00"),
          compromisso(trabalho, [3, 5], "09:00", "15:00"),
          compromisso(uber, [3], "15:30", "19:00"),
          compromisso(uber, [5], "15:30", "20:00"),
          compromisso(casa, [2, 3, 4], "20:00", null),
          compromisso(montese, [5], "20:00", "23:00"),
          compromisso(estudar, [6], "14:00", "17:00"),
          compromisso(isabela, [6], "19:00", null),
          compromisso(culto, [0], "08:00", "10:30"),
        ],
      },
    ],
    avulsos: [],
    registros: [],
  };
}
