import { resolveCommandRoot } from '../cli/command-options.mjs';
import {
  runUpdate,
  runUpgradeDocs,
} from './update/run.mjs';

const upgradeDocsCommand = {
  name: 'upgrade-docs',
  async run(options = {}) {
    const rootDir = resolveCommandRoot(options);
    await runUpgradeDocs(rootDir);
  },
};

const updateCommand = {
  name: 'update',
  async run(options = {}) {
    const rootDir = resolveCommandRoot(options);
    await runUpdate(rootDir, options);
  },
};

export {
  updateCommand,
  upgradeDocsCommand,
};
