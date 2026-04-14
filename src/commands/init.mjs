import { initProject } from '../core/openapi-utils.mjs';

const initCommand = {
  name: 'init',
  async run(options = {}) {
    const argv = Array.isArray(options) ? options : (options.argv ?? []);
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const force = argv.includes('--force');
    const projectConfigOverrides = context.toolLocalConfig?.initDefaults ?? {};
    const result = await initProject(rootDir, { force, projectConfigOverrides });

    console.log(`Initialized openapi workflow in ${rootDir}`);
    console.log(`- project config: ${result.projectConfigTargetPath}`);
    console.log(`- gitignore: ${result.openapiGitignorePath}`);
    console.log('- next: review project config, then run refresh');
  },
};

export { initCommand };
