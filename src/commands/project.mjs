import { resolveCommandRoot } from '../cli/command-options.mjs';
import { buildProjectCandidate } from './project/build-candidate.mjs';

const projectCommand = {
  name: 'project',
  async run(options = {}) {
    const rootDir = resolveCommandRoot(options);
    await buildProjectCandidate(rootDir);
  },
};

export { projectCommand };
