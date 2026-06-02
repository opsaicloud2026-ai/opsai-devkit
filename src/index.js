#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectProject } from "./detect.js";
import { askSetupQuestions } from "./prompts.js";
import { installBaseTools } from "./install.js";
import { configureMcpForAgents } from "./mcp.js";
import { ensureAgentsMarkdown } from "./templates.js";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(MODULE_DIR, "..");

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
    );
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function readExistingAudit(auditPath) {
  try {
    return JSON.parse(fs.readFileSync(auditPath, "utf8"));
  } catch {
    return null;
  }
}

function writeAudit(cwd, runData) {
  const auditPath = path.join(cwd, ".opsai-setup.json");
  const existing = readExistingAudit(auditPath);
  const previousRuns = Array.isArray(existing?.runs) ? existing.runs : [];
  const runs = [...previousRuns.slice(-9), runData];

  const audit = {
    version: runData.version,
    lastRunAt: runData.date,
    detectedProject: runData.detectedProject,
    selectedAgents: runData.selectedAgents,
    mcpRequested: runData.mcpRequested,
    tools: runData.tools,
    initializers: runData.initializers,
    mcp: runData.mcp,
    generatedFiles: runData.generatedFiles,
    todos: runData.todos,
    uncertainties: runData.uncertainties,
    runs,
  };

  fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
  return auditPath;
}

async function main() {
  const cwd = process.cwd();
  const version = readPackageVersion();
  const date = new Date().toISOString();
  const todos = [
    "Preencher as regras universais em AGENTS.md.",
    "Configurar manualmente o sidecar remoto do Skeeper, se aplicável.",
  ];
  const uncertainties = [
    "Comando exato de init do Compozy: detectado em tempo de execução via `compozy --help`; se `init` não aparecer, o setup pula.",
    "Comando exato de init do Skeeper: detectado em tempo de execução via `skeeper --help`; se `init` não aparecer, o setup pula.",
    "Config MCP do Codex: melhor esforço em ~/.codex/config.toml usando [mcp_servers.\"agent-skills\"]. Validar sintaxe oficial.",
    "Config MCP do Kimi: melhor esforço em ~/.kimi/config.json, ~/.config/kimi/config.json ou ~/.config/kimi/mcp_config.json. Validar local oficial.",
    "Config MCP do GitHub Copilot: melhor esforço em .vscode/mcp.json ou ~/.config/github-copilot/mcp.json. Validar local oficial.",
  ];

  console.log("opsai-setup: setup técnico de agentes de IA");
  console.log(`Projeto-alvo: ${cwd}`);

  const detectedProject = detectProject(cwd);
  console.log(`Detectei: ${detectedProject.label}`);

  let answers;
  try {
    answers = await askSetupQuestions();
  } catch (error) {
    console.error(`Perguntas interativas falharam: ${error.message}`);
    answers = { agents: [], connectMcp: false };
  }

  console.log("Preparando ferramentas base...");
  const installResult = await installBaseTools(cwd);

  let mcpResults = [];
  if (answers.connectMcp) {
    console.log("Conectando catálogo de skills via MCP...");
    mcpResults = await configureMcpForAgents(answers.agents, cwd);
  } else {
    console.log("MCP não solicitado. Pulando configuração dos agentes.");
  }

  console.log("Gerando AGENTS.md...");
  const agentsMarkdown = ensureAgentsMarkdown({
    cwd,
    detectedProject,
    date: new Date(date),
  });

  if (agentsMarkdown.status === "created") {
    console.log(`AGENTS.md criado em ${agentsMarkdown.path}`);
  } else if (agentsMarkdown.status === "already-exists") {
    console.log(`AGENTS.md já existia. ${agentsMarkdown.reason}`);
  } else {
    console.log(`AGENTS.md não gerado. ${agentsMarkdown.reason}`);
  }

  const auditPath = writeAudit(cwd, {
    version,
    date,
    detectedProject,
    selectedAgents: answers.agents,
    mcpRequested: answers.connectMcp,
    tools: installResult.tools,
    initializers: installResult.initializers,
    mcp: mcpResults,
    generatedFiles: {
      agentsMarkdown,
    },
    todos,
    uncertainties,
  });

  console.log(`Auditoria registrada em ${auditPath}`);
  console.log("Setup técnico concluído.");
}

main().catch((error) => {
  console.error(`Falha inesperada no opsai-setup: ${error.message}`);
  process.exitCode = 1;
});
