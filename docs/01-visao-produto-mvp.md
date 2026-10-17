# 📋 01. Visão do Produto e Escopo do MVP — App **Blueprint**

> **Subtítulo:** Plano de Ação Claro e Estruturado para o Dia a Dia  
> **Foco:** Leveza, intuição e resposta imediata ao usuário final.

---

## 1. Contextualização e Justificativa

No cotidiano acadêmico e profissional, manter a consistência em pilares básicos — estudar com foco, hidratar-se, exercitar-se e descansar — é um desafio constante. Embora existam centenas de aplicativos de gestão de tarefas no mercado, a grande maioria sofre de **complexidade excessiva**: exigem que o usuário digite textos longos, configure etiquetas, defina horários complexos e navegue por várias telas apenas para registrar uma ação simples.

O **Blueprint** nasce com a proposta oposta: oferecer um **plano de ação claro e estruturado** onde o registro acontece com **um único toque**, respeitando o tempo do usuário e entregando confirmação visual imediata.

---

## 2. Público-Alvo e Personas

### Perfil Geral do Público-Alvo
- **Faixa etária:** 17 a 40 anos.
- **Ocupação:** Estudantes universitários, concurseiros, desenvolvedores e profissionais com rotinas dinâmicas.
- **Comportamento Mobile:** Utilizam smartphones Android diariamente tanto em redes Wi-Fi domésticas quanto em dados móveis (4G/5G) durante deslocamentos. Buscam interfaces limpas, rápidas e sem anúncios invasivos.

### Persona Representativa
- **Nome:** Lucas, 22 anos, estudante de tecnologia e estagiário de TI.
- **Dor Principal:** *"Já tentei usar blocos de notas e apps famosos de rotina, mas desisto no terceiro dia porque dá muito trabalho preencher vários campos toda vez que quero registrar que cumpri uma meta de estudo ou treino."*
- **Necessidade:** Um aplicativo direto ao ponto na tela inicial do celular onde ele toque na categoria do momento (`Estudo`, `Hidratação`, `Exercício`, `Descanso` ou `Outro`), veja seu foco atual destacado e acompanhe quantas ações já concluiu no dia.

---

## 3. Declaração do Problema

| Problema Identificado | Impacto no Usuário | Como o **Blueprint** Resolve |
| :--- | :--- | :--- |
| **Alta fricção de entrada** (muitos campos de texto e telas para registrar um hábito). | O usuário procrastina o registro e abandona o aplicativo na primeira semana. | **Seletor de Categoria por Toque (`BotaoOpcao`):** zero digitação obrigatória no MVP; basta 1 toque para classificar a ação. |
| **Falta de clareza visual sobre a prioridade do momento.** | Sensação de desorganização mental ("o que estou fazendo agora?"). | **Destaque de Estado Ativo (`useState`):** a categoria selecionada muda de cor instantaneamente e atualiza o painel de foco atual. |
| **Percepção de baixo progresso diário.** | Desmotivação ao longo do dia por não enxergar pequenas vitórias. | **Contador Diário de Ações (`quantidade`):** cada confirmação incrementa o placar diário em destaque no topo da tela. |
| **Exceções da rotina que não cabem em categorias fixas.** | Frustração quando surge uma tarefa imprevista. | **Categoria Especial `"Outro"`:** botão dedicado com destaque visual próprio (cor roxa `#7C3AED`) para demandas extras. |

---

## 4. Objetivos de Resolução (Métricas de Sucesso do MVP)

1. **Objetivo Funcional (Interação):** Entregar uma interface interativa que responde ao toque em menos de 1 segundo, seguindo o ciclo `Componente Visual → Evento (onPress) → Função → Mudança de Estado (useState) → Atualização da Tela`.
2. **Objetivo de Engenharia (Reuso):** Implementar o seletor de 5 categorias (`Hidratação`, `Exercício`, `Descanso`, `Estudo`, `Outro`) escrevendo o código estrutural do botão **apenas uma vez** através do componente reutilizável `BotaoOpcao`.
3. **Objetivo de Implantação (Vida Real):** Disponibilizar o aplicativo gratuitamente em formato `.apk` para celulares Android e persistir os registros na nuvem via **Supabase**, permitindo uso real em qualquer rede móvel ou Wi-Fi.

---

## 5. Escopo do MVP (Entregas Faseadas)

### ✅ Fase 1 — Arquitetura, UI/UX e Componentes Base
- Estruturação completa da arquitetura no GitHub e documentação de produto;
- Especificação visual das 3 telas/estados iniciais no Figma;
- Tela principal de Check-in contendo:
  - Cartão de progresso diário (`quantidade` de ações registradas no dia);
  - Seletor interativo com 4 categorias principais + 1 categoria `"Outro"` com cor diferenciada;
  - Exibição dinâmica da categoria escolhida e botão de confirmação de ação.

### 🔜 Próximas Fases de Evolução
- **Listas e Coleções:** Exibição da lista cronológica de ações registradas no dia usando `FlatList`;
- **Navegação:** Transição entre a tela de *Check-in Diário* e a tela de *Histórico / Estatísticas*;
- **Integração Cloud & APK:** Conexão ativa das funções com a tabela `blueprint_actions` no **Supabase** e geração do `.apk` via **Expo EAS**.
