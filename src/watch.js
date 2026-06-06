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

let watchingTasks = false;
let bootstrapWatcher = null;
let bootstrapDirAtual = null;

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

    try {
      const injetado = await injectSkillsReminder(normalizedPath);
      if (injetado) {
        console.log(`[opsai-watch] _tasks.md detectado: ${normalizedPath}`);
        console.log('[opsai-watch] Lembrete de cy-resolve-skills injetado.');
      }
    } catch (erro) {
      if (erro?.code === 'ENOENT') {
        return;
      }

      console.warn(`[opsai-watch] Falha ao injetar lembrete em ${normalizedPath}. ${erro?.message ?? erro}`);
    }
  }, debounceMs);

  timers.set(normalizedPath, timer);
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
    await startTasksWatcher();
    return;
  }

  console.log('[opsai-watch] Aguardando .compozy/tasks/ ser criado...');
  startBootstrapWatcher();
}

process.on('SIGINT', () => {
  for (const watcher of activeWatchers) {
    watcher.close();
  }
  closeBootstrapWatcher();
  process.exit(0);
});

await main();
