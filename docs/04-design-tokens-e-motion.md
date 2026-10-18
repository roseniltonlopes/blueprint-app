# 🧩 04. Design Tokens, Motion e Acessibilidade (v2)

Referência única de cores, tipografia, formas, sombras, movimento e acessibilidade da v2. Os valores vêm do canvas editável: https://claude.ai/artifact/Cae8a8KKv5bRKpx234Zh3h

> **Implementação:** os tokens desta página estão em [`src/styles/theme.ts`](../src/styles/theme.ts) desde a Etapa 1. A seção 7 guarda a proposta original como referência.

---

## 1. Cores da marca

| Token | Hex | Uso |
| :--- | :--- | :--- |
| Preto | `#000000` | Fundo do modo escuro, texto e botão primário no modo claro |
| Off White | `#DDDDDD` | Fundo do modo claro, texto no modo escuro |
| Laranja | `#FF4B00` | Brilho do botão, selo de confirmação, dia atual, texto de destaque no escuro |
| Roxo índigo | `#4607CD` | Texto de destaque no modo claro e início do gradiente |
| Gradiente | `180deg, #4607CD para #FF4B00` | Anel, barra do dia atual, mapa de calor, avatar |

Os cartões e as superfícies abaixo foram **derivados** da paleta para suavizar a interface. Eles não vêm do guia da marca.

## 2. Temas

| Papel | Claro | Escuro |
| :--- | :--- | :--- |
| `bg` (fundo) | `#DDDDDD` | `#000000` |
| `card` (cartão e barra de abas) | `#F2F2F2` | `#141414` |
| `sunk` (trilhas, chips, círculos de ícone) | `#D0D0D0` | `#222222` |
| `ink` (texto e botão primário) | `#000000` | `#DDDDDD` |
| `onInk` (texto sobre o botão primário) | `#DDDDDD` | `#000000` |
| `mute` (texto secundário) | `#474747` | `#9C9C9C` |
| `hair` (segmentos vazios e contorno de campos) | `rgba(0,0,0,0.16)` | `rgba(221,221,221,0.20)` |
| `accent` (preenchimentos) | `#FF4B00` | `#FF4B00` |
| `accentText` (texto de destaque) | `#4607CD` | `#FF4B00` |
| `placeholder` | `#5E5E5E` | `#8F8F8F` |
| `overlay` (fundo do sheet) | `rgba(0,0,0,0.50)` | `rgba(0,0,0,0.62)` |

### Rampa do gradiente (4 níveis)

Usada na intensidade do calendário e do mapa de calor, e nos segmentos do anel (5 segmentos, interpolação linear).

| Nível | Claro | Escuro | Regra no calendário |
| :-: | :--- | :--- | :--- |
| 1 | `#4607CD` | `#7A4DFF` | 1 a 2 ações |
| 2 | `#841E89` | `#A64CAA` | 3 a 4 ações |
| 3 | `#C13444` | `#D34C55` | 5 ações |
| 4 | `#FF4B00` | `#FF4B00` | 6 ou mais |

No modo escuro o início da rampa é clareado (`#7A4DFF`) porque o índigo puro some contra o preto.

## 3. Tipografia

- **Família:** Nohemi, com Sora como substituta nos mockups. Pilha de fallback: `Nohemi, Sora, system-ui, sans-serif`.
- **Licença:** Nohemi exige licença comercial para distribuição. Confirme antes do `.apk`.

| Uso | Tamanho | Peso | Espaçamento de letras |
| :--- | :-: | :-: | :-: |
| Número grande do anel | 48 | 300 | -0,03em |
| Wordmark | 40 | 300 ("Blue") e 700 ("print") | -0,04em |
| Título de tela (h1) | 30 | 400 | -0,02em |
| Título de sheet | 26 | 400 | -0,02em |
| Mês no calendário e título de cartão | 19 | 400 | -0,02em |
| Título de seção | 17 | 600 | 0 |
| Texto principal | 16 | 500 | 0 |
| Texto de apoio | 14 a 15 | 400 a 500 | 0 |
| Legenda e rótulo de aba | 12 a 13 | 400 a 500 | 0 |

## 4. Formas e espaçamento

| Elemento | Valor |
| :--- | :--- |
| Raio do cartão de progresso | 28 |
| Raio de cartões e gráficos | 24 |
| Raio de cartões de categoria | 22 |
| Raio de botão primário e itens da barra de abas | 18 |
| Raio de campos de texto | 16 |
| Raio de chips e seletores | 999 (pílula) |
| Margem lateral da tela | 16 (20 no cadastro) |
| Espaço entre cartões | 12 |
| Altura mínima de toque | 44 |
| Altura do botão primário | 56 |
| Altura de campo de texto | 52 |
| Cartão de categoria | 108 de altura, linha "Outro" com 76 |

## 5. Sombras

| Papel | Claro | Escuro |
| :--- | :--- | :--- |
| Cartão | `0 8px 24px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)` | nenhuma (separação por tom) |
| Brilho laranja (botão primário e cartão selecionado) | `0 10px 26px rgba(255,75,0,0.30)` | `0 10px 26px rgba(255,75,0,0.32)` |
| Barra de abas | `0 -10px 28px rgba(0,0,0,0.07)` | nenhuma |
| Bottom sheet | `0 -16px 40px rgba(0,0,0,0.22)` | `0 -16px 40px rgba(0,0,0,0.22)` |

**React Native:** use `shadowColor`, `shadowOffset`, `shadowOpacity` e `shadowRadius` no iOS e `elevation` no Android. O Android não reproduz o desfoque do CSS de forma idêntica, e `shadowColor` colorido só tem efeito a partir da API 28. Valide no aparelho.

## 6. Motion

Curva padrão: `cubic-bezier(0.2, 0.8, 0.2, 1)` (`Easing.bezier(0.2, 0.8, 0.2, 1)` no Reanimated).

| Momento | Efeito | Duração | Atraso |
| :--- | :--- | :-: | :--- |
| Entrada de blocos e cartões | Sobe 10px e aparece | 600 ms | 60 ms entre itens |
| Anel de progresso | Cada segmento é desenhado | 800 ms | começa em 200 ms, 100 ms entre segmentos |
| Número do anel | Aparece | 600 ms | 250 ms |
| Barras do gráfico semanal | Crescem de baixo para cima | 850 ms | 70 ms entre barras |
| Células do mapa de calor e do calendário | Surgem com escala 0,6 para 1 | 500 ms | por coluna, 30 a 45 ms |
| Bottom sheet | Sobe de baixo | 600 ms | 0 |
| Toast | Sobe e aparece | 550 ms | 300 ms |
| Toque em botão | Desloca 2px e escala 0,99 | 220 ms | 0 |

**Reduzir movimento:** quando o sistema pedir (`AccessibilityInfo.isReduceMotionEnabled()` no React Native), todas as animações são substituídas por troca instantânea. Valide o suporte equivalente na versão instalada do Reanimated.

## 7. Proposta de tokens para `theme.js` (Fase 2)

```js
export const BRAND = {
  black: "#000000",
  offWhite: "#DDDDDD",
  orange: "#FF4B00",
  indigo: "#4607CD",
};

export const THEMES = {
  light: {
    background: "#DDDDDD",
    card: "#F2F2F2",
    sunk: "#D0D0D0",
    text: "#000000",
    textOnPrimary: "#DDDDDD",
    subtext: "#474747",
    hairline: "rgba(0,0,0,0.16)",
    accent: "#FF4B00",
    accentText: "#4607CD",
    placeholder: "#5E5E5E",
    gradient: ["#4607CD", "#FF4B00"],
    ramp: ["#4607CD", "#841E89", "#C13444", "#FF4B00"],
  },
  dark: {
    background: "#000000",
    card: "#141414",
    sunk: "#222222",
    text: "#DDDDDD",
    textOnPrimary: "#000000",
    subtext: "#9C9C9C",
    hairline: "rgba(221,221,221,0.20)",
    accent: "#FF4B00",
    accentText: "#FF4B00",
    placeholder: "#8F8F8F",
    gradient: ["#7A4DFF", "#FF4B00"],
    ramp: ["#7A4DFF", "#A64CAA", "#D34C55", "#FF4B00"],
  },
};
```

## 8. Acessibilidade: contrastes calculados

Razão de contraste WCAG 2.x entre as cores abaixo (calculada em 2026-10-17). Referência: 4,5:1 para texto normal, 3:1 para texto grande e para elementos gráficos.

| Par | Razão | Avaliação |
| :--- | :-: | :--- |
| Claro: texto `#000000` sobre fundo `#DDDDDD` | 15,46 | Passa |
| Claro: texto `#000000` sobre cartão `#F2F2F2` | 18,76 | Passa |
| Claro: secundário `#474747` sobre fundo | 6,84 | Passa |
| Claro: secundário `#474747` sobre cartão | 8,30 | Passa |
| Claro: roxo `#4607CD` sobre fundo | 7,12 | Passa |
| Claro: roxo `#4607CD` sobre cartão | 8,64 | Passa |
| Claro: placeholder `#5E5E5E` sobre cartão | 5,79 | Passa |
| Escuro: texto `#DDDDDD` sobre fundo `#000000` | 15,46 | Passa |
| Escuro: texto `#DDDDDD` sobre cartão `#141414` | 13,56 | Passa |
| Escuro: secundário `#9C9C9C` sobre cartão | 6,71 | Passa |
| Escuro: laranja `#FF4B00` sobre fundo | 6,26 | Passa |
| Escuro: laranja `#FF4B00` sobre cartão | 5,49 | Passa |
| Escuro: placeholder `#8F8F8F` sobre cartão | 5,70 | Passa |
| Texto preto sobre laranja (selo) | 6,26 | Passa |
| Texto branco sobre laranja (iniciais do avatar, 22px, peso 600) | 3,36 | Passa apenas como texto grande |
| **Claro: laranja `#FF4B00` sobre fundo `#DDDDDD`** | **2,47** | **Não passa como elemento gráfico (3:1)** |
| **Superfície do cartão sobre o fundo (claro 1,21 e escuro 1,14)** | **baixa** | **Separação visual fraca por tom** |

### Pontos de atenção e mitigação
1. **Laranja no modo claro:** os segmentos laranja do anel e a barra do dia atual têm contraste gráfico abaixo de 3:1. A informação não depende só da cor: o número fica no centro do anel (`3 de 5`) e cada barra do gráfico tem o valor escrito acima. **Não use laranja como cor de texto no modo claro.**
2. **Cartões sem bordas:** a separação entre cartão e fundo é sutil por escolha de design. Nenhuma informação depende só dessa separação, mas telas com muito conteúdo podem parecer "achatadas". Se testes de usabilidade apontarem problema, reintroduza um contorno de 1px com `hairline`.
3. **Campos de texto** mantêm contorno de 1px com `hairline` para atender ao requisito de identificação do componente.
4. **Alvos de toque:** todos os controles interativos têm pelo menos 44 de altura. O item de aba tem 56 de altura e largura aproximada de 83.
5. **Leitor de tela:** botões de ícone precisam de `accessibilityLabel` ("Modo claro", "Mostrar senha", "Semana anterior") e as categorias de `accessibilityState={{ selected }}`.
