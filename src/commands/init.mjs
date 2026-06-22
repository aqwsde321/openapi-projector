import { resolveCommandRoot } from '../cli/command-options.mjs';
import { runInit } from './init/run.mjs';

const initCommand = {
  name: 'init',
  async run(options = {}) {
    const rootDir = resolveCommandRoot(options);
    await runInit(rootDir, options);
  },
};

export { initCommand };
