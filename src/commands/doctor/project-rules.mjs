import {
  resolveProjectRulesAnalysisPaths,
} from '../../config/project-paths.mjs';
import {
  formatProjectRulesReviewInstruction,
  formatValidationIssues,
} from '../../config/validation/common.mjs';
import { validateProjectRules } from '../../config/validation/project-rules.mjs';
import { loadProjectRules } from '../../core/project-workspace.mjs';
import { toDoctorRelativePath } from './workspace-helpers.mjs';

async function checkDoctorProjectRules(
  rootDir,
  projectConfig,
  { fail, lines, pass, warn },
) {
  try {
    const { projectRulesPath, projectRules } = await loadProjectRules(rootDir, projectConfig);
    const { analysisPath, analysisJsonPath } = resolveProjectRulesAnalysisPaths(
      rootDir,
      projectConfig,
    );
    const rulesIssues = validateProjectRules(projectRules);
    if (rulesIssues.length > 0) {
      const rulesError = formatValidationIssues(rulesIssues);
      fail(`${toDoctorRelativePath(rootDir, projectRulesPath)} is invalid: ${rulesError}`);
    } else if (projectRules.review?.rulesReviewed !== true) {
      fail(`Project rules are valid but not reviewed: ${toDoctorRelativePath(rootDir, projectRulesPath)}`);
      lines.push(
        `  Next: ${formatProjectRulesReviewInstruction({
          projectRulesPath: toDoctorRelativePath(rootDir, projectRulesPath),
          projectRulesAnalysisPath: toDoctorRelativePath(rootDir, analysisPath),
          projectRulesAnalysisJsonPath: toDoctorRelativePath(rootDir, analysisJsonPath),
        })} Then set review.rulesReviewed to true.`,
      );
    } else {
      pass(`Project rules are valid: ${toDoctorRelativePath(rootDir, projectRulesPath)}`);
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      warn(`Project rules are not ready: ${error.message}`);
      lines.push('  Next: run npx --yes openapi-projector@latest rules.');
    } else {
      fail(`Project rules are invalid: ${error.message}`);
      lines.push(
        '  Fix: repair or remove the existing project rules file, then run npx --yes openapi-projector@latest rules.',
      );
    }
  }
}

export {
  checkDoctorProjectRules,
};
