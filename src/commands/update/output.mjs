import {
  formatArtifactStatus,
  formatSuccess,
} from '../../cli/format.mjs';

function logUpgradeDocsResult(rootDir, result) {
  const projectReadmeStatus = formatArtifactStatus({
    created: result.projectReadmeCreated,
    createdStatus: ' (created)',
    existingStatus: '',
    overwritten: result.projectReadmeOverwritten,
  });

  console.log(formatSuccess(`Updated openapi generated docs in ${rootDir}`));
  console.log(`- project guide: ${result.projectReadmePath}${projectReadmeStatus}`);
  if (result.projectConfigPath) {
    console.log(`- kept project config: ${result.projectConfigPath}`);
  }
  console.log('- kept project rules, review history, and generated candidates unchanged');
}

function logUpdateResult(rootDir, docsResult, localConfigResult) {
  console.log(formatSuccess(`Updated openapi workspace metadata in ${rootDir}`));
  console.log(`- project guide: ${docsResult.projectReadmePath} (overwritten)`);
  console.log(`- kept project config: ${docsResult.projectConfigPath}`);
  console.log(`- local config: ${localConfigResult.toolLocalConfigPath}`);
  if (localConfigResult.gitignoreUpdated) {
    console.log(`- root gitignore updated: ${localConfigResult.gitignorePath}`);
  }
  console.log('- kept review history and generated candidates unchanged');
}

export {
  logUpdateResult,
  logUpgradeDocsResult,
};
