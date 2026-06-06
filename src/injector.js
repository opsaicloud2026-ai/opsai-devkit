import { readFile, writeFile } from 'node:fs/promises';

export const SKILLS_REMINDER_BLOCK = `<!-- opsai-watch: cy-resolve-skills -->
⚠️ INSTRUÇÃO OBRIGATÓRIA — LEIA ANTES DE QUALQUER AÇÃO

ANTES de executar qualquer task deste arquivo, você DEVE executar cy-resolve-skills.
NÃO execute cy-execute-task sem antes concluir cy-resolve-skills.

Motivo: cy-resolve-skills analisa cada task, consulta o catálogo de skills,
instala a skill correta e registra dentro do arquivo da task qual skill usar.
Executar tasks sem isso significa trabalhar sem contexto — perda de tempo garantida.

Ordem obrigatória:
1. Execute cy-resolve-skills agora
2. Aguarde a conclusão e confirmação das skills por task
3. Só então execute cy-execute-task para cada task

---

`;

export async function injectSkillsReminder(filePath) {
  const conteudoAtual = await readFile(filePath, 'utf8');

  if (conteudoAtual.slice(0, 200).includes('cy-resolve-skills')) {
    return false;
  }

  await writeFile(filePath, `${SKILLS_REMINDER_BLOCK}${conteudoAtual}`, 'utf8');
  return true;
}
