import path from 'node:path';

import { resolveOpenApiWorkspacePaths } from '../config/project-paths.mjs';
import {
  pathExists,
  readText,
  writeText,
} from '../io/files.mjs';

async function upgradeProjectDocs(rootDir, { findExistingProjectConfig, toolRootDir }) {
  const projectReadmeTemplatePath = path.join(toolRootDir, 'templates', 'project-readme.md');
  const { projectReadmePath } = resolveOpenApiWorkspacePaths(rootDir);
  const existingProjectConfig = await findExistingProjectConfig(rootDir);

  if (!existingProjectConfig) {
    throw new Error(
      [
        'OpenAPI workspace not found.',
        'Run npx --yes openapi-projector@latest init before upgrading generated docs.',
      ].join('\n'),
    );
  }

  const projectReadmeExisted = await pathExists(projectReadmePath);
  const projectReadmeTemplate = await readText(projectReadmeTemplatePath);
  await writeText(projectReadmePath, projectReadmeTemplate);

  return {
    projectReadmePath,
    projectReadmeCreated: !projectReadmeExisted,
    projectReadmeOverwritten: projectReadmeExisted,
    projectConfigPath: existingProjectConfig?.projectConfigPath ?? null,
  };
}

export { upgradeProjectDocs };
