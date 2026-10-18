# Parte 1: Plano diário (design)

**Data:** 2026-10-18
**Situação:** aprovado em conversa; aguarda revisão desta especificação
**Branch:** `feat/parte-1-plano` (a partir de `develop`, estado da Etapa 6)

## 1. Por que mudar

O Blueprint hoje só registra o que a pessoa já fez. Ninguém lembra de abrir um app para marcar algo que não planejou. A nova proposta é **planejar, ser lembrado, registrar com 1 toque e acompanhar**.

Esta especificação cobre a **Parte 1 (Plano)**, a fundação das outras:

| Parte | Conteúdo | Situação |
| :-: | :--- | :--- |
| 1 | Plano base, "Monte seu dia", Home "Plano de hoje", versão mínima, ajuste do dia, editar o plano | **Esta especificação** |
| 2 | Lembretes (notificações locais, só do que falta, silêncio, "Feito" na notificação, fechamento do dia) | Depois |
| 3 | Sequência com folga, comemorações e conquistas, revisão semanal | Depois |
| 4 | Widget e metas em dupla | Fase 2 |
| Etapa 7 | Login e sincronização com Supabase | Pausada em `feat/etapa-7-supabase-login` |

Referência de mercado: o Habit Tracker (nota 4,9) é elogiado por lembretes e metas com quantidade, e criticado por limitar a 5 hábitos no plano gratuito, por perder hábitos (bugs), por não deixar desmarcar e por não ter português. O Blueprint responde a cada ponto: sem limite artificial, dados no aparelho com versão e migração, Desfazer, e tudo em português.

## 2. Escopo

**Dentro da Parte 1**
- Modelo de **atividade do plano** e de **ajuste do dia**, com regras puras e testadas.
- Fluxo **"Monte seu dia"** no primeiro acesso, que pode ser pulado.
- **Home** com o cartão de progresso do plano e a lista **"Plano de hoje"**, em que 1 toque registra a atividade.
- **"Seu dia"**: tela para ajustar só o dia de hoje (pular atividade, acrescentar uma atividade só de hoje).
- **"Meu plano"** no Perfil: criar, editar e remover atividades.
- Persistência local do plano (AsyncStorage), no mesmo padrão das ações (versão, migração e dados corrompidos guardados à parte).
- Campos de lembrete no formulário da atividade, **salvos mas ainda não usados**. As notificações são a Parte 2.

**Fora da Parte 1**
- Notificações, lembrete da manhã, permissões (Parte 2).
- Sequência com folga, conquistas, revisão semanal (Parte 3).
- Plano no Supabase (entra quando a Etapa 7 for retomada, numa migração 003).

## 3. Modelo de dados

### 3.1 Atividade do plano

```ts
type DiaDaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

type QuandoLembrar =
  | { tipo: "horarios"; horas: string[] }           // "HH:MM", de 1 a 8 horários
  | { tipo: "intervalo"; inicio: string; fim: string; cadaMinutos: number } // 30 a 240
  | { tipo: "livre" };                              // sem horário

type Atividade = {
  id: string;              // UUID
  categoria: CategoriaId;  // hidratacao | exercicio | descanso | estudo | outro
  rotulo?: string;         // obrigatório para "outro" (1 a 40 caracteres)
  meta: number;            // quantidade por dia, 1 a 20
  minimo: number;          // versão mínima, 1 a meta
  dias: DiaDaSemana[];     // pelo menos 1 dia
  quando: QuandoLembrar;
  criadaEm: string;        // ISO 8601
};
```

**Regras de validação** (função pura `validarAtividade`, mensagens em português):
- `meta` inteiro de 1 a 20; `minimo` inteiro de 1 a `meta`.
- `dias` com pelo menos 1 dia e sem repetição.
- Horários no formato `HH:MM` de 00:00 a 23:59; em `horarios`, de 1 a 8, sem repetição, guardados em ordem.
- Em `intervalo`, `inicio` antes de `fim` e `cadaMinutos` de 30 a 240.
- Categorias fixas: **no máximo uma atividade por categoria** no plano, para que um registro conte para uma única atividade sem ambiguidade.
- "Outro": pode haver várias, cada uma com `rotulo` diferente (comparação sem diferenciar maiúsculas e sem espaços nas pontas).
- Não há limite de quantidade de atividades no plano.

### 3.2 Ajuste do dia

```ts
type AjusteDoDia = {
  puladas: string[];        // ids de atividades do plano que não valem hoje
  extras: Atividade[];      // atividades só deste dia (quando = livre)
};

type Plano = {
  atividades: Atividade[];
  ajustes: Record<string, AjusteDoDia>; // chave AAAA-MM-DD
  /** false até concluir ou pular o "Monte seu dia" */
  apresentado: boolean;
};
```

Ajustes com mais de 14 dias são descartados ao carregar.

### 3.3 Como o registro conta para o plano

- **As ações não mudam** (mesmo tipo `Acao`, mesma persistência, mesmo histórico e calendário).
- Uma ação de hoje conta para a atividade de hoje com a **mesma categoria**. Para "outro", também precisa ter o **mesmo rótulo** (sem diferenciar maiúsculas).
- Ação sem atividade correspondente continua contando no histórico e no calendário, mas não no progresso do plano.

### 3.4 Plano de hoje e progresso (funções puras)

- `planoDoDia(plano, data)`: atividades cujo `dias` inclui o dia da semana, menos as `puladas`, mais as `extras` daquele dia.
- Para cada atividade do dia: `feitas`, e `situacao` igual a `pendente` (feitas < minimo), `minimo` (minimo ≤ feitas < meta) ou `completa` (feitas ≥ meta).
- Progresso do dia: `concluidas` (atividades completas) de `total` (atividades do dia).
- O anel passa a ter **um segmento por atividade do dia**: cheio quando completa e preenchido pela metade quando o mínimo foi atingido. O centro mostra `concluidas de total`.
- **Sem plano para hoje** (nenhuma atividade ou plano vazio): a Home funciona como hoje, com meta de 5 ações, e mostra um convite para montar o plano.

## 4. Telas e fluxos

As telas novas usam os tokens e componentes existentes (`theme.ts`, `Card`, `Text`, `SegmentedControl`, `BotaoAcao`, `Campo`). **Não existem pranchas no canvas para elas**; ao final, exportamos imagens para revisão e, se você quiser, atualizamos o canvas.

### 4.1 "Monte seu dia" (primeiro acesso)

Aparece quando `plano.apresentado` é falso. São 4 passos, com indicador de progresso e "Pular" em todos:

1. **Boas-vindas:** "Vamos montar seu dia". Uma frase sobre o que vem: plano, lembretes e registro com 1 toque. Botões **Começar** e **Pular**.
2. **O que você quer fazer:** cartões das 4 categorias e "Outro" (com nome e sugestões). Escolha múltipla.
3. **Como fica cada uma:** um cartão por atividade escolhida, com:
   - quantidade por dia e mínimo (botões − e +);
   - dias da semana (7 botões; padrão: todos);
   - quando lembrar: **Horários** (lista de horários), **Intervalo** (das, até, a cada) ou **Sem horário**.
   - Os valores já vêm sugeridos (tabela abaixo).
4. **Pronto:** resumo do plano e **Concluir**.

Ao concluir ou pular, `apresentado` vira verdadeiro. Pular mantém o plano vazio.

| Categoria | Meta | Mínimo | Quando (sugestão) |
| :--- | :-: | :-: | :--- |
| Hidratação | 8 | 2 | Intervalo, 9:00 às 21:00, a cada 2 h |
| Exercício | 1 | 1 | Horários: 18:00 |
| Descanso | 1 | 1 | Horários: 22:00 |
| Estudo | 1 | 1 | Horários: 19:00 |
| Outro | 1 | 1 | Sem horário |

**Seletor de horário:** `@react-native-community/datetimepicker` (compatível com Expo Go), instalado com `npx expo install`.

### 4.2 Home

Ordem de cima para baixo:
1. Cabeçalho (data, saudação, chave de tema), como hoje.
2. **Cartão de progresso** com o anel do plano e a mensagem (ex.: "2 de 4 do seu plano. Falta Água e Estudo."). Sem plano, mantém o texto atual.
3. **"Plano de hoje"** com o link **"Ajustar"** (abre "Seu dia"). Uma linha por atividade: ícone, nome, `feitas/meta`, selo de "mínimo" ou "completa". **Tocar na linha registra 1 ação** daquela atividade, com o toast e o Desfazer atuais.
4. **"Fora do plano"** (título novo para a grade atual "O que você fez agora?"): a grade de categorias e o botão principal continuam iguais, para registrar algo que não estava no plano.

Sem plano: no lugar da lista aparece um cartão **"Monte seu dia"** que abre o fluxo 4.1.

### 4.3 "Seu dia" (ajuste só de hoje)

- Lista das atividades do plano para hoje, cada uma com a chave **"Hoje"** (ligada por padrão). Desligar põe o id em `puladas`.
- **"Acrescentar só hoje"**: escolhe categoria ou "Outro" com nome, e quantidade. Vira uma `extra` do dia. Vale a mesma regra do plano: uma categoria fixa que já está no plano de hoje não pode ser acrescentada de novo (a pessoa ajusta a existente), e um "Outro" extra precisa de nome diferente dos "Outro" do dia.
- As mudanças valem só para a data de hoje. O plano base não muda.

### 4.4 "Meu plano" (Perfil)

- Nova linha **"Meu plano"** no Perfil, que abre a lista de atividades.
- Cada atividade abre o **mesmo formulário do passo 3**, com **Salvar** e **Remover** (com confirmação).
- **"Nova atividade"** abre o formulário vazio. Categorias que já têm atividade aparecem desabilitadas, com a explicação "já está no seu plano".

### 4.5 Navegação

Entra `@react-navigation/native-stack`:
- Pilha raiz: **Abas** (as 4 atuais), **MonteSeuDia**, **SeuDia**, **MeuPlano**, **EditarAtividade**.
- **MonteSeuDia** abre por cima das abas no primeiro acesso.

## 5. Arquitetura

| Arquivo | Responsabilidade |
| :--- | :--- |
| `src/domain/plano.ts` | Tipos, `validarAtividade`, `planoDoDia`, progresso, correspondência ação ↔ atividade, sugestões por categoria, limpeza de ajustes antigos |
| `src/data/PlanoRepository.ts` | Persistência versionada do plano (chave `blueprint:plano`), validação ao carregar, cópia de conteúdo corrompido |
| `src/hooks/usePlano.tsx` | Provider e hook: plano, plano de hoje, progresso, criar, editar e remover atividade, ajustar o dia, marcar como apresentado |
| `src/components/FormularioAtividade.tsx` | Formulário reutilizado no passo 3 e em EditarAtividade |
| `src/components/SeletorDeHorario.tsx` | Campo de horário (datetimepicker) |
| `src/components/LinhaDoPlano.tsx` | Linha da lista "Plano de hoje" |
| `src/screens/MonteSeuDiaScreen.tsx`, `SeuDiaScreen.tsx`, `MeuPlanoScreen.tsx`, `EditarAtividadeScreen.tsx` | Telas novas |
| `src/navigation/Raiz.tsx` | Pilha raiz com as abas e as telas novas |

O `AnelProgresso` passa a aceitar um preenchimento por segmento (`0`, `0.5` ou `1`), mantendo o modo atual (número de ações contra uma meta) para quando não há plano.

## 6. Erros e casos de borda

- Plano corrompido no disco: o app abre com plano vazio e guarda a cópia à parte. Como `apresentado` também se perde, o fluxo "Monte seu dia" aparece de novo, o que é aceitável para um caso raro.
- Atividade removida que tinha ações hoje: as ações continuam no histórico; o progresso do plano só considera atividades existentes.
- Atividade "outro" renomeada: ações antigas com o nome anterior deixam de contar para ela (comportamento documentado, sem migração de ações).
- Virada do dia com o app aberto: o plano de hoje é recalculado na próxima renderização com o relógio novo.
- Falha ao gravar o plano: aviso no console de desenvolvimento, estado mantido em memória (mesmo padrão das ações).

## 7. Testes

- **Domínio:** validação (cada regra), `planoDoDia` (dia da semana, puladas, extras), correspondência (categoria, rótulo sem diferenciar maiúsculas), situação (pendente, mínimo, completa), progresso, limpeza de ajustes com mais de 14 dias.
- **Repositório:** ida e volta, corrompido, versão desconhecida, itens inválidos descartados.
- **Telas:** "Monte seu dia" completo e pulado; Home com plano (1 toque registra e atualiza `feitas`, anel e situação; Desfazer volta); Home sem plano (convite); "Seu dia" pula e acrescenta; "Meu plano" cria, edita, remove, e bloqueia categoria repetida.
- **Checklist manual no Expo Go** ao fim da implementação, como nas etapas anteriores.

## 8. Documentação

- `README.md` reescrito com a nova proposta (feito junto com esta especificação).
- `docs/05-funcionalidades-e-fluxos.md`: novas funções F25 a F30 (plano, Monte seu dia, Plano de hoje, versão mínima, Seu dia, Meu plano) e critérios de aceite, ao fim da implementação.
- `docs/03-guia-telas-figma.md`: descrição das 4 telas novas, ao fim da implementação.
