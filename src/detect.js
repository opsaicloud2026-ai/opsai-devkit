import fs from "node:fs";
import path from "node:path";

const DETECTORS = [
  { file: "package.json", type: "node", label: "projeto Node" },
  { file: "pyproject.toml", type: "python", label: "projeto Python" },
  { file: "requirements.txt", type: "python", label: "projeto Python" },
  { file: "go.mod", type: "go", label: "projeto Go" },
  { file: "Cargo.toml", type: "rust", label: "projeto Rust" },
];

export function detectProject(cwd = process.cwd()) {
  const found = DETECTORS.filter((detector) =>
    fs.existsSync(path.join(cwd, detector.file)),
  );

  if (found.length === 0) {
    return {
      type: "empty",
      label: "projeto novo/vazio",
      files: [],
    };
  }

  const primary = found[0];
  return {
    type: primary.type,
    label: primary.label,
    files: found.map((item) => item.file),
  };
}
