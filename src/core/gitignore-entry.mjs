import path from 'node:path';

import { readText, writeText } from '../io/files.mjs';

async function ensureGitignoreEntry(rootDir, entry) {
  const gitignorePath = path.resolve(rootDir, '.gitignore');
  let contents = '';

  try {
    contents = await readText(gitignorePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  const lines = contents.split(/\r?\n/);
  if (lines.includes(entry)) {
    return { gitignorePath, updated: false };
  }

  const prefix = contents && !contents.endsWith('\n') ? '\n' : '';
  const section = contents.includes('# openapi-projector')
    ? `${entry}\n`
    : `# openapi-projector\n${entry}\n`;

  await writeText(gitignorePath, `${contents}${prefix}${section}`);
  return { gitignorePath, updated: true };
}

export { ensureGitignoreEntry };
