# Blueprint (React Native + Expo + Supabase)

App de registro de hábitos com 1 toque. Documentação em `docs/`; roteiro de desenvolvimento em `docs/06-roteiro-claude-code.md`.

## Regras de trabalho
- Trabalhar por etapas (docs/06), uma por vez, sem avançar sem aprovação.
- Por etapa: plano curto e "ok" -> branch `feat/etapa-N-nome` a partir de `develop` -> implementar -> lint, typecheck e testes (mostrar resultado real) -> checklist de teste manual no Expo Go -> corrigir -> commit só após aprovação; pedir confirmação antes do push.
- Código tipado (TypeScript), modular, com tratamento de erros, sem TODO.
- Cores, espaços e raios vêm de `theme.ts`, sem hex solto. Seguir `docs/04-design-tokens-e-motion.md`.
- O design vence o código. Telas de referência em `docs/assets/telas/`; fontes do canvas em `docs/design/canvas-source/`.
- Validar APIs na documentação oficial da versão instalada do Expo SDK.
- Nunca versionar segredos (`.env`). Nunca aplicar migração no Supabase sem revisão do dono.
- Commits em Conventional Commits, em português, sem menção a assistentes de IA.
- Não rodar processos que travem o terminal (o servidor Expo roda em outro terminal).
- Responder em português do Brasil, direto e técnico. Sem travessões.
