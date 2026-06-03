# AGENTS.md

Gerado pelo `opsai-setup` em {{data}}.

## Projeto

- Nome: TODO: preencher nome do projeto
- Data: {{data}}
- Agentes configurados: {{agentes}}
- Repositorio de skills: {{skills_repo}}

## Fluxo de trabalho

Use o Compozy como fluxo tecnico principal:

1. PRD
2. TechSpec
3. Tasks
4. Execute

## Regras universais

TODO: usuario preenche depois.

## Skills

- Repositorio configurado: {{skills_repo}}
- Instalacao de skills via `cy-resolve-skills` na Fase 2.

## Anti-padroes

TODO: usuario preenche depois.

## Próximos passos
- Projeto novo: inicie com `/cy-create-prd` no seu agente
- Projeto existente: inicie com `/cy-resolve-skills` para mapear skills das tasks
- Fluxo completo: cy-create-prd → cy-create-techspec → cy-create-tasks →
  cy-resolve-skills → cy-execute-task → cy-final-verify
