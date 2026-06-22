import { readText } from '../io/files.mjs';
import { applyTopLevelJsoncOverrides } from './top-level-jsonc-overrides.mjs';

async function readProjectInitTemplates(paths) {
  const [
    projectConfigTemplate,
    projectRulesTemplate,
    projectReadmeTemplate,
  ] = await Promise.all([
    readText(paths.projectConfigTemplatePath),
    readText(paths.projectRulesTemplatePath),
    readText(paths.projectReadmeTemplatePath),
  ]);

  return {
    projectConfigTemplate,
    projectRulesTemplate,
    projectReadmeTemplate,
  };
}

function renderProjectConfigTemplate(projectConfigTemplate, projectConfigOverrides) {
  return Object.keys(projectConfigOverrides).length > 0
    ? applyTopLevelJsoncOverrides(projectConfigTemplate, projectConfigOverrides)
    : projectConfigTemplate;
}

export {
  readProjectInitTemplates,
  renderProjectConfigTemplate,
};
