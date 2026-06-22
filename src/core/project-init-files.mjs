import path from 'node:path';

import {
  resolveOpenApiWorkspacePaths,
  resolveProjectRulesPath,
} from '../config/project-paths.mjs';
import { writeInitProjectFiles } from './project-init-writer.mjs';

const PROJECT_CONFIG_TARGET_CANDIDATE = 'openapi/config/project.jsonc';

function buildInitProjectPaths(rootDir, { projectConfigCandidates, toolRootDir }) {
  const openApiWorkspacePaths = resolveOpenApiWorkspacePaths(rootDir);

  return {
    projectConfigTargetPath: path.resolve(rootDir, PROJECT_CONFIG_TARGET_CANDIDATE),
    projectConfigTargetIndex: projectConfigCandidates.indexOf(PROJECT_CONFIG_TARGET_CANDIDATE),
    projectRulesTemplatePath: path.join(toolRootDir, 'templates', 'project-rules.jsonc'),
    projectConfigTemplatePath: path.join(toolRootDir, 'templates', 'project.jsonc'),
    projectReadmeTemplatePath: path.join(toolRootDir, 'templates', 'project-readme.md'),
    projectRulesPath: resolveProjectRulesPath(rootDir),
    projectReadmePath: openApiWorkspacePaths.projectReadmePath,
    openapiGitignorePath: openApiWorkspacePaths.openapiGitignorePath,
    workspaceDirs: openApiWorkspacePaths.workspaceDirs,
  };
}

function assertCanInitProject({
  existingProjectConfig,
  force,
  projectConfigExisted,
  projectConfigTargetIndex,
  projectConfigTargetPath,
}) {
  const hasHigherPriorityProjectConfig =
    existingProjectConfig && existingProjectConfig.candidateIndex < projectConfigTargetIndex;

  if (hasHigherPriorityProjectConfig) {
    throw new Error(
      [
        `Project config already exists: ${existingProjectConfig.projectConfigPath}`,
        `This config has priority over ${projectConfigTargetPath}.`,
        'Edit or remove the existing config before running init.',
      ].join('\n'),
    );
  }

  if (projectConfigExisted && !force) {
    throw new Error(
      [
        `Project config already exists: ${projectConfigTargetPath}`,
        'For existing workspaces, run npx --yes openapi-projector@latest update.',
        'Use init --force only to reset bootstrap files.',
      ].join('\n'),
    );
  }

  if (existingProjectConfig && !force) {
    throw new Error(
      [
        `Project config already exists: ${existingProjectConfig.projectConfigPath}`,
        `Creating ${projectConfigTargetPath} would change which config is used.`,
        'For existing workspaces, run npx --yes openapi-projector@latest update.',
        'Use init --force only to reset bootstrap files.',
      ].join('\n'),
    );
  }
}

export {
  assertCanInitProject,
  buildInitProjectPaths,
  writeInitProjectFiles,
};
