# Acesso ao repositorio de skills

Use este documento para obter a lista real de skills disponiveis conforme o
valor de `skills_repo` em `.opsai-setup.json`.

## Tech Leads Club (padrao)

Listar skills:

```bash
npx @tech-leads-club/agent-skills list
```

Use a saida do comando como fonte de verdade para os nomes das skills.

## GitHub publico ou privado (URL)

Extraia `owner` e `repo` da URL.

Exemplos aceitos:

- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

Listar conteudo da raiz:

```text
GET https://api.github.com/repos/{owner}/{repo}/contents/
```

Filtre itens com `type="dir"`.

Para cada diretorio, verifique se existe `SKILL.md`:

```text
GET https://api.github.com/repos/{owner}/{repo}/contents/{dir}/SKILL.md
```

Somente diretorios que contem `SKILL.md` sao skills disponiveis.

Para repositorios privados, use as credenciais GitHub ja disponiveis no ambiente
do usuario. Nao solicite nem grave tokens em arquivo.

## Caminho local

Liste as subpastas do caminho configurado:

```bash
ls <caminho>/
```

Cada subpasta que contem `SKILL.md` e uma skill disponivel.

Exemplo de verificacao:

```bash
find <caminho> -mindepth 2 -maxdepth 2 -name SKILL.md -print
```

Normalize o nome da skill pelo nome da pasta que contem o `SKILL.md`.
