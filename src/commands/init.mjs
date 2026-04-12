import { initProject } from '../core/openapi-utils.mjs';

const initCommand = {
  name: 'init',
  async run(argv = []) {
    const rootDir = process.cwd();
    const force = argv.includes('--force');
    const result = await initProject(rootDir, { force });

    console.log(`Initialized openapi workflow in ${rootDir}`);
    console.log(`- project config: ${result.projectConfigTargetPath}`);
    console.log(`- gitignore: ${result.openapiGitignorePath}`);
    console.log('- next: edit sourceUrl in project config, then run refresh');
  },
};

export { initCommand };
