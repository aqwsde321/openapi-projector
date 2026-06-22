import {
  DEFAULT_PROJECT_RULES_PATH,
  resolveProjectRulesPath,
} from '../../config/project-paths.mjs';
import {
  formatProjectRulesReviewInstruction,
  formatValidationIssues,
} from '../../config/validation/common.mjs';
import { validateProjectRules } from '../../config/validation/project-rules.mjs';
import { pathExists, readJson } from '../../io/files.mjs';
import { toDoctorRelativePath } from './workspace-helpers.mjs';

async function checkExistingProjectRules(rootDir, { fail, lines, pass }) {
  const rulesPath = resolveProjectRulesPath(rootDir);
  if (!(await pathExists(rulesPath))) {
    return;
  }

  try {
    const projectRules = await readJson(rulesPath);
    const rulesIssues = validateProjectRules(projectRules);
    if (rulesIssues.length > 0) {
      const rulesError = formatValidationIssues(rulesIssues);
      fail(`${toDoctorRelativePath(rootDir, rulesPath)} is invalid: ${rulesError}`);
    } else if (projectRules.review?.rulesReviewed !== true) {
      fail(`Existing project rules are valid but not reviewed: ${toDoctorRelativePath(rootDir, rulesPath)}`);
      lines.push(
        `  Next: ${formatProjectRulesReviewInstruction()} Then set review.rulesReviewed to true.`,
      );
    } else {
      pass(`Existing project rules are valid: ${toDoctorRelativePath(rootDir, rulesPath)}`);
    }
  } catch (error) {
    fail(`Existing project rules are invalid: ${error.message}`);
    lines.push(`  Fix: repair or remove ${DEFAULT_PROJECT_RULES_PATH} before running prepare.`);
  }
}

export { checkExistingProjectRules };
