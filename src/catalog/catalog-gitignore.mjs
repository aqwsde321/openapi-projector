import path from 'node:path';

import { readText, writeText } from '../io/files.mjs';

const OPENAPI_GITIGNORE_ENTRIES = [
  'changes.md',
  'changes.json',
  '_internal/',
  'review/',
  'project/',
];

async function ensureOpenapiGitignore(openapiRoot) {
  const gitignorePath = path.join(openapiRoot, '.gitignore');
  let contents = '';

  try {
    contents = await readText(gitignorePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  const lines = contents.split(/\r?\n/);
  const missingEntries = OPENAPI_GITIGNORE_ENTRIES.filter((entry) => !lines.includes(entry));

  if (missingEntries.length === 0) {
    return;
  }

  const prefix = contents && !contents.endsWith('\n') ? '\n' : '';
  const header = contents ? '' : '# openapi-projector generated artifacts\n';
  const nextContents = `${contents}${prefix}${header}${missingEntries.join('\n')}\n`;
  await writeText(gitignorePath, nextContents);
}

export { ensureOpenapiGitignore };
