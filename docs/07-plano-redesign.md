# 07. Plano do redesign (app e página de venda)

Objetivo: o Blueprint precisa parecer um produto que alguém pagaria para ter. Visual limpo, legível no celular, rápido de entender e sem cara de interface genérica.

Decisões tomadas com o dono do trabalho:
- Refazer **os dois**: telas do app e página de venda, com o mesmo visual.
- A marca (laranja `#FF4B00`, índigo `#4607CD`, preto) e a fonte Sora continuam. Os cinzas derivados mudam.
- As skills de design pedidas (Emil Kowalski, Impeccable, Taste) e o Playwright MCP não estavam disponíveis. Os princípios foram aplicados à mão e o responsivo foi testado no navegador do app, em tamanho de celular.

---

## 1. Diagnóstico do visual atual

| Problema | Onde aparece | Efeito |
| :--- | :--- | :--- |
| Cinza sobre cinza (`#DDDDDD` com cartões `#F2F2F2`) | Todas as telas no modo claro | Pouco contraste, tudo parece desabilitado |
| Tudo com o mesmo peso visual | Home e Agenda | O olho não sabe onde começar |
| Barra de abas com pílula preta pesada | Navegação | Chama mais atenção que o conteúdo |
| Sombras grandes e difusas | Cartões | Aspecto de modelo pronto |
| Animações de 600 ms | Entradas, sheet, toast | Interface lenta e "mole" |
| Botão com `scale(0.99)` em 220 ms | Todos os botões | O toque não dá retorno perceptível |
| Quadriculado decorativo no cartão de progresso | Home | Enfeite sem função |

## 2. Princípios (valem para app e página)

1. **Uma cor de destaque.** Laranja para ação e progresso. Índigo só em texto de destaque no claro e no início do gradiente.
2. **Hierarquia por tamanho e peso, não por caixa.** Menos cartões aninhados, mais espaço.
3. **Contraste mínimo 4,5:1** em texto. Verificado por script, não a olho.
4. **Movimento com função.** Entra e sai em 160 a 300 ms, curva de saída forte (`cubic-bezier(0.23, 1, 0.32, 1)`), nada nasce de `scale(0)`, botão responde ao toque em 100 a 140 ms (`scale(0.97)`). Respeita "reduzir movimento".
5. **Sem clichês.** Nada de gradiente roxo-azul no fundo, ícone em círculo em três cartões iguais, depoimento inventado, nota de loja inventada ou número de downloads inventado.
6. **Honestidade sobre o que existe.** Recurso ainda não construído aparece como "Em breve" na página de venda.
7. **Celular primeiro.** Alvo de toque mínimo de 44 px. A página é desenhada a partir de 360 px de largura.

## 3. Paleta nova

| Papel | Claro | Escuro |
| :--- | :--- | :--- |
| `bg` | `#F6F4F0` | `#0F0E0C` |
| `card` | `#FFFFFF` | `#1A1815` |
| `sunk` | `#EDEAE4` | `#26231F` |
| `ink` | `#17140F` | `#F1EEE8` |
| `onInk` | `#F6F4F0` | `#0F0E0C` |
| `mute` | `#5F5A52` | `#A39D93` |
| `hair` | `rgba(23,20,15,0.10)` | `rgba(241,238,232,0.12)` |
| `accent` | `#FF4B00` | `#FF4B00` |
| `accentText` | `#4607CD` | `#FF6A2B` |

Cartões passam a ter contorno de 1 px (`hair`) e sombra curta. Sem sombra grande.

## 4. Fases

### Fase 1. Tokens (`src/styles/theme.ts`, `src/ui/motion.ts`)
- Trocar paleta, sombras e durações de movimento.
- Atualizar `docs/04` e os testes de tokens.
- **Pronto quando:** `typecheck`, `lint` e testes passam e um script confirma contraste de 4,5:1 nos pares texto e fundo.

### Fase 2. Componentes base
- `Card`: contorno fino e sombra curta.
- `BarraDeAbas`: sem pílula preta. Ícone preenchido e rótulo em destaque na aba ativa, marcador curto em laranja.
- `BotaoAcao` e `BotaoOpcao`: resposta ao toque `scale(0.97)` em 120 ms, estado desabilitado legível.
- `CartaoProgresso`: remover o quadriculado.
- **Pronto quando:** componentes renderizam nos dois temas sem hex solto.

### Fase 3. Telas (uma por vez, com captura antes e depois)
1. Hoje (Home)
2. Agenda e Agendas
3. Compromisso (editar)
4. Calendário
5. Histórico
6. Perfil
- **Pronto quando:** cada tela é conferida a 390 px e a 360 px, claro e escuro, sem texto cortado nem rolagem horizontal.

### Fase 4. Página de venda (`landing/`)
HTML, CSS e um pouco de JavaScript, sem etapa de build, pronta para GitHub Pages ou Netlify.

| Bloco | Conteúdo |
| :--- | :--- |
| Topo | Marca e botão "Baixar" |
| Hero | "Sua semana, cumprida." + 1 frase + botão principal + imagem real do app |
| Como funciona | 4 passos numerados: planejar, ser lembrado, registrar, acompanhar |
| Agenda | Captura real da agenda e o texto "monte uma vez, repita toda semana" |
| Histórico | Captura real do histórico e o texto "o passado nunca é reescrito" |
| Detalhes | Funciona sem internet, em português, claro e escuro, dados no aparelho |
| Em breve | Alertas, painel por mês, conta na nuvem (marcados como em breve) |
| Perguntas | 4 perguntas em lista expansível |
| Fechamento | Chamada final e botão de baixar |

As telas do celular na página são reproduções em HTML e CSS com os mesmos tokens e os mesmos textos do app (inclusive "Faltam 3 para fechar o dia."). Ficam nítidas em qualquer densidade de tela e acompanham o tema. Capturas em 1x ficariam borradas em tela retina.

Para rodar a página: abrir `landing/index.html` no navegador, ou servir a pasta `landing/`. O link do botão "Baixar" é a constante `DOWNLOAD_URL` em `landing/script.js`.

### Fase 5. Verificação
- `npm run typecheck`, `npm run lint`, `npm test` com resultado real.
- Navegador em 360, 390 e 768 px, claro e escuro.
- Página de venda: sem rolagem horizontal em 360 px, botões com 44 px ou mais, imagens com texto alternativo.

## 5. Fora do escopo (próximos passos)
- Etapa 2 do roteiro: "Hoje" mostrar os compromissos da agenda com "Feito" e "Não fui". Hoje a tela inicial ainda é a de hábitos.
- Alertas, painel de histórico por mês, Supabase e o `.apk`.
- Preço e link real de download: não existem no projeto, então a página usa um único ponto de configuração para o link.

## 6. Agenda: montar a semana

Problema: montar a semana exigia abrir o mesmo formulário comprido uma vez por dia, embora o dado já aceite vários dias por compromisso. A visão "Por dia" foi removida.

- **Agenda:** um mês por vez (navegação por mês). Cada compromisso é uma linha, ordenada por horário, com os sete dias ao lado. Um toque liga ou desliga o dia, sem formulário. Tocar no nome abre o compromisso para editar horário e detalhes.
- **Agenda em curso:** a mudança vale a partir de hoje (a agenda é dividida), para não reescrever os dias que já passaram. Em agenda que ainda não começou, vale para todas as semanas.
- **Conflito de horário** aparece dentro da linha do compromisso, e os compromissos "só neste dia" ganharam a seção "Só em um dia" no fim do mês.
- **Formulário:** atalhos "Seg a sex", "Fim de semana" e "Todos os dias". Vindo da Agenda, abre sem dia pré-marcado.
- **Fora desta entrega:** duplicar um compromisso (a mesma aula em dois horários) e arrastar para mudar de dia.

## 7. Histórico

Problema: a lista mostrava cada ação de cada dia (mais de cem linhas) e a visão Mês era um aviso de "não especificado".

- **Semana:** gráfico e números como antes, mais "Dia a dia": uma linha por dia da semana exibida, com os ícones das categorias e o total. Tocar abre as ações do dia; hoje já vem aberto. Dias futuros não aparecem.
- **Mês:** ações no mês e dias com registro, e "Por categoria" com barra proporcional e a comparação com o mês anterior ("2 a mais que no mês anterior"). Responde "quantas vezes fui à academia neste mês".

## 8. Perfil

- **Nome:** editável no próprio cartão ("Adicionar seu nome" / "Editar nome"), de 1 a 40 caracteres, com espaços normalizados. Enquanto não houver nome, aparece "Convidado".
- **Foto:** escolhida da galeria com recorte quadrado (`expo-image-picker`) e reduzida para 512 px em JPEG (`expo-image-manipulator`). Sem essa redução, uma foto de celular passaria de 1 MB e estouraria o limite do AsyncStorage no Android. Fica guardada como data URI de até 300 mil caracteres. Sem foto, aparecem as iniciais sobre o gradiente.
- **Armazenamento:** `PerfilRepository` local (`blueprint:perfil`), no mesmo padrão da agenda, com `PerfilProvider` e `usePerfil`. Ao ligar a conta na nuvem, a foto deve migrar para um bucket do Supabase Storage em vez de ir dentro da linha do banco.
- **Visual:** cartão de identidade centralizado, e as configurações agrupadas em cartões ("Aparência" e "Sobre").
- **Ainda não exercitado em aparelho real:** o seletor de fotos foi testado com simulação e a edição do nome foi conferida no navegador. Escolher e recortar uma foto de verdade precisa ser testado no celular (Expo Go ou build).
