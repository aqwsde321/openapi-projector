import {
  loadProjectConfig,
  loadProjectRules,
} from '../../core/project-workspace.mjs';
import { formatWarning } from '../../cli/format.mjs';
import { relativePosixPath } from '../../core/path-utils.mjs';
import { getProjectRulesMissingCurrentDefaults } from '../../project-rules/current-defaults.mjs';

async function hasProjectConfig(rootDir) {
  try {
    await loadProjectConfig(rootDir);
    return true;
  } catch (error) {
    if (error.message?.startsWith('Project config not found.')) {
      return false;
    }
    throw error;
  }
}

async function warnIfProjectRulesUpdateRecommended(rootDir, projectConfig) {
  let projectRules;
  let projectRulesPath;
  try {
    ({ projectRules, projectRulesPath } = await loadProjectRules(rootDir, projectConfig));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const missingFields = getProjectRulesMissingCurrentDefaults(projectRules);
  if (missingFields.length === 0) {
    return;
  }

  console.log(formatWarning('project rules are missing defaults added by the current CLI.'));
  for (const field of missingFields) {
    console.log(`- missing: ${field}`);
  }
  console.log('- this run will add safe defaults');
  console.log(`- check: ${relativePosixPath(rootDir, projectRulesPath)}`);
}

export {
  hasProjectConfig,
  warnIfProjectRulesUpdateRecommended,
};
