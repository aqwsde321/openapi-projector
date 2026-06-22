import { resolveCommandRoot } from '../cli/command-options.mjs';
import { runProjectRules } from './rules/run.mjs';

const rulesCommand = {
  name: 'rules',
  async run(options = {}) {
    const rootDir = resolveCommandRoot(options);
    await runProjectRules(rootDir);
  },
};

export { rulesCommand };
