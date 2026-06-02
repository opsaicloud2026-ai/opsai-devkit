import { spawn } from "node:child_process";

function run(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: false,
      stdio: options.stdio ?? "pipe",
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({ ok: false, code: null, stdout, stderr, error });
    });

    child.on("close", (code) => {
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

export async function commandWorks(command, args = []) {
  const result = await run(command, args);
  return result.ok;
}

async function getHelp(command) {
  const result = await run(command, ["--help"]);
  return `${result.stdout}\n${result.stderr}`;
}

function helpHasInit(helpText) {
  return /(^|\s)init(\s|$)/i.test(helpText);
}

async function ensureGlobalTool(tool) {
  const status = {
    name: tool.name,
    packageName: tool.packageName,
    installedBefore: false,
    installAttempted: false,
    installOk: false,
    skipped: false,
    error: null,
  };

  status.installedBefore = await commandWorks(tool.command, tool.checkArgs);

  if (status.installedBefore) {
    status.skipped = true;
    return status;
  }

  if (process.env.OPSAI_SETUP_SKIP_GLOBAL_INSTALL === "1") {
    status.skipped = true;
    status.error = "Instalação global pulada por OPSAI_SETUP_SKIP_GLOBAL_INSTALL=1.";
    return status;
  }

  status.installAttempted = true;
  const result = await run("npm", ["install", "-g", tool.packageName], {
    stdio: "inherit",
  });

  status.installOk = result.ok;
  if (!result.ok) {
    status.error = result.error?.message ?? result.stderr ?? "Falha desconhecida.";
  }

  return status;
}

async function runInitIfAvailable(tool, cwd) {
  const status = {
    name: tool.name,
    attempted: false,
    ok: false,
    skipped: false,
    error: null,
  };

  if (tool.autoInit === false) {
    status.skipped = true;
    status.error = tool.initSkipReason;
    return status;
  }

  const available = await commandWorks(tool.command, tool.checkArgs);
  if (!available) {
    status.skipped = true;
    status.error = `${tool.name} não está disponível no PATH.`;
    return status;
  }

  const helpText = await getHelp(tool.command);
  if (!helpHasInit(helpText)) {
    status.skipped = true;
    status.error = `Não encontrei comando init em ${tool.command} --help.`;
    return status;
  }

  if (process.env.OPSAI_SETUP_SKIP_TOOL_INIT === "1") {
    status.skipped = true;
    status.error = "Inicialização pulada por OPSAI_SETUP_SKIP_TOOL_INIT=1.";
    return status;
  }

  status.attempted = true;
  const result = await run(tool.command, ["init"], { cwd, stdio: "inherit" });
  status.ok = result.ok;
  if (!result.ok) {
    status.error = result.error?.message ?? result.stderr ?? "Falha desconhecida.";
  }

  return status;
}

const TOOLS = [
  {
    name: "Compozy",
    command: "compozy",
    packageName: "@compozy/cli",
    checkArgs: ["--help"],
  },
  {
    name: "Skeeper",
    command: "skeeper",
    packageName: "@compozy/skeeper",
    checkArgs: ["version"],
    autoInit: false,
    initSkipReason:
      "Skeeper init envolve sidecar/credenciais/repositório remoto; deixe para configurar manualmente.",
  },
];

export async function installBaseTools(cwd = process.cwd(), log = console.log) {
  const tools = [];
  const initializers = [];

  for (const tool of TOOLS) {
    log(`Verificando ${tool.name}...`);
    const installStatus = await ensureGlobalTool(tool);
    tools.push(installStatus);

    if (installStatus.installedBefore) {
      log(`${tool.name} já instalado. Pulando instalação.`);
    } else if (installStatus.installOk) {
      log(`${tool.name} instalado.`);
    } else {
      log(`${tool.name}: instalação não concluída. Continuando mesmo assim.`);
    }
  }

  for (const tool of TOOLS) {
    log(`Inicializando ${tool.name} no projeto, se suportado...`);
    const initStatus = await runInitIfAvailable(tool, cwd);
    initializers.push(initStatus);

    if (initStatus.ok) {
      log(`${tool.name}: init executado.`);
    } else if (initStatus.skipped) {
      log(`${tool.name}: init pulado. ${initStatus.error}`);
    } else {
      log(`${tool.name}: init falhou. Continuando.`);
    }
  }

  return { tools, initializers };
}
