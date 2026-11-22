# Agenda semanal, alertas e histórico (design)

**Data:** 2026-11-15
**Situação:** aguardando aprovação
**Branch da etapa 1:** `feat/agenda-etapa-1-semana` (a partir de `develop`)
**Substitui parcialmente:** `2026-10-18-parte-1-plano-diario-design.md` (ver seção 8)

## 1. Por que mudar

A pessoa tem uma semana de horários fixos e diferentes a cada dia (academia às 5h, aula, trabalho, Uber, culto), escrita à mão em um caderno. Ela quer:

1. montar essa semana no celular e **editar quando mudar** (a agenda vale para novembro e pode mudar em dezembro);
2. receber **alertas** para não esquecer compromissos, incluindo o despertar às 4:30;
3. consultar o **histórico** de qualquer mês passado, por exemplo "quantas vezes fui à academia em janeiro", mesmo estando em dezembro;
4. ter o app **instalado por APK**, com os dados na nuvem (Supabase). (A camada de gamificação prevista aqui foi retirada pelo dono em 2026-11-21.)

O asterisco (`*`) do caderno marca um espaço livre onde se pode encaixar outra atividade. Não é prioridade nem alerta reforçado.

## 2. Objetivos, não objetivos e anti-objetivos

**Objetivos**
- Agenda semanal com compromissos que têm início e fim, repetem por dia da semana e podem mudar de um mês para outro sem apagar o passado.
- Registro de cada compromisso com 1 toque ("Feito" ou "Não fiz"), para que o histórico seja verdadeiro.
- Alertas locais confiáveis com o app fechado, em um APK Android.
- Painel de histórico por atividade e por mês.
- Dados no Supabase por usuário, com o app funcionando sem internet.

**Não objetivos**
- Compartilhar agenda com outras pessoas, widget, iOS e metas em dupla (fase futura).
- Compromissos que atravessam a meia-noite (fim sempre depois do início, no mesmo dia).
- Integração com Google Agenda.

**Anti-objetivos (falha mesmo que "funcione")**
- Reescrever o passado: editar a agenda de dezembro nunca pode mudar a contagem de novembro.
- Contar como "feito" algo que a pessoa não marcou.
- Alerta que não toca com o app fechado ou com a tela bloqueada.
- Perder a agenda por dado corrompido no aparelho.

## 3. Restrições

- Expo SDK 57, React Native 0.86, TypeScript estrito. Regras e tokens de `docs/04`. Português do Brasil, sem travessões.
- Alertas e APK: `expo-notifications` não pode ser validado no Expo Go. Testes de alerta usam o perfil `development` ou `preview` do `eas.json`. A documentação oficial da versão instalada é conferida antes da etapa 3.
- Supabase só entra na etapa 5. O SQL é escrito pelo assistente e **revisado e aplicado pelo dono** em um projeto de desenvolvimento. Nada é aplicado antes disso. A tabela `blueprint_actions` tem policies abertas (vulnerabilidade documentada em `docs/02`).
- Sem segredos no repositório. Só a chave `anon` no app, via `EXPO_PUBLIC_*`.
- Commits só depois de aprovação, push só com confirmação.

## 4. Abordagens consideradas

| | Abordagem | Resultado |
| :-: | :--- | :--- |
| **A** | **Agenda semanal com vigência.** Cada agenda cobre um período (por exemplo nov/2026) e tem seus compromissos. Em dezembro, duplica-se e edita-se. | **Escolhida.** Casa com "fixa em novembro, muda em dezembro" e preserva o histórico. |
| B | Molde único editável, sem vigência. | Descartada: editar em dezembro reescreve novembro. |
| C | Cada semana independente, com "copiar semana anterior". | Descartada: obriga a refazer a agenda toda semana. |

## 5. Modelo de dados

```ts
type DiaDaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

/** Catálogo: o que a pessoa faz ("Academia", "Aula"). Mantém a identidade entre meses. */
type Atividade = {
  id: string;        // UUID
  nome: string;      // 1 a 40 caracteres, único sem diferenciar maiúsculas e espaços nas pontas
  icone: IconeId;    // de um conjunto fixo
  categoria: CategoriaId | null; // hidratacao | exercicio | descanso | estudo | outro, as mesmas dos hábitos; null = sem categoria
  criadaEm: string;  // ISO 8601
};

/** Uma ocorrência semanal recorrente dentro de uma agenda. */
type Compromisso = {
  id: string;
  atividadeId: string;
  dias: DiaDaSemana[];  // pelo menos 1
  inicio: string;       // "HH:MM"
  fim: string | null;   // "HH:MM", depois de inicio; null para eventos pontuais (ex.: "20:00 casa")
  detalhe?: string;     // "Montese", "Uber", até 60 caracteres
  antecedenciaMin?: number; // 0 a 120; aviso antes do início. Gravado desde a etapa 1, usado na etapa 3
};

/** Período com seus compromissos. */
type Agenda = {
  id: string;
  nome: string;         // "Novembro de 2026"
  inicio: string;       // AAAA-MM-DD
  fim: string;          // AAAA-MM-DD, não antes de inicio
  compromissos: Compromisso[];
};

/** Compromisso de um único dia, fora das agendas (o espaço livre do caderno). */
type Avulso = {
  id: string;
  atividadeId: string;
  data: string;         // AAAA-MM-DD
  inicio: string;
  fim: string | null;
  detalhe?: string;
};

type DadosAgenda = {
  atividades: Atividade[];
  agendas: Agenda[];
  avulsos: Avulso[];
};
```

**Regras (funções puras, com testes)**
- Duas agendas não podem ter períodos que se sobreponham. Uma data pertence à agenda cujo período a contém; sem agenda, o dia aparece vazio com o convite "Montar agenda deste período".
- `inicio` e `fim` no formato `HH:MM` de 00:00 a 23:59, com `fim` depois de `inicio`.
- Compromissos do mesmo dia **podem** se sobrepor no horário (o caderno tem "Uber 15:30 a 19:00" e "casa 20:00"; sobreposição só gera um aviso visual, não bloqueia).
- Duplicar uma agenda copia os compromissos **mantendo o mesmo `atividadeId`** (novos ids de compromisso). É isso que faz "Academia" continuar sendo a mesma atividade em janeiro e em dezembro.
- Remover uma atividade do catálogo só é permitido se nenhum compromisso (de qualquer agenda) ou avulso a usar.
- Dados no aparelho: formato versionado, chave `blueprint:agenda`, validação ao carregar, itens inválidos descartados, conteúdo corrompido guardado à parte (mesmo padrão de `AcoesRepository`). Ids são UUID e cada entidade terá `atualizadoEm` na etapa 5 para a sincronização.
- A etapa 2 grava cada registro "Feito" com uma **cópia** do nome da atividade, do horário e da data. Assim editar a agenda depois não altera o passado.

## 6. Etapas

| # | Etapa | Entrega testável |
| :-: | :--- | :--- |
| 1 | **Agenda semanal** (este documento, seção 7) | Ver a semana, criar, editar, remover, duplicar para o mês seguinte |
| 2 | **Registro Feito / Não fiz**, Home com os compromissos de hoje, e "Feito" gerando a ação da categoria (seção 8) | Tocar em Feito e ver o dia e o anel da Home andarem; Desfazer |
| 3 | **Alertas locais**: despertar às 4:30, antecedência por compromisso, botão Feito na notificação, permissões Android (notificações, alarme exato, economia de bateria) | Receber o alerta com o app fechado, em APK ou development build |
| 4 | **Painel de histórico**: contagem por atividade e por mês, comparação entre meses, detalhe dos dias | "Quantas vezes fui à academia em novembro" |
| 5 | **Supabase**: login, migração com acesso por usuário (RLS), sincronização offline-first, subida dos dados locais | Entrar em outro aparelho e ver o mesmo histórico |
| 6 | ~~Gamificação e ganhos visuais~~ | Retirada do plano pelo dono em 2026-11-21 |
| 7 | **APK de release**: checklist de segurança e build | Instalar o `.apk` final |

As etapas 1 a 4 funcionam só no aparelho. **O Supabase só é necessário na etapa 5**, e o assistente avisa antes de começar.

## 7. Etapa 1 em detalhe

### 7.1 Telas

**Aba "Agenda"** (nova, entre "Hoje" e "Calendário"; a barra passa a ter 5 abas). Mostra uma semana por vez, domingo a sábado, com setas para navegar entre semanas e o nome da agenda da semana ("Novembro de 2026").

```
Agenda                       < 9 a 15 de novembro >
Novembro de 2026                          [Editar]

Seg 9
 05:00 a 06:00  Academia
 07:30          Aula
 12:00 a 18:00  Trabalho
 19:00 a 21:00  Aula
 + Adicionar
Ter 10
 05:00 a 06:00  Academia
 ...
```

- Cada dia é um cartão com os compromissos em ordem de horário e, ao final, **"+ Adicionar"** (o espaço livre do caderno). Os avulsos aparecem na mesma lista, com uma marca de "só neste dia".
- Tocar em um compromisso abre a edição. Tocar em "+ Adicionar" abre o formulário já com o dia.
- Dia de hoje destacado. Semana sem agenda: convite para montar.

**Formulário de compromisso** (criar e editar)
- Atividade: lista do catálogo agrupada por categoria, com busca, mais "Nova atividade" (nome, ícone e categoria opcional, com as 5 categorias dos hábitos).
- Dias da semana: 7 botões, múltipla escolha.
- Início e fim: seletor de horário; "Sem horário de término" para eventos pontuais.
- Detalhe (opcional).
- Repetição: "Toda semana" (padrão, entra na agenda do período) ou "Só neste dia" (vira um avulso). O "+ Adicionar" abre o formulário com o dia já marcado.
- Editar ou remover um compromisso recorrente de uma agenda **em curso** (que já tem dias passados) pergunta: **"A partir de hoje"** (padrão) ou **"O período todo"**. "A partir de hoje" divide a agenda: a original termina ontem, e uma nova começa hoje com a alteração e o mesmo nome acrescido do período. Assim os dias passados nunca mudam. "O período todo" só serve para corrigir um erro de digitação e mostra um aviso. Agenda que ainda não começou é editada direto. Remover pede confirmação.
- O despertar das 4:30 é um compromisso comum (atividade "Acordar", sem horário de término), criado pela pessoa. A etapa 3 não cria entidade própria para ele.

**Gerenciar agendas** (botão "Editar" no cabeçalho): lista de períodos, criar agenda com nome e datas, editar datas, **"Duplicar para o próximo mês"** e remover agenda (confirmação; remove só os compromissos, o histórico da etapa 2 em diante é preservado pelas cópias gravadas nos registros).

**Duplicar:** o destino é sempre o **mês de calendário inteiro seguinte ao `fim` da agenda de origem**, mesmo que a origem não seja um mês fechado. Se já existir agenda sobrepondo esse mês, a ação é bloqueada com a mensagem "Já existe agenda neste período" e o atalho para abri-la.

**Semana que cruza duas agendas:** o cabeçalho mostra o nome da agenda do dia de hoje (ou do primeiro dia da semana, ao navegar), e cada cartão de dia mostra o nome da agenda quando ele muda em relação ao dia anterior.

**Primeiro acesso:** sem agenda, a aba Agenda oferece "Montar a agenda de {mês atual}" com o período do mês pré-preenchido e "Começar em branco".

### 7.2 Arquitetura

| Arquivo | Responsabilidade |
| :--- | :--- |
| `src/domain/agenda.ts` | Tipos, validações, agenda de uma data, compromissos do dia (recorrentes + avulsos, ordenados), sobreposição de períodos, duplicar agenda, dividir agenda em curso e conflito de horário |
| `src/data/AgendaRepository.ts` | Persistência versionada com AsyncStorage, validação ao carregar, cópia de conteúdo corrompido |
| `src/hooks/useAgenda.tsx` | Provider e hook: dados, criar, editar, remover, duplicar |
| `src/screens/AgendaScreen.tsx` | Aba Agenda (semana) |
| `src/screens/CompromissoScreen.tsx` | Formulário de compromisso |
| `src/screens/AgendasScreen.tsx` | Gerenciar agendas |
| `src/components/DiaDaAgenda.tsx`, `LinhaCompromisso.tsx`, `SeletorDeHorario.tsx`, `SeletorDeDias.tsx` | Componentes |
| `src/navigation/Raiz.tsx` | Pilha raiz: Abas, Compromisso, Agendas |

Reaproveita `theme.ts`, `Card`, `Text`, `Screen`, `SegmentedControl`, `Icon` e as funções de `src/domain/datas.ts` (`inicioDaSemana`, `diasDaSemana`, `formatarIntervalo`). Dependências novas: `@react-navigation/native-stack` e `@react-native-community/datetimepicker`, ambas instaladas com `npx expo install`.

### 7.3 Dados de exemplo e visualização local

- A agenda de novembro do caderno entra como **dados de exemplo apenas em modo de desenvolvimento** (`__DEV__`, no mesmo padrão de `src/dev/dadosDeExemplo.ts`), com um botão para carregar. Nenhum dado pessoal é embutido no app de produção.
- Para ver o app rodando sem celular, a etapa instala `react-native-web`, `react-dom` e `@expo/metro-runtime` como dependências de desenvolvimento e usa `expo start --web` com capturas de tela (Playwright). A conferência final continua sendo no celular, com o Expo Go (nesta etapa não há notificações).

### 7.4 Erros e casos de borda

- Agenda corrompida no disco: o app abre com agenda vazia e guarda a cópia à parte.
- Data fora de qualquer agenda: dia vazio com convite, sem erro.
- Dia da semana sem compromissos: texto "Nada marcado" e o "+ Adicionar".
- **Fuso:** até a etapa 5, "hoje", o início da semana e os horários dos alertas e registros seguem o **relógio do aparelho** (regra já vigente em `src/domain/datas.ts`). As funções de `agenda.ts` recebem a data como `Date` e não conhecem fuso. Quando o Supabase entrar, os registros passam a guardar também o fuso IANA do aparelho (`fusoDoAparelho()`), sem mudar a agenda.
- Troca de horário de verão e virada de dia com o app aberto: usa as funções de data existentes (calendário local).
- **Dia passado sem registro:** não vira "Não fiz" automaticamente. O painel da etapa 4 mostra "feitas" como número principal e, ao lado, "sem registro" para o que estava planejado e não foi marcado. A porcentagem usa as agendas vigentes em cada dia (por isso a divisão "a partir de hoje" existe).
- Falha ao gravar: aviso no console de desenvolvimento, estado mantido em memória (mesmo padrão das ações).

### 7.5 Testes

- **Domínio:** validação de cada regra (inclusive categoria opcional da atividade), agenda de uma data (dentro, fora, borda do período), sobreposição de períodos, compromissos do dia (ordem, avulsos, sobreposição de horário), duplicação mantendo `atividadeId`, bloqueio de remoção de atividade em uso.
- **Repositório:** ida e volta, corrompido, versão desconhecida, itens inválidos descartados.
- **Telas:** semana com agenda de exemplo, criar compromisso recorrente e avulso, editar com aviso, remover com confirmação, duplicar para o próximo mês, semana sem agenda.
- **Checklist manual no Expo Go** ao fim da etapa.

## 8. Relação com a especificação anterior (Parte 1, plano diário)

- A **agenda** passa a ser o núcleo do planejamento. As telas "Monte seu dia", "Seu dia" e "Meu plano" da Parte 1 **não serão implementadas** como estão.
- Os **hábitos de 1 toque** da Home (hidratação, exercício etc.) continuam como hoje.
- Lembretes (Parte 2) da especificação anterior são absorvidos pela etapa 3 deste documento. As conquistas (Parte 3) foram retiradas junto com a etapa 6.
- A especificação antiga recebe uma nota de substituição no topo.
- **A categoria agrupa, a atividade detalha** (decidido pelo dono): "Exercício" é uma categoria dos hábitos, e "Academia", "Corrida", "Futebol" e "Caminhada" são atividades dentro dela. Cada atividade escolhe uma categoria (ou nenhuma). Sugestões iniciais: Academia, Corrida, Futebol, Caminhada em Exercício; Aula e Estudar em Estudo; Trabalho, Uber, Culto e outras ficam sem categoria até a pessoa escolher.
- **Efeito na etapa 2 (decisão minha, a confirmar):** marcar "Feito" em um compromisso de atividade **com categoria** também grava uma ação daquela categoria (com o rótulo da atividade), então Home, Calendário e Histórico de hábitos continuam coerentes sem toque duplo. "Desfazer" remove as duas. Atividades sem categoria só aparecem na agenda e no painel de compromissos.
- Continuam dois repositórios (`AcoesRepository` e `AgendaRepository`), ligados pelo registro. A aba **Histórico** ganha, na etapa 4, o painel de compromissos agrupado por categoria, com o detalhe por atividade (por exemplo "Exercício: 22 vezes, Academia 18, Corrida 4"). A aba **Calendário** continua mostrando hábitos até a etapa 4. A aba Agenda é nova e não substitui nenhuma.

## 9. Documentação

- `README.md` reescrito com esta proposta (junto com este documento).
- `docs/05-funcionalidades-e-fluxos.md`: novas funções para agenda, registro, alertas e painel, com critérios de aceite, ao fim de cada etapa.
- `docs/03-guia-telas-figma.md`: telas novas, ao fim de cada etapa. Não há pranchas no canvas para elas.

## 10. Em aberto para o construtor

- Conjunto de ícones e cores das atividades (partir dos ícones existentes em `src/ui/Icon.tsx`).
- Textos exatos de mensagens de erro e de confirmação.
- Detalhes de acessibilidade (rótulos, alvo de toque mínimo de 44).
