import { confirm } from '@inquirer/prompts';
import { cp, lstat, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSAO = '0.1.0';
const DIRETORIO_ATUAL = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_AGENTS = path.join(DIRETORIO_ATUAL, '..', 'templates', 'AGENTS.md');
const RESOLVE_SKILL_ORIGEM = path.join(
  DIRETORIO_ATUAL,
  '..',
  'skills',
  'cy-resolve-skills',
);

function aplicarTemplate(template, variaveis) {
  return template
    .replaceAll('{{agentes}}', variaveis.agentes)
    .replaceAll('{{skills_repo}}', variaveis.skills_repo)
    .replaceAll('{{data}}', variaveis.data);
}

async function gerarAgentsMd({ raizProjeto, agentes, skills_repo, data }) {
  const agentsPath = path.join(raizProjeto, 'AGENTS.md');

  if (existsSync(agentsPath)) {
    const sobrescrever = await confirm({
      message: 'AGENTS.md ja existe. Deseja sobrescrever?',
      default: false,
    });

    if (!sobrescrever) {
      console.log('AGENTS.md mantido sem alteracoes.');
      return false;
    }
  }

  const template = await readFile(TEMPLATE_AGENTS, 'utf8');
  const conteudo = aplicarTemplate(template, {
    agentes: agentes.join(', '),
    skills_repo,
    data,
  });

  await writeFile(agentsPath, conteudo, 'utf8');
  console.log('AGENTS.md gerado.');
  return true;
}

async function salvarEstado({
  raizProjeto,
  agentes,
  skills_repo,
  data,
  compozy,
  skeeper,
}) {
  const estadoPath = path.join(raizProjeto, '.opsai-setup.json');
  const estado = {
    version: VERSAO,
    data,
    agentes,
    skills_repo,
    compozy,
    skeeper,
  };

  await writeFile(estadoPath, `${JSON.stringify(estado, null, 2)}\n`, 'utf8');
  console.log('.opsai-setup.json salvo.');
}

function normalizarAgente(agente) {
  return agente
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function lerOpcaoSkillsDir(argv) {
  const indice = argv.indexOf('--skills-dir');
  if (indice >= 0) {
    return argv[indice + 1];
  }

  const opcaoComValor = argv.find((arg) => arg.startsWith('--skills-dir='));
  if (opcaoComValor) {
    return opcaoComValor.slice('--skills-dir='.length);
  }

  return null;
}

function resolverDiretorioSkills(agente, { raizProjeto, argv }) {
  const agenteNormalizado = normalizarAgente(agente);

  if (agenteNormalizado === 'claude-code') {
    return path.join(raizProjeto, '.claude', 'skills');
  }

  if (agenteNormalizado === 'codex') {
    return path.join(raizProjeto, '.codex', 'skills');
  }

  if (agenteNormalizado === 'kimi') {
    const skillsDir = lerOpcaoSkillsDir(argv);
    if (!skillsDir) {
      console.warn('Kimi selecionado, mas --skills-dir nao foi informado. Pulando.');
      return null;
    }

    return path.resolve(raizProjeto, skillsDir);
  }

  if (agenteNormalizado === 'antigravity') {
    return path.join(homedir(), '.gemini', 'skills');
  }

  if (
    agenteNormalizado === 'github-copilot'
    || agenteNormalizado === 'copilot'
  ) {
    return path.join(raizProjeto, '.github', 'skills');
  }

  console.warn(`Diretorio de skills desconhecido para ${agente}. Pulando.`);
  return null;
}

export async function copyResolveSkill({
  raizProjeto = process.cwd(),
  argv = process.argv.slice(2),
} = {}) {
  const estadoPath = path.join(raizProjeto, '.opsai-setup.json');

  if (!existsSync(estadoPath)) {
    console.warn('.opsai-setup.json nao encontrado. Pulando cy-resolve-skills.');
    return;
  }

  if (!existsSync(RESOLVE_SKILL_ORIGEM)) {
    console.warn('Skill cy-resolve-skills nao encontrada no opsai-setup. Pulando.');
    return;
  }

  let estado;
  try {
    estado = JSON.parse(await readFile(estadoPath, 'utf8'));
  } catch (erro) {
    const detalhe = erro?.message ? ` ${erro.message}` : '';
    console.warn(`Falha ao ler .opsai-setup.json.${detalhe}`);
    return;
  }

  const agentes = Array.isArray(estado.agentes) ? estado.agentes : [];

  const agentesSkillsDir = path.join(raizProjeto, '.agents', 'skills');
  const destinoPrincipal = path.join(agentesSkillsDir, 'cy-resolve-skills');

  if (!existsSync(destinoPrincipal)) {
    try {
      await mkdir(agentesSkillsDir, { recursive: true });
      await cp(RESOLVE_SKILL_ORIGEM, destinoPrincipal, { recursive: true });
      console.log('cy-resolve-skills instalada em .agents/skills/');
    } catch (erro) {
      const detalhe = erro?.message ? ` ${erro.message}` : '';
      console.warn(`Falha ao instalar cy-resolve-skills em .agents/skills/.${detalhe}`);
      return;
    }
  }

  for (const agente of agentes) {
    const skillsDir = resolverDiretorioSkills(agente, { raizProjeto, argv });
    if (!skillsDir) {
      console.warn(`Diretorio de skills nao encontrado para ${agente}. Pulando.`);
      continue;
    }

    const linkPath = path.join(skillsDir, 'cy-resolve-skills');

    if (existsSync(linkPath)) {
      let ehSymlink = false;
      try {
        const stats = await lstat(linkPath);
        if (stats.isSymbolicLink()) {
          ehSymlink = true;
          console.log(`cy-resolve-skills ja instalada para ${agente}`);
        }
      } catch {
        // ignora erro de lstat
      }

      if (ehSymlink) {
        continue;
      }

      try {
        await rm(linkPath, { recursive: true });
      } catch (erro) {
        const detalhe = erro?.message ? ` ${erro.message}` : '';
        console.warn(`Falha ao remover cy-resolve-skills antiga para ${agente}.${detalhe}`);
        continue;
      }
    }

    try {
      await mkdir(skillsDir, { recursive: true });
      await symlink(destinoPrincipal, linkPath, 'dir');
      console.log(`cy-resolve-skills instalada para ${agente}`);
    } catch (erro) {
      const detalhe = erro?.message ? ` ${erro.message}` : '';
      console.warn(`Falha ao instalar cy-resolve-skills para ${agente}.${detalhe}`);
    }
  }
}

export async function prepararProjeto({
  raizProjeto = process.cwd(),
  agentes,
  skills_repo,
  compozy,
  skeeper,
}) {
  const data = new Date().toISOString();

  await mkdir(raizProjeto, { recursive: true });

  try {
    await gerarAgentsMd({
      raizProjeto,
      agentes,
      skills_repo,
      data,
    });
  } catch (erro) {
    const detalhe = erro?.message ? ` ${erro.message}` : '';
    console.warn(`Falha ao gerar AGENTS.md.${detalhe}`);
  }

  try {
    await salvarEstado({
      raizProjeto,
      agentes,
      skills_repo,
      data,
      compozy,
      skeeper,
    });
  } catch (erro) {
    const detalhe = erro?.message ? ` ${erro.message}` : '';
    console.warn(`Falha ao salvar .opsai-setup.json.${detalhe}`);
  }
}
