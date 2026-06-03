#!/usr/bin/env node

import { instalarFerramentas, runCompozySetup, runSkeeperInit } from './install.js';
import { perguntarConfiguracao, perguntarSkeeper } from './prompts.js';
import { copyResolveSkill, prepararProjeto } from './setup.js';

async function main() {
  console.log('OpsAI Setup');

  let configuracao;
  try {
    configuracao = await perguntarConfiguracao();
  } catch (erro) {
    if (erro?.name === 'ExitPromptError') {
      console.log('Setup cancelado.');
      process.exitCode = 1;
      return;
    }

    console.warn(`Falha nas perguntas. ${erro?.message ?? erro}`);
    process.exitCode = 1;
    return;
  }

  let skeeperConfig;
  try {
    skeeperConfig = await perguntarSkeeper();
  } catch (erro) {
    if (erro?.name === 'ExitPromptError') {
      console.log('Setup cancelado.');
      process.exitCode = 1;
      return;
    }

    console.warn(`Falha na pergunta do Skeeper. ${erro?.message ?? erro}`);
    skeeperConfig = { opcao: 'pular', url: null };
  }

  let instalacao = {
    compozy: 'falhou',
    skeeper: 'falhou',
  };

  try {
    instalacao = await instalarFerramentas();
  } catch (erro) {
    console.warn(`Falha inesperada na instalacao. ${erro?.message ?? erro}`);
  }

  await runCompozySetup(configuracao.agentes);

  let skeeperStatus = 'pendente';
  if (skeeperConfig.opcao !== 'pular') {
    skeeperStatus = await runSkeeperInit(skeeperConfig.opcao, skeeperConfig.url);
  } else {
    console.log('Skeeper: configuracao pendente.');
  }

  await prepararProjeto({
    ...configuracao,
    compozy: instalacao.compozy,
    skeeper: skeeperStatus,
  });

  await copyResolveSkill();

  console.log('Setup concluido.');
  console.log('─────────────────────────────────────────');
  console.log('Próximos passos:');
  console.log('1. Abra o Claude Code nesta pasta');
  console.log('2. Projeto novo:      /cy-create-prd');
  console.log('   (brainstorm → PRD → tasks → skills → execução)');
  console.log('3. Projeto existente: /cy-create-prd');
  console.log('   (analisa o repo → PRD → tasks → skills → execução)');
  console.log('   Após as tasks, cy-resolve-skills roda automaticamente');
  console.log('─────────────────────────────────────────');
}

await main();
