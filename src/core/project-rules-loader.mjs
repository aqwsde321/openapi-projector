import { resolveProjectRulesPath } from '../config/project-paths.mjs';
import { readJson } from '../io/files.mjs';

async function loadProjectRules(rootDir, projectConfig) {
  const projectRulesPath = resolveProjectRulesPath(rootDir, projectConfig);
  const projectRules = await readJson(projectRulesPath);

  return {
    projectRulesPath,
    projectRules,
  };
}

export { loadProjectRules };
