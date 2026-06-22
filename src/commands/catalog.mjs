import { resolveCommandRoot } from '../cli/command-options.mjs';
import { runCatalog } from './catalog/run.mjs';

const catalogCommand = {
  name: 'catalog',
  async run(options = {}) {
    const rootDir = resolveCommandRoot(options);
    await runCatalog(rootDir);
  },
};

export { catalogCommand };
