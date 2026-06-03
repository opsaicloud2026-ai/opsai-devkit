---
name: cy-resolve-skills
description: >
  Executa automaticamente apos cy-create-tasks. Le o repositorio de skills
  configurado em .opsai-setup.json (Tech Leads Club por padrao, mas aceita
  qualquer repositorio GitHub ou local), identifica as skills disponiveis,
  cruza com o perfil tecnico de cada task criada, verifica o que ja esta
  instalado, e recomenda e instala a skill correta por task apos confirmacao
  do usuario. Insere a skill confirmada na task para que cy-execute-task
  saiba qual usar sem buscar.
---

# cy-resolve-skills

Esta skill conecta as tasks geradas pelo Compozy ao repositorio de skills
configurado pelo usuario no `opsai-setup`.

Nunca hardcode o repositorio de skills. Sempre leia `.opsai-setup.json` na raiz
do projeto antes de listar, sugerir ou instalar qualquer skill.

## Passo 1 - Ler configuracao do projeto

Leia `.opsai-setup.json` na raiz do projeto.

Extraia:

- `skills_repo`: repositorio configurado.
- `agentes`: lista de agentes instalados.

Valores aceitos para `skills_repo`:

- `"tech-leads-club"`: usar CLI `npx @tech-leads-club/agent-skills list`.
- URL GitHub, por exemplo `https://github.com/user/my-skills`: listar via GitHub
  API em `GET https://api.github.com/repos/{owner}/{repo}/contents/` e filtrar
  pastas que contem `SKILL.md`.
- Caminho local comecando com `/` ou `./`: listar pastas locais que contem
  `SKILL.md`.

Se `.opsai-setup.json` nao existir, pare e instrua o usuario a rodar
`opsai-setup` primeiro.

## Passo 2 - Obter lista de skills disponiveis no repositorio

Com base em `skills_repo`, obtenha a lista real de skills disponiveis.

Consulte `references/repo-access.md` para os comandos por tipo de repositorio.

Esta lista e a fonte de verdade. Nunca sugira uma skill que nao esteja nela.

## Passo 3 - Verificar skills ja instaladas

Para cada agente em `agentes`, verifique quais skills ja estao instaladas:

- Claude Code: listar `.claude/skills/`.
- Codex: listar `.codex/skills/`.
- Outros agentes: listar diretorio equivalente se existir.

Monte um conjunto de skills ja presentes para evitar reinstalacao.

Se uma pasta de agente nao existir, trate como nenhuma skill instalada para esse
agente e continue.

## Passo 4 - Ler as tasks criadas pelo Compozy

Leia todos os arquivos `task_NN.md` em `.compozy/tasks/<feature>/`.

Para cada task:

- Se ja tiver campo `Skill:` no frontmatter, marque como ja resolvida e pule.
- Se nao tiver, analise o conteudo e identifique o perfil tecnico.

Se houver mais de uma pasta em `.compozy/tasks/`, processe todas. Se nao houver
tasks, informe o usuario e finalize sem erro.

## Passo 5 - Cruzar perfil da task com skills disponiveis

Para cada task sem skill definida:

1. Identifique o tipo tecnico, como componente UI, API, teste, auth, deploy,
   debugging, documentacao ou outro perfil aplicavel.
2. Consulte `references/skill-catalog.md` como ponto de partida para sugestoes
   por tipo.
3. Cruze as sugestoes com a lista real do repositorio obtida no Passo 2.
4. Sugira somente skills existentes no repositorio.
5. Verifique se a skill ja esta instalada conforme o Passo 3.
6. Se ja estiver instalada, marque como ja instalada.
7. Se nao encontrar correspondencia, marque como sem skill disponivel.

## Passo 6 - Apresentar ao usuario uma task de cada vez

Para cada task com skill recomendada, apresente:

```text
Task 02 - [titulo da task]
Perfil: componente UI com validacao
Skill recomendada: react + zod
Status: nao instalada
Repositorio: [valor do skills_repo]
Instalar para: Claude Code, Codex
Confirma? [S/n/outra]
```

Se o usuario confirmar, siga para instalacao ou registro.

Se o usuario negar, nao instale e nao registre skill nessa task.

Se o usuario digitar `outra`, peca o nome da skill que deseja usar. Valide que
ela existe na lista real do repositorio antes de aceitar. Se nao existir,
explique que a skill nao esta disponivel no repositorio configurado e peca outra
opcao.

## Passo 7 - Instalar skills confirmadas

> **IMPORTANTE:** Nunca instale skills diretamente nas pastas de agente.
> Sempre instale em `.agents/skills/` e crie symlinks.
> Isso garante que todos os agentes usem a mesma versao.

### 7.1 Instalar a skill centralizada

Se `skills_repo` for `"tech-leads-club"`:

1. Instale a skill em `.agents/skills/` em vez da pasta do agente:

   ```bash
   npx @tech-leads-club/agent-skills install -s <skill> -a agents
   ```

   Se o CLI nao suportar instalação em `.agents/skills/` diretamente, use esta
   alternativa:

   ```bash
   # Instale para claude-code (vai para .claude/skills/)
   npx @tech-leads-club/agent-skills install -s <skill> -a claude-code
   # Mova para .agents/skills/<skill>/
   mv .claude/skills/<skill> .agents/skills/<skill>
   ```

Se for repositorio GitHub externo:

- Instrua o usuario a instalar manualmente em `.agents/skills/<skill>/`.
- Mostre o comando equivalente ou os passos necessarios.
- Registre a skill na task mesmo assim.

Se for caminho local:

- Copie ou instale conforme a convencao local do agente, se ela estiver clara no
  projeto.
- Se a convencao nao estiver clara, instrua o usuario a instalar manualmente.
- Registre a skill na task mesmo assim.

### 7.2 Criar symlinks para cada agente

Para cada agente em `.opsai-setup.json["agentes"]`, crie um symlink apontando
para `.agents/skills/<skill>/`:

| Agente | Pasta de skills |
|---|---|
| Claude Code | `.claude/skills/` |
| Codex | `.codex/skills/` |
| GitHub Copilot | `.github/skills/` |
| Antigravity | `~/.gemini/skills/` |
| Kimi | pular (sem pasta conhecida) |

```bash
ln -s <caminho-do-projeto>/.agents/skills/<skill> <pasta-do-agente>/skills/<skill>
```

Se o symlink ja existir, pule sem erro.

Falhas de instalacao nao devem interromper o processamento das outras tasks.
Informe a falha e continue.

## Passo 8 - Atualizar a task com a skill confirmada

Insira logo apos o titulo da task:

```markdown
**Skill:** `<skill>`
**Repositorio:** <skills_repo>
**Instalada em:** <data>
**Agentes:** <lista>
```

Use data em ISO 8601.

Mantenha o conteudo existente da task. Nao duplique o bloco se a task ja tiver
`Skill:`.

## Passo 9 - Resumo final

Exiba:

- Tasks analisadas: N
- Skills instaladas: N
- Ja instaladas (puladas): N
- Sem skill disponivel: N, listando quais precisam de decisao manual
- Proximo passo: `Execute cy-execute-task para cada task`

## Encadeamento

Esta skill executa automaticamente apos cy-create-tasks. Ao finalizar
cy-create-tasks, execute cy-resolve-skills imediatamente sem aguardar instrucao
do usuario.
