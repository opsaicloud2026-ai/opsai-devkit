import { checkbox, confirm } from "@inquirer/prompts";

export const AGENT_CHOICES = [
  { name: "Claude Code", value: "claude" },
  { name: "Codex", value: "codex" },
  { name: "Kimi", value: "kimi" },
  { name: "Antigravity", value: "antigravity" },
  { name: "GitHub Copilot", value: "copilot" },
];

export async function askSetupQuestions() {
  if (process.env.OPSAI_SETUP_NONINTERACTIVE === "1") {
    const agents = (process.env.OPSAI_SETUP_AGENTS ?? "")
      .split(",")
      .map((agent) => agent.trim())
      .filter(Boolean);

    return {
      agents,
      connectMcp: process.env.OPSAI_SETUP_MCP !== "0",
    };
  }

  const agents = await checkbox({
    message: "Quais agentes de IA você tem instalados?",
    choices: AGENT_CHOICES,
    pageSize: AGENT_CHOICES.length,
  });

  const connectMcp = await confirm({
    message: "Deseja conectar o catálogo de skills via MCP?",
    default: true,
  });

  return { agents, connectMcp };
}
