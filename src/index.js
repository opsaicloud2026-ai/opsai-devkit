#!/usr/bin/env node

import { instalarFerramentas } from './install.js';
import { perguntarConfiguracao } from './prompts.js';
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

  let instalacao = {
    compozy: 'falhou',
    skeeper: 'falhou',
  };

  try {
    instalacao = await instalarFerramentas();
  } catch (erro) {
    console.warn(`Falha inesperada na instalacao. ${erro?.message ?? erro}`);
  }

  await prepararProjeto({
    ...configuracao,
    ...instalacao,
  });

  await copyResolveSkill();

  console.log('Setup concluido.');
}

await main();
