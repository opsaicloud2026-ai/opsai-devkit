import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { commandWorks } from "./install.js";

const SERVER_NAME = "agent-skills";
const SERVER_JSON = {
  command: "npx",
  args: ["-y", "@tech-leads-club/agent-skills-mcp"],
};

function run(command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "pipe" });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ ok: false, stdout, stderr, error });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, stdout, stderr, code });
    });
  });
}

function expandHome(filePath) {
  if (filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { __error: error.message };
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function configureJsonMcp(agent, filePath, rootKey = "mcpServers", options = {}) {
  const absolutePath = expandHome(filePath);

  if (!fs.existsSync(absolutePath)) {
    if (!options.createIfMissing) {
      return {
        agent,
        status: "skipped",
        configured: false,
        reason: `Arquivo de config não encontrado: ${absolutePath}`,
        path: absolutePath,
        variant: options.variant,
      };
    }

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, "{}\n");
  }

  if (!fs.existsSync(absolutePath)) {
    return {
      agent,
      status: "skipped",
      configured: false,
      reason: `Arquivo de config não encontrado: ${absolutePath}`,
      path: absolutePath,
      variant: options.variant,
    };
  }

  const config = readJson(absolutePath);
  if (config.__error) {
    return {
      agent,
      status: "failed",
      configured: false,
      reason: `JSON inválido em ${absolutePath}: ${config.__error}`,
      path: absolutePath,
      variant: options.variant,
    };
  }

  config[rootKey] ??= {};

  if (config[rootKey][SERVER_NAME]) {
    return {
      agent,
      status: "already-configured",
      configured: true,
      path: absolutePath,
      variant: options.variant,
    };
  }

  config[rootKey][SERVER_NAME] = SERVER_JSON;
  writeJson(absolutePath, config);

  return {
    agent,
    status: "configured",
    configured: true,
    path: absolutePath,
    variant: options.variant,
  };
}

async function configureCliMcp({
  agent,
  command,
  checkArgs = ["--help"],
  listArgs,
  addArgs,
  displayName,
}) {
  const exists = await commandWorks(command, checkArgs);

  if (!exists) {
    return {
      agent,
      status: "skipped",
      configured: false,
      reason: `${displayName} não encontrado no PATH.`,
    };
  }

  if (listArgs) {
    const list = await run(command, listArgs);
    if (
      list.ok &&
      (`${list.stdout}\n${list.stderr}`).includes(SERVER_NAME)
    ) {
      return { agent, status: "already-configured", configured: true };
    }
  }

  if (process.env.OPSAI_SETUP_SKIP_MCP_COMMANDS === "1") {
    return {
      agent,
      status: "skipped",
      configured: false,
      reason: "Comando MCP pulado por OPSAI_SETUP_SKIP_MCP_COMMANDS=1.",
    };
  }

  const result = await run(command, addArgs);
  if (!result.ok) {
    return {
      agent,
      status: "failed",
      configured: false,
      reason: result.stderr || result.error?.message,
    };
  }

  if (listArgs) {
    await run(command, listArgs);
  }

  return {
    agent,
    status: "configured",
    configured: true,
  };
}

async function configureClaude() {
  return configureCliMcp({
    agent: "claude",
    command: "claude",
    listArgs: ["mcp", "list"],
    addArgs: [
      "mcp",
      "add",
      SERVER_NAME,
      "-s",
      "user",
      "--",
      "npx",
      "-y",
      "@tech-leads-club/agent-skills-mcp",
    ],
    displayName: "Claude Code",
  });
}

async function configureCodex() {
  return configureCliMcp({
    agent: "codex",
    command: "codex",
    listArgs: ["mcp", "list"],
    addArgs: [
      "mcp",
      "add",
      SERVER_NAME,
      "--",
      "npx",
      "-y",
      "@tech-leads-club/agent-skills-mcp",
    ],
    displayName: "Codex",
  });
}

async function configureKimi() {
  return configureCliMcp({
    agent: "kimi",
    command: "kimi",
    listArgs: ["mcp", "list"],
    addArgs: [
      "mcp",
      "add",
      "--transport",
      "stdio",
      SERVER_NAME,
      "--",
      "npx",
      "-y",
      "@tech-leads-club/agent-skills-mcp",
    ],
    displayName: "Kimi",
  });
}

function configureAntigravity() {
  return configureJsonMcp(
    "antigravity",
    "~/.gemini/config/mcp_config.json",
    "mcpServers",
  );
}

async function configureCopilot(cwd) {
  const agent = "copilot";
  const results = [];
  const vscodeDir = path.join(cwd, ".vscode");
  const vscodeConfig = path.join(vscodeDir, "mcp.json");

  if (fs.existsSync(vscodeDir)) {
    results.push(
      configureJsonMcp(agent, vscodeConfig, "servers", {
        createIfMissing: true,
        variant: "vscode",
      }),
    );
  } else {
    results.push({
      agent,
      status: "skipped",
      configured: false,
      reason: `Diretório VS Code não encontrado: ${vscodeDir}`,
      variant: "vscode",
    });
  }

  const copilotExists = await commandWorks("copilot", ["--help"]);
  if (copilotExists) {
    results.push(
      configureJsonMcp(agent, "~/.copilot/mcp-config.json", "mcpServers", {
        createIfMissing: true,
        variant: "cli",
      }),
    );
  } else {
    results.push({
      agent,
      status: "skipped",
      configured: false,
      reason: "Copilot CLI não encontrado no PATH.",
      variant: "cli",
    });
  }

  return results;
}

export async function configureMcpForAgents(agents, cwd = process.cwd(), log = console.log) {
  const results = [];

  for (const agent of agents) {
    log(`Configurando MCP para ${agent}...`);

    try {
      let result;
      if (agent === "claude") result = await configureClaude();
      else if (agent === "codex") result = await configureCodex();
      else if (agent === "kimi") result = await configureKimi();
      else if (agent === "antigravity") result = configureAntigravity();
      else if (agent === "copilot") result = await configureCopilot(cwd);
      else {
        result = {
          agent,
          status: "skipped",
          configured: false,
          reason: "Agente desconhecido.",
        };
      }

      const agentResults = Array.isArray(result) ? result : [result];
      results.push(...agentResults);

      for (const item of agentResults) {
        const suffix = item.variant ? ` (${item.variant})` : "";
        if (item.configured && item.status === "configured") {
          log(`${agent}${suffix}: MCP configurado.`);
        } else if (item.status === "already-configured") {
          log(`${agent}${suffix}: MCP já estava configurado.`);
        } else {
          log(`${agent}${suffix}: pulado. ${item.reason ?? "Sem detalhes."}`);
        }
      }
    } catch (error) {
      const result = {
        agent,
        status: "failed",
        configured: false,
        reason: error.message,
      };
      results.push(result);
      log(`${agent}: falhou. ${error.message}`);
    }
  }

  return results;
}

export { SERVER_JSON, SERVER_NAME };
