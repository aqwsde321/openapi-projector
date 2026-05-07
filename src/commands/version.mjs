import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_JSON_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'package.json',
);

const versionCommand = {
  name: 'version',
  async run() {
    const packageJson = JSON.parse(await fs.readFile(PACKAGE_JSON_PATH, 'utf8'));
    console.log(packageJson.version);
  },
};

export { versionCommand };
