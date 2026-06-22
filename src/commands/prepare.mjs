import { resolveCommandRoot } from '../cli/command-options.mjs';
import { runPrepare } from './prepare/run.mjs';

const prepareCommand = {
  name: 'prepare',
  async run(options = {}) {
    const rootDir = resolveCommandRoot(options);
    await runPrepare(rootDir, options);
  },
};

export { prepareCommand };
