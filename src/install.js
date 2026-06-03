import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function comandoExiste(comando) {
  try {
    await execFileAsync(comando, ['--version'], {
      timeout: 15000,
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

async function encontrarBinarioGlobal(nome) {
  if (await comandoExiste(nome)) {
    return nome;
  }

  const nvmPath = path.join(homedir(), '.nvm', 'versions', 'node', process.version, 'bin', nome);
  if (existsSync(nvmPath)) {
    return nvmPath;
  }

  const caminhos = [];

  if (process.env.npm_config_prefix) {
    caminhos.push(`${process.env.npm_config_prefix}/bin/${nome}`);
  }

  caminhos.push(`${homedir()}/.npm-global/bin/${nome}`);
  caminhos.push(`/usr/local/bin/${nome}`);

  try {
    const { stdout } = await execFileAsync('npm', ['bin', '-g'], {
      timeout: 15000,
      windowsHide: true,
    });
    const npmBin = stdout.trim();
    if (npmBin) {
      caminhos.push(`${npmBin}/${nome}`);
    }
  } catch {
    // ignora erro do npm bin -g
  }

  for (const caminho of caminhos) {
    try {
      await access(caminho);
      return caminho;
    } catch {
      // caminho não existe, tenta próximo
    }
  }

  return null;
}

async function instalarGlobalmente(nome, comando, pacote) {
  if (await comandoExiste(comando)) {
    console.log(`${nome} ja existe. Pulando instalacao.`);
    return 'ja-existia';
  }

  try {
    console.log(`Instalando ${nome} globalmente...`);
    await execFileAsync('npm', ['install', '-g', pacote], {
      timeout: 120000,
      windowsHide: true,
    });
    console.log(`${nome} instalado.`);
    return 'instalado';
  } catch (erro) {
    const detalhe = erro?.message ? ` ${erro.message}` : '';
    console.warn(`${nome} falhou ao instalar.${detalhe}`);
    return 'falhou';
  }
}

export async function instalarFerramentas() {
  const compozy = await instalarGlobalmente(
    'Compozy',
    'compozy',
    '@compozy/cli',
  );

  const skeeper = await instalarGlobalmente(
    'Skeeper',
    'skeeper',
    '@compozy/skeeper',
  );

  return {
    compozy,
    skeeper,
  };
}

export async function runCompozySetup() {
  if (!(await comandoExiste('compozy'))) {
    console.warn('Compozy nao encontrado. Pulando compozy setup.');
    return;
  }

  try {
    console.log('Executando compozy setup...');
    await execFileAsync('compozy', ['setup', '--all'], {
      timeout: 60000,
      windowsHide: true,
    });
    console.log('Compozy setup concluido.');
  } catch (erro) {
    const detalhe = erro?.message ? ` ${erro.message}` : '';
    console.warn(`Compozy setup falhou.${detalhe} Continuando...`);
  }
}

function detectarPlataforma(url) {
  if (url.includes('github.com')) {
    return 'github';
  }
  if (url.includes('dev.azure.com')) {
    return 'azure';
  }
  return 'desconhecida';
}

function extrairNomeRepo(url) {
  const limpa = url.replace(/\.git$/, '');
  const partes = limpa.split('/');
  const nome = partes[partes.length - 1];
  return nome || '';
}

async function obterRemoteOrigin() {
  try {
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], {
      timeout: 15000,
      windowsHide: true,
    });
    return stdout.trim();
  } catch (erro) {
    return null;
  }
}

export async function runSkeeperInit(opcao, urlInformada) {
  const skeeperBin = await encontrarBinarioGlobal('skeeper');
  if (!skeeperBin) {
    console.warn('Skeeper nao encontrado. Pulando skeeper init.');
    return 'falhou';
  }

  if (opcao === 'informar-url') {
    if (!urlInformada) {
      console.warn('URL do repositorio de specs nao informada.');
      return 'falhou';
    }
    try {
      console.log(`Executando skeeper init ${urlInformada}...`);
      await execFileAsync(skeeperBin, ['init', urlInformada], {
        timeout: 60000,
        windowsHide: true,
      });
      console.log('Skeeper init concluido.');
      return 'instalado';
    } catch (erro) {
      const detalhe = erro?.message ? ` ${erro.message}` : '';
      console.warn(`Skeeper init falhou.${detalhe}`);
      return 'falhou';
    }
  }

  if (opcao === 'criar-automaticamente') {
    const originUrl = await obterRemoteOrigin();
    if (!originUrl) {
      console.warn('Nao foi possivel detectar o remote origin. Crie o repositorio de specs manualmente e rode: skeeper init <url>');
      return 'pendente';
    }

    const nomeBase = extrairNomeRepo(originUrl);
    if (!nomeBase) {
      console.warn('Nao foi possivel derivar o nome do repositorio. Crie o repositorio de specs manualmente e rode: skeeper init <url>');
      return 'pendente';
    }

    const nomeSpecs = `${nomeBase}-specs`;
    const plataforma = detectarPlataforma(originUrl);

    if (plataforma === 'github') {
      const ghExiste = await comandoExiste('gh');
      if (!ghExiste) {
        console.log(`Crie o repositorio ${nomeSpecs} no GitHub e rode: skeeper init <url>`);
        return 'pendente';
      }

      try {
        console.log(`Criando repositorio ${nomeSpecs} no GitHub...`);
        await execFileAsync('gh', ['repo', 'create', nomeSpecs, '--private'], {
          timeout: 60000,
          windowsHide: true,
        });
        console.log(`Repositorio ${nomeSpecs} criado.`);

        const prefix = originUrl.replace(/\/[^/]+(\.git)?$/, '');
        const urlSpecs = `${prefix}/${nomeSpecs}.git`;

        try {
          console.log(`Executando skeeper init ${urlSpecs}...`);
          await execFileAsync(skeeperBin, ['init', urlSpecs], {
            timeout: 60000,
            windowsHide: true,
          });
          console.log('Skeeper init concluido.');
          return 'instalado';
        } catch (erro) {
          const detalhe = erro?.message ? ` ${erro.message}` : '';
          console.warn(`Skeeper init falhou.${detalhe}`);
          return 'falhou';
        }
      } catch (erro) {
        const detalhe = erro?.message ? ` ${erro.message}` : '';
        console.warn(`gh repo create falhou.${detalhe}`);
        console.log(`Crie o repositorio ${nomeSpecs} no GitHub e rode: skeeper init <url>`);
        return 'pendente';
      }
    }

    if (plataforma === 'azure') {
      console.log(`Crie o repositorio ${nomeSpecs} no Azure DevOps manualmente, depois rode: skeeper init <url>`);
      return 'pendente';
    }

    console.log(`Crie o repositorio ${nomeSpecs} manualmente e rode: skeeper init <url>`);
    return 'pendente';
  }

  return 'pendente';
}
