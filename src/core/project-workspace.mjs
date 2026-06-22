import { pathExists } from '../io/files.mjs';
import { upgradeProjectDocs as upgradeProjectDocsWithDependencies } from './project-docs-upgrade.mjs';
import {
  PROJECT_CONFIG_CANDIDATES,
  TOOL_ROOT_DIR,
  findExistingProjectConfig,
  isConfiguredSourceUrl,
  loadProjectConfig,
} from './project-config-loader.mjs';
import {
  assertCanInitProject,
  buildInitProjectPaths,
  writeInitProjectFiles,
} from './project-init-files.mjs';
import { loadProjectRules } from './project-rules-loader.mjs';
import {
  initToolLocalConfig,
  loadToolLocalConfig,
} from './tool-local-config.mjs';

async function initProject(rootDir, options = {}) {
  const { force = false, projectConfigOverrides = {} } = options;
  const paths = buildInitProjectPaths(rootDir, {
    projectConfigCandidates: PROJECT_CONFIG_CANDIDATES,
    toolRootDir: TOOL_ROOT_DIR,
  });
  const existingProjectConfig = await findExistingProjectConfig(rootDir);
  const projectConfigExisted = await pathExists(paths.projectConfigTargetPath);

  assertCanInitProject({
    existingProjectConfig,
    force,
    projectConfigExisted,
    projectConfigTargetIndex: paths.projectConfigTargetIndex,
    projectConfigTargetPath: paths.projectConfigTargetPath,
  });

  const { projectReadmeExisted } = await writeInitProjectFiles(paths, {
    force,
    projectConfigOverrides,
  });

  return {
    projectConfigTargetPath: paths.projectConfigTargetPath,
    projectConfigCreated: !projectConfigExisted,
    projectConfigOverwritten: force && projectConfigExisted,
    projectReadmePath: paths.projectReadmePath,
    projectReadmeCreated: !projectReadmeExisted,
    projectReadmeOverwritten: force && projectReadmeExisted,
    openapiGitignorePath: paths.openapiGitignorePath,
  };
}

async function upgradeProjectDocs(rootDir) {
  return upgradeProjectDocsWithDependencies(rootDir, {
    findExistingProjectConfig,
    toolRootDir: TOOL_ROOT_DIR,
  });
}

export {
  findExistingProjectConfig,
  initProject,
  initToolLocalConfig,
  isConfiguredSourceUrl,
  loadProjectConfig,
  loadProjectRules,
  loadToolLocalConfig,
  upgradeProjectDocs,
};
