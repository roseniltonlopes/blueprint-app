# 🧭 06. Roteiro de Desenvolvimento com o Claude Code (etapas e prompts)

Roteiro para desenvolver o Blueprint em etapas curtas, testando cada uma **em tempo real no celular** com o Expo Go. Salve este arquivo em `docs/06-roteiro-claude-code.md`.

---

## 1. Como o teste em tempo real funciona

O Claude Code edita o código e você vê o resultado no celular na hora (Fast Refresh). Ele **não enxerga a tela do seu aparelho**, então o ciclo é sempre este:

1. Em um terminal separado, na pasta do projeto: `npx expo start`
2. No celular, abra o **Expo Go** e leia o QR code. Celular e computador na mesma rede Wi-Fi.
3. Se a rede bloquear a conexão (Wi-Fi de faculdade, dados móveis, VPN): `npx expo start --tunnel`
4. O Claude Code altera os arquivos e a tela atualiza sozinha.
5. Você testa o checklist da etapa e **descreve o que viu** (ou manda um print). Ele corrige.

Antes de cada etapa, rode também `npx expo-doctor` e `npx expo install --check` para pegar versões incompatíveis cedo.

### Limites do Expo Go (importante)
| Recurso | Expo Go | Observação |
| :--- | :--- | :--- |
| Tema, navegação, `react-native-svg`, `expo-font`, AsyncStorage | Funciona | Etapas 1 a 6 |
| `react-native-reanimated` | Funciona | Confirme a compatibilidade com o SDK instalado |
| Supabase com e-mail e senha | Funciona | Etapa 7 |
| **Login Google nativo** | **Não funciona** | Exige *development build* (perfil `development` já existe no `eas.json`) |
| Login Apple | Validar | Verifique na documentação do Expo da versão instalada |
| Fonte Nohemi | Funciona se o arquivo for carregado com `expo-font` | Precisa do arquivo `.otf` ou `.ttf` licenciado |

---

## 2. Etapas

Cada etapa termina com algo que você **vê e toca no celular**. Não avance sem aprovar a anterior.

| Etapa | Objetivo | O que você testa no Expo Go | Funções (docs/05) |
| :-: | :--- | :--- | :--- |
| **0** | Preparar o projeto Expo | App abre no celular com uma tela simples | n/a |
| **1** | Fundação visual | Cores e fonte da marca, troca claro/escuro | F08 |
| **2** | Home funcional | Escolher categoria, registrar, contador certo | F01, F02, F03, F05 |
| **3** | Anel, sheet "Outro", toast, animações | Movimento suave, Desfazer, "Outro" com nome | F04, F06, F07, F09 |
| **4** | Navegação e Histórico | 4 abas, gráfico semanal, lista do dia | F10, F13, F14, F15 |
| **5** | Calendário e Perfil | Mês com intensidade, mapa de calor, aparência | F11, F12, F17, F21 |
| **6** | Persistência local | Fechar e reabrir o app mantém os dados | F23 |
| **7** | Supabase e login | Cadastro, login e dados na nuvem | F18, F20, F22 |
| **8** | APK | Instalar o `.apk` no Android | F24 |

Google e Apple (F19) entram na etapa 7 como subetapa, depois do login por e-mail, e exigem *development build*.

---

## 3. Prompt mestre (cole no início da sessão do Claude Code)

```text
Você é meu parceiro de desenvolvimento do app Blueprint (React Native + Expo + Supabase).

Antes de qualquer coisa:
1. Leia CLAUDE.md, README.md e todos os arquivos em docs/ (principalmente 03, 04, 05 e 06).
2. Veja as imagens das telas em docs/assets/v2/, se existirem.
3. Me diga em até 10 linhas o que entendeu, o estado real do código e o que está faltando.

Regras de trabalho, valem para toda a sessão:
- Trabalhamos por ETAPAS, conforme docs/06-roteiro-claude-code.md. Faça uma etapa por vez e não avance sem eu aprovar.
- Para cada etapa, siga este ciclo:
  a) Proponha um plano curto (arquivos que vai criar ou alterar, decisões e riscos) e espere meu "ok".
  b) Crie uma branch feat/etapa-N-nome.
  c) Implemente. Código tipado, modular, com tratamento de erros, sem TODO e sem gambiarra.
  d) Rode lint, typecheck e testes automatizados e me mostre o resultado real, inclusive falhas.
  e) Me entregue um CHECKLIST DE TESTE MANUAL para o Expo Go, com passos numerados e o que devo ver em cada um.
  f) Espere meu retorno do teste no celular e corrija o que eu reportar.
  g) Só depois da minha aprovação, faça o commit (Conventional Commits em português) e me peça confirmação para o push.
- Eu rodo o servidor Expo em outro terminal. Não rode processos que travem o terminal.
- Cores, espaços e raios vêm de theme.ts, sem hex solto. Siga docs/04 à risca.
- O design vence o código. Se o doc estiver errado ou incompleto, diga e proponha a correção.
- Se faltar informação ou algo for incerto, diga na hora em vez de supor. Valide APIs na documentação oficial da versão instalada do Expo SDK.
- Aponte más práticas e vulnerabilidades que encontrar, mesmo fora da etapa.
- Nunca versione segredos. Nunca aplique migração no Supabase sem minha revisão.
- Responda em português do Brasil, direto e técnico. Sem travessões.

Quando terminar a leitura, comece pela ETAPA 0 e me entregue apenas o plano.
```

---

## 4. Prompts por etapa

Cole **um** prompt por vez, depois de aprovar a etapa anterior.

### Etapa 0: preparar o projeto Expo
```text
ETAPA 0: Preparar o projeto Expo.

Contexto: o repositório tem src/ e eas.json, mas não tem package.json nem app.json na raiz.

1. Verifique se o projeto Expo está em outra pasta. Se não estiver, proponha como inicializar um projeto Expo com TypeScript sem sobrescrever docs/, src/, eas.json, README.md e CLAUDE.md (sugestão: gerar em pasta temporária e mesclar). Me peça confirmação antes de mesclar.
2. Migre os 3 arquivos existentes de src/ para TypeScript mantendo o comportamento atual.
3. Configure ESLint, Prettier, typecheck e jest-expo com @testing-library/react-native, com scripts no package.json.
4. Garanta que o .gitignore protege .env e node_modules, e que o .env.example continua correto.
5. Confirme a versão do Expo SDK e a compatibilidade com o Expo Go atual da loja.

Entregue: plano primeiro. Depois da implementação, o checklist de teste manual (abrir no Expo Go via QR code e ver a tela atual funcionando).
Critério: app abre no meu celular, typecheck e testes passam.
```

### Etapa 1: fundação visual
```text
ETAPA 1: Fundação visual (tema, fonte e componentes base).

Siga docs/04-design-tokens-e-motion.md.
1. Reescreva src/styles/theme.ts com os tokens da v2 (claro e escuro) e a rampa do gradiente.
2. Crie um ThemeProvider com os modos claro, escuro e automático (useColorScheme), e o hook useTheme().
3. Carregue a fonte com expo-font. Use Sora (@expo-google-fonts/sora) como fallback. Se eu fornecer o arquivo Nohemi em assets/fonts/, use-o primeiro. Mantenha a tela de splash até a fonte carregar.
4. Crie os componentes base: Screen, Card (superfície suave com sombra difusa e sem borda escura), Text com variantes de docs/04 e SegmentedControl.
5. Crie uma tela temporária de "Galeria de componentes" para eu ver tudo no celular nos dois temas.
6. Testes unitários dos tokens e do ThemeProvider.

Teste no celular: alternar claro/escuro/automático e comparar com docs/assets/v2/.
Critério: F08 (tema persiste só na etapa 6, aqui basta alternar).
```

### Etapa 2: Home funcional
```text
ETAPA 2: Home funcional, sem animações.

Siga docs/03 (telas 2 e 3) e docs/05 (F01, F02, F03, F05 e a seção 3).
1. Separe a LÓGICA da interface: crie um módulo puro de domínio (tipos Categoria e Acao, funções para contar por dia e por categoria, e um reducer ou hook useAcoes) e cubra com testes.
2. Corrija o defeito conhecido: registrar exige categoria selecionada, cria UMA ação, incrementa contadores e LIMPA a seleção.
3. Implemente BotaoOpcao v2 (cartão, selecionado invertido com selo) e a linha larga "Outro" (por enquanto só seleciona), BotaoAcao com estado desabilitado ("Escolha uma categoria para registrar"), cabeçalho com data e saudação, e a chave de tema.
4. Por enquanto o progresso é um número simples. O anel vem na etapa 3.

Teste no celular: roteiro com os 4 critérios de F01 e F02.
Critério: todos os checkboxes de F01 e F02 de docs/05 e testes do domínio passando.
```

### Etapa 3: anel, sheet e animações
```text
ETAPA 3: Anel de progresso, sheet do "Outro", toast e animações.

Siga docs/04 (seções 5 e 6) e docs/05 (F04, F06, F07, F09).
1. Anel de 5 segmentos com react-native-svg e gradiente por segmento. Número e "de 5" no centro.
2. Bottom sheet "Outra ação" com campo (1 a 40 caracteres), sugestões e cancelar.
3. Toast com Desfazer por 5 segundos, usando as regras de docs/05.
4. Animações com react-native-reanimated: entradas em cascata, desenho do anel, sheet e toast. Curva e durações de docs/04.
5. Respeite "reduzir movimento" do sistema (AccessibilityInfo).
6. Confirme que reanimated é compatível com o Expo Go da versão instalada e configure o plugin necessário.

Teste no celular: ativar "reduzir movimento" no sistema e confirmar que as animações somem.
Critério: F04, F06, F07 e F09 de docs/05.
```

### Etapa 4: navegação e Histórico
```text
ETAPA 4: Barra de 4 abas e Histórico.

Siga docs/03 (telas 7) e docs/05 (F10, F13, F14, F15).
1. Barra inferior com Hoje, Calendário, Histórico e Perfil (Calendário e Perfil como telas vazias por enquanto).
2. Histórico: seletor Semana/Mês (só Semana funcional), gráfico semanal em SVG com barra do dia atual em gradiente, resumo (total, dias seguidos, melhor dia) e lista com FlatList agrupada por Hoje e Ontem.
3. Regras de sequência e melhor dia de docs/05 seção 2, como funções puras com testes (inclua casos de borda: virada do dia, empate, hoje sem registro).
4. Use dados locais de exemplo APENAS em um modo de desenvolvimento claramente marcado.

Teste no celular: registrar ações na Home e ver aparecerem no Histórico.
```

### Etapa 5: Calendário e Perfil
```text
ETAPA 5: Calendário e Perfil.

Siga docs/03 (telas 6 e 8) e docs/05 (F11, F12, F17, F21).
1. Calendário mensal com 5 ou 6 linhas, dias vizinhos em tom secundário, dia atual destacado, barra de intensidade e resumo do dia e do mês.
2. Perfil: avatar com iniciais, estatísticas, mapa de calor de 12 semanas, Aparência (Claro, Escuro, Automático) e cor de destaque.
3. Os totais de Histórico, Calendário e Perfil devem usar a mesma função de domínio e bater entre si (crie um teste que garanta isso).

Teste no celular: registrar ações em dias diferentes e conferir os três lugares.
```

### Etapa 6: persistência local
```text
ETAPA 6: Persistência local (offline-first).

1. Crie uma camada de repositório com interface (AcoesRepository) e implementação com AsyncStorage. A UI não pode conhecer o AsyncStorage.
2. Persista ações e preferências (tema, cor de destaque, meta).
3. Trate dados corrompidos ou de versão antiga sem quebrar o app (versionamento do formato).
4. Testes com mock de storage.

Teste no celular: registrar, fechar o app completamente, reabrir e conferir os dados e o tema.
```

### Etapa 7: Supabase e login
```text
ETAPA 7: Supabase, autenticação e sincronização.

ANTES de codar: leia docs/02 (alerta de segurança) e src/services/migrations/002_auth_e_rls_PROPOSTA.sql, revise o SQL e me aponte qualquer problema. NÃO aplique nada no banco. Me entregue o SQL final para eu rodar em um projeto Supabase de DESENVOLVIMENTO.

Subetapa 7A (e-mail e senha, funciona no Expo Go):
- Cliente Supabase via EXPO_PUBLIC_*, sessão persistida de forma segura, telas de cadastro e login conforme docs/03 tela 1, validações de docs/05 e tratamento de erros de rede.
- Criação de perfil com fuso detectado.
- Implementação do AcoesRepository remoto e sincronização com a fila local da etapa 6 (sem perder dados offline, sem duplicar).
- Desfazer removendo também no servidor.

Subetapa 7B (Google e Apple): só depois de 7A aprovada. Pesquise na documentação oficial o fluxo suportado pela versão do SDK, me explique o que exige development build e o que muda no processo de teste antes de implementar.
```

### Etapa 8: APK
```text
ETAPA 8: Build do APK e checklist de release.

1. Revise eas.json e app.json (nome, pacote Android, ícone, splash, versão).
2. Faça um checklist de release: segredos fora do repositório, policies do Supabase por usuário aplicadas, licença da fonte Nohemi confirmada, tela de erro sem dados sensíveis, testes passando.
3. Gere o build com o perfil preview (eas build -p android --profile preview) e me diga exatamente o que preciso rodar e autenticar. Não peça nem armazene minhas credenciais.
4. Liste o que testar no APK instalado, incluindo uso sem internet e com dados móveis.
```

---

## 5. Dicas para o dia a dia

- **Um assunto por vez.** Se ele começar a mexer em coisas fora da etapa, diga: "volte ao escopo da etapa N".
- **Mande prints** do celular quando algo estiver diferente do design e cite a tela de `docs/assets/v2/`.
- **Peça o plano antes do código** em qualquer mudança grande.
- **Se uma etapa ficar grande demais**, peça para dividir em subetapas, cada uma terminando com algo testável.
- **Mudou o design?** Atualize o canvas no claude.ai, exporte os PNGs de novo e peça ao Claude Code para reconciliar o código com `docs/`.
- **Contexto longo demais?** Peça um resumo do estado atual e comece uma sessão nova, colando o prompt mestre e o resumo.
