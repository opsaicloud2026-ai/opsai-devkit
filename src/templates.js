import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(MODULE_DIR, "..");

export function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
}

export function ensureAgentsMarkdown({
  cwd = process.cwd(),
  detectedProject,
  date = new Date(),
} = {}) {
  const templatePath = path.join(PACKAGE_ROOT, "templates", "AGENTS.md");
  const targetPath = path.join(cwd, "AGENTS.md");

  if (!fs.existsSync(templatePath)) {
    return {
      status: "failed",
      path: targetPath,
      reason: `Template não encontrado: ${templatePath}`,
    };
  }

  if (fs.existsSync(targetPath)) {
    return {
      status: "already-exists",
      path: targetPath,
      reason: "AGENTS.md já existe. Não sobrescrevi conteúdo existente.",
    };
  }

  const template = fs.readFileSync(templatePath, "utf8");
  const content = renderTemplate(template, {
    PROJECT_TYPE: detectedProject?.label ?? "projeto não identificado",
    PROJECT_FILES: detectedProject?.files?.join(", ") || "nenhum arquivo marcador",
    DATE: date.toISOString(),
  });

  fs.writeFileSync(targetPath, content);

  return {
    status: "created",
    path: targetPath,
  };
}
