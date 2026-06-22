import fs from 'node:fs/promises';
import path from 'node:path';

import {
  cleanDir,
  ensureDir,
} from './dirs.mjs';
import { parseJsonc } from './jsonc.mjs';

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function readJson(filePath) {
  return parseJsonc(await readText(filePath));
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

export {
  cleanDir,
  ensureDir,
  parseJsonc,
  pathExists,
  readJson,
  readText,
  writeJson,
  writeText,
};
