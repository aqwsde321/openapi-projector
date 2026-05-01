import { upgradeProjectDocs } from '../core/openapi-utils.mjs';

const upgradeDocsCommand = {
  name: 'upgrade-docs',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const result = await upgradeProjectDocs(rootDir);
    const projectReadmeStatus = result.projectReadmeOverwritten
      ? ' (overwritten)'
      : result.projectReadmeCreated
        ? ' (created)'
        : '';

    console.log(`Updated openapi generated docs in ${rootDir}`);
    console.log(`- project guide: ${result.projectReadmePath}${projectReadmeStatus}`);
    if (result.projectConfigPath) {
      console.log(`- kept project config: ${result.projectConfigPath}`);
    }
    console.log('- kept project rules, review history, and generated candidates unchanged');
  },
};

export { upgradeDocsCommand };
