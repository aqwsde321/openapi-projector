import { initProject, initToolLocalConfig } from '../core/openapi-utils.mjs';

function parseInitArgs(argv) {
  let sourceUrl = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--source-url') {
      sourceUrl = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--source-url=')) {
      sourceUrl = arg.slice('--source-url='.length) || null;
    }
  }

  return { sourceUrl };
}

const initCommand = {
  name: 'init',
  async run(options = {}) {
    const argv = Array.isArray(options) ? options : (options.argv ?? []);
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const force = argv.includes('--force');
    const initArgs = parseInitArgs(argv);
    const projectConfigOverrides = {
      ...(context.toolLocalConfig?.initDefaults ?? {}),
      ...(initArgs.sourceUrl ? { sourceUrl: initArgs.sourceUrl } : {}),
    };
    const localConfigResult = await initToolLocalConfig(rootDir);
    const result = await initProject(rootDir, { force, projectConfigOverrides });

    console.log(`Initialized openapi workflow in ${rootDir}`);
    console.log(`- local config: ${localConfigResult.toolLocalConfigPath}`);
    console.log(`- project config: ${result.projectConfigTargetPath}`);
    console.log(`- gitignore: ${result.openapiGitignorePath}`);
    if (localConfigResult.gitignoreUpdated) {
      console.log(`- root gitignore updated: ${localConfigResult.gitignorePath}`);
    }
    if (projectConfigOverrides.sourceUrl) {
      console.log('- next: run doctor, then prepare');
    } else {
      console.log('- next: set sourceUrl in openapi/config/project.jsonc, then run doctor');
    }
  },
};

export { initCommand };
