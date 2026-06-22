import { pathToFileURL } from 'node:url';

import {
  formatArtifactStatus,
  formatSuccess,
} from '../../cli/format.mjs';
import { loadProjectConfig } from '../../core/project-workspace.mjs';

async function printInitSummary({ localConfigResult, result, rootDir }) {
  console.log(formatSuccess(`Initialized openapi workflow in ${rootDir}`));
  console.log(`- local config: ${localConfigResult.toolLocalConfigPath}`);
  const projectConfigStatus = formatArtifactStatus({
    created: result.projectConfigCreated,
    overwritten: result.projectConfigOverwritten,
  });
  console.log(`- project config: ${result.projectConfigTargetPath}${projectConfigStatus}`);
  const projectReadmeStatus = formatArtifactStatus({
    created: result.projectReadmeCreated,
    overwritten: result.projectReadmeOverwritten,
  });
  console.log(
    `- project guide: ${result.projectReadmePath}${projectReadmeStatus}`,
  );
  console.log(`- gitignore: ${result.openapiGitignorePath}`);
  if (localConfigResult.gitignoreUpdated) {
    console.log(`- root gitignore updated: ${localConfigResult.gitignorePath}`);
  }
  const { projectConfig } = await loadProjectConfig(rootDir);
  const configuredSourceUrl = projectConfig.sourceUrl || '(not configured)';
  console.log('');
  console.log('--- sourceUrl config ---');
  console.log(`- sourceUrl: ${configuredSourceUrl}`);
  console.log(`- edit sourceUrl later: ${result.projectConfigTargetPath} (field: sourceUrl)`);
  console.log(`  open: ${pathToFileURL(result.projectConfigTargetPath).href}`);
  console.log('------------------------');
  console.log('');
  console.log('- next: run doctor --check-url');
}

export { printInitSummary };
