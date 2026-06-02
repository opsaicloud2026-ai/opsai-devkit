import { checkbox, input, select } from '@inquirer/prompts';

const AGENTES = [
  'Claude Code',
  'Codex',
  'Kimi',
  'Antigravity',
  'GitHub Copilot',
];

const TECH_LEADS_CLUB = 'tech-leads-club';
const OUTRO_REPOSITORIO = 'outro';

export async function perguntarConfiguracao() {
  const agentes = await checkbox({
    message: 'Quais agentes voce usa?',
    choices: AGENTES.map((agente) => ({
      name: agente,
      value: agente,
    })),
    required: true,
  });

  const tipoRepositorio = await select({
    message: 'Repositorio de skills:',
    default: TECH_LEADS_CLUB,
    choices: [
      {
        name: 'Tech Leads Club',
        value: TECH_LEADS_CLUB,
      },
      {
        name: 'Outro (digitar URL)',
        value: OUTRO_REPOSITORIO,
      },
    ],
  });

  if (tipoRepositorio === OUTRO_REPOSITORIO) {
    const url = await input({
      message: 'URL do repositorio de skills:',
      required: true,
      validate: (valor) => {
        const urlInformada = valor.trim();
        return urlInformada.length > 0 || 'Informe a URL do repositorio.';
      },
    });

    return {
      agentes,
      skills_repo: url.trim(),
    };
  }

  return {
    agentes,
    skills_repo: TECH_LEADS_CLUB,
  };
}
