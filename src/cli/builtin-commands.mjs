import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { catalogCommand } from '../commands/catalog.mjs';
import { downloadCommand } from '../commands/download.mjs';
import { generateCommand } from '../commands/generate.mjs';
import { runInstallSkill } from '../commands/install-skill.mjs';
import { readJson } from '../io/files.mjs';
import { renderCliHelp } from './help.mjs';

const PACKAGE_JSON_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'package.json',
);

const installSkillCommand = {
  name: 'install-skill',
  run: runInstallSkill,
};

const helpCommand = {
  name: 'help',
  async run() {
    console.log(renderCliHelp());
  },
};

const refreshCommand = {
  name: 'refresh',
  async run(options = {}) {
    await downloadCommand.run(options);
    await catalogCommand.run(options);
    await generateCommand.run(options);
  },
};

const versionCommand = {
  name: 'version',
  async run() {
    const packageJson = await readJson(PACKAGE_JSON_PATH);
    console.log(packageJson.version);
  },
};

export {
  helpCommand,
  installSkillCommand,
  refreshCommand,
  versionCommand,
};
