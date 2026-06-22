import fs from 'node:fs/promises';
import path from 'node:path';

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readJsonFile(filePath) {
  return JSON.parse(await readTextFile(filePath));
}

async function writeTextFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}

async function readTextFile(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function readTextFiles(filePaths) {
  return Promise.all(filePaths.map(readTextFile));
}

export { readJsonFile, readTextFile, readTextFiles, writeJsonFile, writeTextFile };
