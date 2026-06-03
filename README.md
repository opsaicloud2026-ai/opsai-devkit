# OpsAI Setup

[![Node.js 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> Configura o ambiente de desenvolvimento com agentes de IA em qualquer
> projeto — novo ou existente, qualquer linguagem ou framework.

## O que faz

- Pergunta quais agentes de IA você usa (Claude Code, Codex, Kimi, Antigravity, Copilot)
- Instala Compozy e Skeeper automaticamente
- Configura o Compozy apenas para os agentes selecionados
- Oferece configuração do repositório de specs (Skeeper)
- Instala a skill `cy-resolve-skills` em todos os agentes selecionados
- Gera `AGENTS.md` com as regras do projeto
- Exibe os próximos passos claramente

## Pré-requisitos

- Node.js 18+
- Git
- Agentes de IA instalados (Claude Code, Codex, etc.)

## Como usar

### Projeto novo
```bash
# Crie a pasta do projeto
mkdir meu-projeto && cd meu-projeto

# Rode o setup
npx opsai-setup
```

### Projeto existente
```bash
cd meu-projeto-existente
npx opsai-setup
```

## Fluxo completo após o setup

```
opsai-setup
  └→ compozy setup (instala skills do Compozy)
  └→ cy-resolve-skills instalada em .agents/skills/

No seu agente (Claude Code, Codex, etc.):
  /cy-create-prd        ← inicia brainstorm e cria o PRD
  /cy-create-techspec   ← cria a especificação técnica
  /cy-create-tasks      ← quebra em tasks executáveis
  /cy-resolve-skills    ← identifica e instala skills por task (automático)
  /cy-execute-task      ← executa cada task
  /cy-final-verify      ← verifica a entrega
```

## cy-resolve-skills

Skill instalada automaticamente pelo `opsai-setup`. Roda após o
`cy-create-tasks` e faz três coisas:

1. Acessa o repositório de skills configurado (Tech Leads Club por padrão)
2. Cruza o perfil técnico de cada task com as skills disponíveis
3. Instala a skill confirmada e registra dentro da task

Resultado: cada task sai com a skill que o agente deve usar — sem
precisar buscar, sem perder contexto.

## Repositório de skills

O padrão é o catálogo da Tech Leads Club. Você pode usar qualquer outro:

```
❯ Tech Leads Club (padrão)
  Outro repositório GitHub (informar URL)
  Caminho local
```

A skill acessa o repositório diretamente via API ou filesystem —
sem dependência de CLI externo.

## Limitações conhecidas

- Kimi Code 0.6.0 não suporta instalação de skills sem `--skills-dir`
- Catálogo Tech Leads Club não cobre Prisma ORM, Zod e tRPC (lacunas conhecidas)
- Repositório GitHub externo e caminho local testados apenas em ambiente de desenvolvimento

## Contribuindo

PRs são bem-vindos, especialmente:
- Skills para stacks não cobertos (Prisma, Drizzle, tRPC, etc.)
- Suporte a novos agentes de IA
- Testes automatizados

---

# OpsAI Setup (English)

> Sets up the AI agent development environment for any project — new or
> existing, any language or framework.

## What it does

- Asks which AI agents you use (Claude Code, Codex, Kimi, Antigravity, Copilot)
- Installs Compozy and Skeeper automatically
- Configures Compozy only for the selected agents
- Offers spec repository setup (Skeeper)
- Installs the `cy-resolve-skills` skill for all selected agents
- Generates `AGENTS.md` with project rules
- Displays clear next steps

## Prerequisites

- Node.js 18+
- Git
- AI agents installed (Claude Code, Codex, etc.)

## How to use

### New project
```bash
# Create the project folder
mkdir my-project && cd my-project

# Run the setup
npx opsai-setup
```

### Existing project
```bash
cd my-existing-project
npx opsai-setup
```

## Full workflow after setup

```
opsai-setup
  └→ compozy setup (installs Compozy skills)
  └→ cy-resolve-skills installed in .agents/skills/

In your agent (Claude Code, Codex, etc.):
  /cy-create-prd        ← starts brainstorm and creates the PRD
  /cy-create-techspec   ← creates the technical specification
  /cy-create-tasks      ← breaks down into executable tasks
  /cy-resolve-skills    ← identifies and installs skills per task (automatic)
  /cy-execute-task      ← executes each task
  /cy-final-verify      ← verifies the delivery
```

## cy-resolve-skills

Skill installed automatically by `opsai-setup`. Runs after
`cy-create-tasks` and does three things:

1. Accesses the configured skills repository (Tech Leads Club by default)
2. Cross-references each task's technical profile with available skills
3. Installs the confirmed skill and registers it inside the task

Result: each task comes out with the skill the agent should use — no
searching needed, no context lost.

## Skills repository

The default is the Tech Leads Club catalog. You can use any other:

```
❯ Tech Leads Club (default)
  Another GitHub repository (enter URL)
  Local path
```

The skill accesses the repository directly via API or filesystem —
no external CLI dependency.

## Known limitations

- Kimi Code 0.6.0 does not support skill installation without `--skills-dir`
- Tech Leads Club catalog does not cover Prisma ORM, Zod, and tRPC (known gaps)
- External GitHub repository and local path tested only in development environment

## Contributing

PRs are welcome, especially:
- Skills for uncovered stacks (Prisma, Drizzle, tRPC, etc.)
- Support for new AI agents
- Automated tests
