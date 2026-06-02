import { confirm } from '@inquirer/prompts';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSAO = '0.1.0';
const DIRETORIO_ATUAL = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_AGENTS = path.join(DIRETORIO_ATUAL, '..', 'templates', 'AGENTS.md');

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
