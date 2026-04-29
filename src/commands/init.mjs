import { initProject, initToolLocalConfig, loadProjectConfig } from '../core/openapi-utils.mjs';

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
    const result = await initProject(rootDir, { force, projectConfigOverrides });
    const localConfigResult = await initToolLocalConfig(rootDir);

    console.log(`Initialized openapi workflow in ${rootDir}`);
    console.log(`- local config: ${localConfigResult.toolLocalConfigPath}`);
    const projectConfigStatus = result.projectConfigOverwritten
      ? ' (overwritten)'
      : result.projectConfigCreated
        ? ''
        : ' (already exists)';
    console.log(`- project config: ${result.projectConfigTargetPath}${projectConfigStatus}`);
    const projectReadmeStatus = result.projectReadmeOverwritten
      ? ' (overwritten)'
      : result.projectReadmeCreated
        ? ''
        : ' (already exists)';
    console.log(
      `- project guide: ${result.projectReadmePath}${projectReadmeStatus}`,
    );
    console.log(`- gitignore: ${result.openapiGitignorePath}`);
    if (localConfigResult.gitignoreUpdated) {
      console.log(`- root gitignore updated: ${localConfigResult.gitignorePath}`);
    }
    const { projectConfig } = await loadProjectConfig(rootDir);
    const configuredSourceUrl = projectConfig.sourceUrl || '(not configured)';
    console.log(`- sourceUrl: ${configuredSourceUrl}`);
    console.log('- next: run doctor --check-url');
  },
};

export { initCommand };
