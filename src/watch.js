#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { injectSkillsReminder } from './injector.js';

const cwd = process.cwd();
const compozyDir = path.join(cwd, '.compozy');
const tasksDir = path.join(compozyDir, 'tasks');
const debounceMs = 500;
const timers = new Map();
const activeWatchers = new Set();
const pollingFiles = new Map();

let watchingTasks = false;
let bootstrapWatcher = null;
let bootstrapDirAtual = null;
let pollingInterval = null;

function isWindowsMount(caminho) {
  return caminho.startsWith('/mnt/') && caminho.length > 6;
}

function isTasksFile(filePath) {
  return filePath.endsWith('_tasks.md');
}

function closeBootstrapWatcher() {
  if (!bootstrapWatcher) {
    return;
  }

  bootstrapWatcher.close();
  bootstrapWatcher = null;
  bootstrapDirAtual = null;
}

function rememberWatcher(watcher) {
  activeWatchers.add(watcher);
  watcher.on('close', () => activeWatchers.delete(watcher));
  watcher.on('error', (erro) => {
    console.warn(`[opsai-watch] Watcher falhou. ${erro?.message ?? erro}`);
  });
  return watcher;
}

async function injectAndLog(filePath) {
  try {
    const injetado = await injectSkillsReminder(filePath);
    if (injetado) {
      console.log(`[opsai-watch] _tasks.md detectado: ${filePath}`);
      console.log('[opsai-watch] Lembrete de cy-resolve-skills injetado.');
    }
  } catch (erro) {
    if (erro?.code === 'ENOENT') {
      return;
    }

    console.warn(`[opsai-watch] Falha ao injetar lembrete em ${filePath}. ${erro?.message ?? erro}`);
  }
}

function debounceInject(filePath) {
  if (!isTasksFile(filePath)) {
    return;
  }

  const normalizedPath = path.resolve(filePath);
  const timerAtual = timers.get(normalizedPath);
  if (timerAtual) {
    clearTimeout(timerAtual);
  }

  const timer = setTimeout(async () => {
    timers.delete(normalizedPath);

    await injectAndLog(normalizedPath);
  }, debounceMs);

  timers.set(normalizedPath, timer);
}

async function listTasksFiles() {
  let entries;
  try {
    entries = await readdir(tasksDir, { recursive: true });
  } catch (erro) {
    if (erro?.code === 'ENOENT') {
      return [];
    }

    throw erro;
  }

  return entries
    .map((entry) => path.join(tasksDir, entry.toString()))
    .filter(isTasksFile);
}

async function scanTasksFiles() {
  let filePaths;
  try {
    filePaths = await listTasksFiles();
  } catch (erro) {
    console.warn(`[opsai-watch] Falha ao listar _tasks.md. ${erro?.message ?? erro}`);
    return;
  }

  const encontrados = new Set(filePaths);
  for (const filePath of filePaths) {
    let stats;
    try {
      stats = await stat(filePath);
    } catch (erro) {
      if (erro?.code === 'ENOENT') {
        continue;
      }

      console.warn(`[opsai-watch] Falha ao ler status de ${filePath}. ${erro?.message ?? erro}`);
      continue;
    }

    if (!stats.isFile()) {
      continue;
    }

    const mtime = stats.mtimeMs;
    const mtimeAnterior = pollingFiles.get(filePath);
    if (mtimeAnterior === undefined || mtimeAnterior !== mtime) {
      await injectAndLog(filePath);
      pollingFiles.set(filePath, mtime);
    }
  }

  for (const filePath of pollingFiles.keys()) {
    if (!encontrados.has(filePath)) {
      pollingFiles.delete(filePath);
    }
  }
}

function startPollingWatcher() {
  if (pollingInterval) {
    return;
  }

  console.log('[opsai-watch] Modo polling ativo (WSL/Windows mount)');

  pollingInterval = setInterval(() => {
    scanTasksFiles().catch((erro) => {
      console.warn(`[opsai-watch] Polling falhou. ${erro?.message ?? erro}`);
    });
  }, 1000);

  scanTasksFiles().catch((erro) => {
    console.warn(`[opsai-watch] Polling inicial falhou. ${erro?.message ?? erro}`);
  });
}

function pathFromWatchEvent(baseDir, filename) {
  if (!filename) {
    return null;
  }

  return path.join(baseDir, filename.toString());
}

async function watchDirectoryTree(baseDir) {
  const entries = await readdir(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dirPath = path.join(baseDir, entry.name);
    await watchDirectoryTree(dirPath);
  }

  rememberWatcher(watch(baseDir, (eventType, filename) => {
    const eventPath = pathFromWatchEvent(baseDir, filename);
    if (!eventPath) {
      return;
    }

    debounceInject(eventPath);

    if (eventType === 'rename') {
      stat(eventPath)
        .then((stats) => {
          if (stats.isDirectory()) {
            return watchDirectoryTree(eventPath);
          }
          return null;
        })
        .catch(() => {});
    }
  }));
}

async function startTasksWatcher() {
  if (watchingTasks || !existsSync(tasksDir)) {
    return;
  }

  watchingTasks = true;
  closeBootstrapWatcher();

  try {
    rememberWatcher(watch(tasksDir, { recursive: true }, (eventType, filename) => {
      const eventPath = pathFromWatchEvent(tasksDir, filename);
      if (!eventPath) {
        return;
      }

      debounceInject(eventPath);
    }));
  } catch (erro) {
    if (erro?.code !== 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM') {
      watchingTasks = false;
      throw erro;
    }

    await watchDirectoryTree(tasksDir);
  }
}

function startBootstrapWatcher(bootstrapDir = existsSync(compozyDir) ? compozyDir : cwd) {
  closeBootstrapWatcher();
  bootstrapDirAtual = bootstrapDir;

  bootstrapWatcher = watch(bootstrapDir, { recursive: false }, async () => {
    if (existsSync(tasksDir)) {
      try {
        await startTasksWatcher();
      } catch (erro) {
        console.warn(`[opsai-watch] Falha ao iniciar monitoramento. ${erro?.message ?? erro}`);
      }
      return;
    }

    if (bootstrapDirAtual === cwd && existsSync(compozyDir)) {
      startBootstrapWatcher(compozyDir);
    }
  });

  bootstrapWatcher.on('error', (erro) => {
    console.warn(`[opsai-watch] Watcher inicial falhou. ${erro?.message ?? erro}`);
  });
}

async function main() {
  console.log(`[opsai-watch] Monitorando .compozy/tasks/ em ${cwd}`);
  console.log('Pressione Ctrl+C para parar.');

  if (existsSync(tasksDir)) {
    if (isWindowsMount(cwd)) {
      startPollingWatcher();
    } else {
      await startTasksWatcher();
    }
    return;
  }

  console.log('[opsai-watch] Aguardando .compozy/tasks/ ser criado...');
  if (isWindowsMount(cwd)) {
    startPollingWatcher();
    return;
  }

  startBootstrapWatcher();
}

process.on('SIGINT', () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  for (const watcher of activeWatchers) {
    watcher.close();
  }
  closeBootstrapWatcher();
  process.exit(0);
});

await main();
