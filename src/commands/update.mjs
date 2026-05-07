import {
  initToolLocalConfig,
  upgradeProjectDocs,
} from '../core/openapi-utils.mjs';
import { formatSuccess } from '../cli-format.mjs';
import { rulesCommand } from './rules.mjs';

const updateCommand = {
  name: 'update',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const docsResult = await upgradeProjectDocs(rootDir);
    const localConfigResult = await initToolLocalConfig(rootDir);

    console.log(formatSuccess(`Updated openapi workspace metadata in ${rootDir}`));
    console.log(`- project guide: ${docsResult.projectReadmePath} (overwritten)`);
    console.log(`- kept project config: ${docsResult.projectConfigPath}`);
    console.log(`- local config: ${localConfigResult.toolLocalConfigPath}`);
    if (localConfigResult.gitignoreUpdated) {
      console.log(`- root gitignore updated: ${localConfigResult.gitignorePath}`);
    }
    console.log('- kept review history and generated candidates unchanged');

    await rulesCommand.run(options);
  },
};

export { updateCommand };
