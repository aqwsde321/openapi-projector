import { resolveCommandRoot } from '../cli/command-options.mjs';
import { runGenerate } from './generate/run.mjs';

const generateCommand = {
  name: 'generate',
  async run(options = {}) {
    const rootDir = resolveCommandRoot(options);
    await runGenerate(rootDir);
  },
};

export { generateCommand };
