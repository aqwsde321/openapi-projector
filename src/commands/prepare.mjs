import { initCommand } from './init.mjs';
import { refreshCommand } from './refresh.mjs';
import { rulesCommand } from './rules.mjs';
import { projectCommand } from './project.mjs';
import { loadProjectConfig } from '../core/openapi-utils.mjs';

async function hasProjectConfig(rootDir) {
  try {
    await loadProjectConfig(rootDir);
    return true;
  } catch (error) {
    if (error.message?.startsWith('Project config not found.')) {
      return false;
    }
    throw error;
  }
}

const prepareCommand = {
  name: 'prepare',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();

    console.log('Preparing OpenAPI project candidate output...');

    if (await hasProjectConfig(rootDir)) {
      console.log('- init: skipped because project config already exists');
    } else {
      console.log('- init: creating project config');
      await initCommand.run(options);
    }

    console.log('- refresh: downloading OpenAPI and generating review artifacts');
    await refreshCommand.run(options);

    console.log('- rules: analyzing target project conventions');
    await rulesCommand.run(options);

    console.log('- project: generating DTO/API candidate files');
    await projectCommand.run(options);

    console.log('Prepare complete. Review openapi/project/summary.md next.');
  },
};

export { prepareCommand };
