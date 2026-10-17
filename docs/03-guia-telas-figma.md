# 🎨 03. Guia de Telas do MVP e Kit Editável para o Figma — **Blueprint**

Este documento apresenta as **5 telas em alta definição do MVP** do aplicativo **Blueprint**, construídas com base nas boas práticas modernas de UI/UX Mobile (*One Screen One Job*, *Touch Targets* amplos, *Empty/Active States*, *Bottom Navigation Bar* na zona do polegar e alternância **Light / Dark Mode**) utilizando a identidade visual **Creme (`#FFFDF2`)** e **Preto Puro (`#000000`)**.

---

## 1. Apresentação das 5 Telas do MVP (Alta Definição)

![Painel das 5 Telas do MVP - Blueprint](assets/blueprint_mvp_screens.jpg)

---

## 2. Arquivo Vetorial Editável no Figma (`.SVG` 100% Editável)

Para facilitar a edição imediata de qualquer texto, botão, cor ou ícone no **Figma**:

- 📂 **Arquivo Vetorial Oficial no Repositório:** [`docs/figma/blueprint_ui_kit.svg`](figma/blueprint_ui_kit.svg)

### Como abrir e editar no seu Figma em 5 segundos:
1. Abra o [Figma](https://www.figma.com) no navegador ou aplicativo Desktop e crie um novo *Design File*;
2. Arraste o arquivo [`docs/figma/blueprint_ui_kit.svg`](figma/blueprint_ui_kit.svg) diretamente para dentro da tela do Figma;
3. **Pronto!** Os 5 quadros (`390 x 844` — proporção moderna mobile) aparecerão separados por camadas (*Frames/Groups*: `Screen_01_Auth_Global`, `Screen_02_Home_Empty`, `Screen_03_Home_Active`, `Screen_04_Home_Outro`, `Screen_05_History_Dark_Mode`) prontos para editar e gerar seu link público de compartilhamento.

---

## 3. Detalhamento de Cada Tela e Boas Práticas Aplicadas

### 📱 Tela 1 — Cadastro & Login Global (`Screen_01_Auth_Global`)
- **Objetivo (*One Screen, One Job*):** Permitir autenticação rápida ou criação de conta global sem fricção.
- **Login Social Integrado (1 Toque):**
  - Botão **Continuar com Google** (fundo Creme `#FFFDF2`, borda `#000000`);
  - Botão **Continuar com Apple / iOS** (fundo Preto `#000000`, texto `#FFFDF2`).
- **Campos Obrigatórios e de Uso Global:**
  - `Nome completo *`
  - `E-mail *`
  - `País / Idioma Global *` (Ex: *Brasil (PT-BR) • UTC-3* para sincronização correta de fuso horário no banco em nuvem)
  - `Senha (mín. 8 caracteres) *`
- **Ação Primária:** Botão arredondado `Criar Conta no Blueprint` na zona do polegar.

### 📱 Tela 2 — Home: Estado Inicial / *Empty State* (`Screen_02_Home_Empty`)
- **Tema Claro (`#FFFDF2`):** Visual limpo, editorial e acolhedor para uso diurno.
- **Seletor de Tema (Light/Dark Toggle):** Chave seletora (`☀ / ☾`) no canto superior direito permitindo alternar instantaneamente para o modo escuro.
- **Hero Card de Progresso:** Exibe `0 ações concluídas hoje` em tipografia de alto impacto (`40px ExtraBold`).
- **Grid de Categorias (`BotaoOpcao`):** Botões amplos com ícones intuitivos (`Hidratação`, `Exercício`, `Descanso`, `Estudo` e `Outro`).
- **Menu Inferior (*Bottom Navigation Bar*):** Posicionado na base da tela com 3 abas claras: **Hoje**, **Histórico** e **Perfil**.

### 📱 Tela 3 — Home: Categoria Selecionada / *Active State* (`Screen_03_Home_Active`)
- **Feedback Visual Imediato:** Ao tocar em **`Estudo`**, o card inverte seu contraste para **Preto Puro (`#000000`)** com texto e ícone em **Creme (`#FFFDF2`)** e selo de confirmação (`✓`).
- **Atualização de Estado (`useState`):** O indicador inferior confirma `"Foco atual: Estudo"` e habilita o botão principal `"Registrar no Blueprint"`, atualizando o contador superior (`3 ações registradas`).

### 📱 Tela 4 — Home: Opção `"Outro"` Selecionada (`Screen_04_Home_Outro`)
- **Versatilidade de Componente:** Demonstra a seleção da categoria `"Outro"` com estilo diferenciado (fundo Charcoal `#2D2A24` e borda tracejada arquitetônica), utilizando o mesmo componente `BotaoOpcao` através da propriedade `corSelecionado`.

### 📱 Tela 5 — Histórico & *Dark Mode* Ativo (`Screen_05_History_Dark_Mode`)
- **Tema Escuro (`#000000`):** Quando o usuário aciona o botão `☾` no topo, o fundo da tela assume o **Preto Puro (`#000000`)** (ideal para economia de bateria em telas OLED e conforto visual à noite), enquanto os cartões de atividades concluídas ganham destaque em **Creme (`#FFFDF2`)**.
- **Lista de Ações Sincronizadas:** Exibe o histórico cronológico salvo na nuvem e a aba **Histórico** ativa no menu inferior.

---

## 4. Especificação da Paleta de Cores Oficial (`Creme & Preto`)

| Token | Código Hex | Aplicação no Modo Claro (Light) | Aplicação no Modo Escuro (Dark) |
| :--- | :--- | :--- | :--- |
| **Warm Cream** | `#FFFDF2` | Fundo principal da tela (`SafeAreaView`) | Texto principal, cartões em destaque e botões primários |
| **Pure Black** | `#000000` | Textos, bordas fortes e botão selecionado | Fundo principal da tela (`SafeAreaView`) |
| **Soft Cream Card** | `#F4F1E1` | Superfície dos cartões e botões em repouso | — |
| **Dark Surface** | `#1C1B18` | — | Superfície secundária de cartões no modo escuro |
| **Charcoal Special** | `#2D2A24` | Cor diferenciada da opção `"Outro"` selecionada | Bordas sutis e opção `"Outro"` |
| **Warm Muted** | `#52514C` | Subtítulos, placeholders e ícones inativos | `#A8A496` (Subtítulos no modo escuro) |
