import { execFile } from 'node:child_process';
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
