import { resolveCommandRoot } from '../cli/command-options.mjs';
import { runDownload } from './download/run.mjs';

const downloadCommand = {
  name: 'download',
  async run(options = {}) {
    const rootDir = resolveCommandRoot(options);
    await runDownload(rootDir);
  },
};

export { downloadCommand };
