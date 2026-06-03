# Acesso ao repositorio de skills

Use este documento para obter a lista real de skills disponiveis conforme o
valor de `skills_repo` em `.opsai-setup.json`.

Regra fundamental: **nunca chame CLI externo** para listar skills. Acesse a
fonte diretamente — via API GitHub para repositorios remotos, via filesystem
para caminhos locais.

---

## Tech Leads Club (padrao)

Quando `skills_repo` for `"tech-leads-club"`:

**Repositorio:** `https://github.com/tech-leads-club/agent-skills`

**Listar skills:**

```text
GET https://api.github.com/repos/tech-leads-club/agent-skills/contents/packages/skills-catalog/skills
```

Resposta: array de objetos. Filtre `type: "dir"`. Cada diretorio e uma skill.

**Ler SKILL.md de uma skill:**

```text
GET https://raw.githubusercontent.com/tech-leads-club/agent-skills/main/packages/skills-catalog/skills/{nome}/SKILL.md
```

---

## GitHub publico ou privado (URL)

Quando `skills_repo` for uma URL do GitHub.

**Extrair owner e repo:**

Aceita:
- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

**Listar conteudo da raiz:**

```text
GET https://api.github.com/repos/{owner}/{repo}/contents/
```

**Identificar padrao de organizacao:**

| Padrao | Como detectar | Como listar |
|---|---|---|
| Pasta `skills/` | Existe `skills/` na raiz | `GET .../contents/skills` |
| Subpastas com SKILL.md | SKILL.md em varias subpastas | Itere subpastas e verifique `SKILL.md` |
| Flat (SKILL.md na raiz) | Um unico SKILL.md na raiz | Leia o proprio `SKILL.md` |

**Ler SKILL.md:**

```text
GET https://raw.githubusercontent.com/{owner}/{repo}/main/{caminho-da-skill}/SKILL.md
```

Ajuste o branch (`main`, `master`, etc.) conforme o repositorio.

Para repositorios privados, use as credenciais GitHub ja disponiveis no ambiente
do usuario. Nao solicite nem grave tokens em arquivo.

---

## Caminho local

Quando `skills_repo` comeca com `/` ou `./`.

**Listar subpastas:**

Leia o diretorio do caminho configurado. Para cada subpasta, verifique a
existencia de `SKILL.md`.

**Localizar SKILL.md:**

```bash
find <caminho> -mindepth 2 -maxdepth 2 -name SKILL.md -print
```

Ou, se houver pasta `skills/` dentro do caminho:

```bash
find <caminho>/skills -maxdepth 2 -name SKILL.md -print
```

Normalize o nome da skill pelo nome da pasta que contem o `SKILL.md`.

---

## Estrutura esperada de SKILL.md

Cada skill deve ter um `SKILL.md` com frontmatter YAML no inicio:

```markdown
---
name: nome-da-skill
description: >
  Descricao curta do que a skill faz e quando usar.
---

# Titulo da skill

Conteudo da skill...
```

**Campos obrigatorios no frontmatter:**
- `name`: identificador unico da skill
- `description`: texto para exibir ao usuario

**Como extrair:**
1. Leia o conteudo do `SKILL.md`
2. Separe o frontmatter entre `---` (primeiras linhas)
3. Parseie como YAML
4. Extraia `name` e `description`

---

## Fallback quando o repositorio nao e acessivel

Se qualquer tentativa de acesso falhar (rede indisponivel, repositorio nao
encontrado, permissao negada, etc.):

1. Informe o erro claramente ao usuario
2. Pergunte:
   - "Deseja informar outro repositorio de skills?"
   - "Ou prefere pular a resolucao de skills por agora?"
3. Se informar outro repositorio:
   - Atualize `.opsai-setup.json` com o novo `skills_repo`
   - Tente novamente o Passo 2
4. Se pular:
   - Pule a instalacao de skills
   - Registre na task: `Skill: nao resolvida — repositorio inacessivel`
   - Continue com o fluxo normal
