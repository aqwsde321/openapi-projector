import {
  ensureDir,
  pathExists,
  writeText,
} from '../io/files.mjs';
import { renderOpenapiGitignore } from './project-init-gitignore.mjs';
import {
  readProjectInitTemplates,
  renderProjectConfigTemplate,
} from './project-init-templates.mjs';

async function writeInitProjectFiles(paths, options = {}) {
  const { force = false, projectConfigOverrides = {} } = options;
  const {
    projectConfigTemplate,
    projectRulesTemplate,
    projectReadmeTemplate,
  } = await readProjectInitTemplates(paths);
  const projectConfigContents = renderProjectConfigTemplate(
    projectConfigTemplate,
    projectConfigOverrides,
  );

  await writeText(paths.projectConfigTargetPath, projectConfigContents);

  const projectRulesExisted = await pathExists(paths.projectRulesPath);
  if (force || !projectRulesExisted) {
    await writeText(paths.projectRulesPath, projectRulesTemplate);
  }

  const openapiGitignoreExisted = await pathExists(paths.openapiGitignorePath);
  if (force || !openapiGitignoreExisted) {
    await writeText(paths.openapiGitignorePath, renderOpenapiGitignore());
  }

  for (const workspaceDir of paths.workspaceDirs) {
    await ensureDir(workspaceDir);
  }

  const projectReadmeExisted = await pathExists(paths.projectReadmePath);
  if (force || !projectReadmeExisted) {
    await writeText(paths.projectReadmePath, projectReadmeTemplate);
  }

  return { projectReadmeExisted };
}

export { writeInitProjectFiles };
