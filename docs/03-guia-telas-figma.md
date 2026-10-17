# 🎨 03. Guia das 8 Telas da v2 do Blueprint

Este documento descreve as telas da **versão 2** do design, com a paleta da marca (Preto, Off White, Laranja, Roxo índigo e gradiente), tipografia Nohemi, cartões suaves sem bordas escuras e movimento sutil.

- **Canvas editável:** https://claude.ai/artifact/Cae8a8KKv5bRKpx234Zh3h (privado até o dono compartilhar pelo botão *Share*)
- **Código-fonte das pranchas:** [`docs/design/canvas-source/`](design/canvas-source/)
- **Tokens, motion e acessibilidade:** [`04-design-tokens-e-motion.md`](04-design-tokens-e-motion.md)
- **Funções e critérios de aceite:** [`05-funcionalidades-e-fluxos.md`](05-funcionalidades-e-fluxos.md)

Todas as pranchas têm `390 x 844` px. Nomes, datas e números são dados de exemplo.

---

## 1. Mudanças em relação à v1

| Tema | v1 | v2 |
| :--- | :--- | :--- |
| Paleta | Creme `#FFFDF2` e Preto | Preto, Off White `#DDDDDD`, Laranja `#FF4B00`, Roxo `#4607CD` e gradiente |
| Tipografia | Sistema | Nohemi (mockup com Sora como substituta) |
| Cartões | Bordas escuras de 1,5px e sombras duras | Sem bordas, tom de superfície e sombra difusa |
| Navegação | 3 abas: Hoje, Histórico, Perfil | 4 abas: Hoje, Calendário, Histórico, Perfil |
| Progresso | Número grande em cartão | Anel segmentado de 5 partes com gradiente |
| Categoria "Outro" | Cartão com cor própria | Linha larga com bottom sheet para nome livre |
| Grid de categorias | "Descanso" aparecia separado do ícone da lua em duas células | 4 cartões completos (ícone, nome, contador) mais a linha "Outro" |
| Feedback | Texto "Foco atual" | Cartão invertido com selo, toast com Desfazer |
| Movimento | Nenhum | Entradas em cascata, anel, barras, sheet e toast |

Os arquivos `docs/assets/blueprint_mvp_screens.jpg` e `docs/figma/blueprint_ui_kit.svg` são da **v1** e foram mantidos como histórico. Eles não refletem a v2.

---

## 2. Telas

### 📱 Tela 1: Cadastro e login (`Main.dc.html`, modo claro)
- **Marca:** anel mini 3 de 5 e wordmark com "Blue" em Light e "print" em Bold. Frase: "Seu dia, um toque por vez."
- **Seletor** `Criar conta | Entrar`.
- **Login social:** "Continuar com Google" (superfície clara) e "Continuar com Apple" (preto).
- **Divisor** "ou use seu e-mail" e campos `Nome completo`, `E-mail` e `Senha` (com botão de mostrar senha).
- **Fuso horário:** texto informativo "Fuso horário detectado: São Paulo (GMT-3)", editável depois no Perfil.
- **Ação primária:** "Criar conta", com brilho laranja difuso.
- **Rodapé:** aceite de Termos e Política de Privacidade.

### 📱 Tela 2: Home, estado inicial (`Home-vazio.dc.html`, modo claro)
- **Cabeçalho:** data, saudação e chave de tema (sol e lua).
- **Cartão de progresso:** anel de 5 segmentos vazios, `0 de 5` e a mensagem "Toque em uma categoria para começar o plano."
- **Seção** "O que você fez agora?" com 4 cartões (Hidratação, Exercício, Descanso, Estudo) e a linha larga "Outro".
- **Botão principal desabilitado:** "Escolha uma categoria para registrar".
- **Barra inferior** com 4 abas e **Hoje** ativa.

### 📱 Tela 3: Home, categoria ativa (`Home-ativa.dc.html`, modo claro)
- **Estudo selecionado:** o cartão inverte para preto, com texto Off White, selo de confirmação laranja e brilho laranja.
- **Contadores por categoria:** "2 hoje" em Hidratação e "1 hoje" em Exercício.
- **Anel:** 3 de 5 segmentos preenchidos com o gradiente. Mensagem "Faltam 2 para fechar o dia."
- **Botão principal habilitado:** "Registrar Estudo".

### 📱 Tela 4: Home, opção Outro (`Home-outro.dc.html`, modo claro)
- **Bottom sheet** "Outra ação" sobre fundo escurecido.
- **Campo** "O que você fez?" com exemplo "meditação de 10 minutos".
- **Sugestões rápidas:** Meditação, Alongamento, Organização.
- **Ações:** "Registrar ação" e "Cancelar".

### 📱 Tela 5: Home, após registrar (`Home-escuro.dc.html`, modo escuro)
- **Fundo preto** e texto Off White. A chave de tema mostra a lua ativa.
- **Anel:** 4 de 5 segmentos. Mensagem "Falta 1 para fechar o dia."
- **Toast:** "Estudo registrado às 15:58" com ação **Desfazer**.
- **Botão principal** volta ao estado desabilitado.

### 📱 Tela 6: Calendário (`Calendario-escuro.dc.html`, modo escuro)
- **Navegação de mês** ("outubro de 2026") e cabeçalho de dias da semana.
- **Dias:** cada dia mostra o número e uma barra cuja cor indica a intensidade (nenhuma, 1 a 2, 3 a 4, 5, 6 ou mais). O dia atual é preenchido e destacado. Dias do mês anterior e futuros ficam em tom secundário.
- **Resumo do dia selecionado:** "Hoje, 17 de outubro", 3 ações e chips por categoria.
- **Resumo do mês:** ações no mês e dias com registro.

### 📱 Tela 7: Histórico (`Historico.dc.html`, modo claro)
- **Seletor** `Semana | Mês`.
- **Gráfico semanal:** 7 colunas (dom a sáb) com valor sobre cada uma. A barra do dia atual usa o gradiente.
- **Resumo:** ações na semana, dias seguidos e melhor dia.
- **Lista cronológica** agrupada por dia ("Hoje", "Ontem"), com horário, ícone e categoria.

### 📱 Tela 8: Perfil (`Perfil-escuro.dc.html`, modo escuro)
- **Identidade:** avatar com iniciais sobre o gradiente, nome, e-mail e botão **Editar**.
- **Estatísticas:** ações registradas e sequência atual.
- **Mapa de calor** das últimas 12 semanas, com legenda "menos a mais".
- **Aparência:** `Claro | Escuro | Automático` e cor de destaque (Gradiente, Laranja, Índigo).
- **Conta:** fuso horário e provedor de login.

---

## 3. Como exportar imagens das telas para este repositório

O repositório ainda não contém imagens da v2. Para gerar:
1. Abra o canvas pelo link acima.
2. Use o menu **Share > Export** do canvas (o nome exato pode variar conforme a conta) e exporte as pranchas como PNG.
3. Salve em `docs/assets/v2/` com nomes como `01-login.png` e referencie neste documento.
