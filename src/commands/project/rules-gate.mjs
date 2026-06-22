import { resolveProjectRulesReviewPaths } from '../../config/project-paths.mjs';
import { assertProjectRulesReviewed } from '../../config/validation/assertions.mjs';
import { getProjectRulesMissingCurrentDefaults } from '../../project-rules/current-defaults.mjs';

function assertProjectRulesReadyForProject({
  projectConfig,
  projectRules,
  projectRulesPath,
  rootDir,
}) {
  const reviewPaths = resolveProjectRulesReviewPaths(rootDir, projectConfig, projectRulesPath);
  const { relativeProjectRulesPath } = reviewPaths;

  try {
    assertProjectRulesReviewed(projectRules, reviewPaths.reviewInstructionOptions);
  } catch (error) {
    const missingFields = getProjectRulesMissingCurrentDefaults(projectRules);
    if (missingFields.length > 0) {
      throw new Error(
        [
          error.message,
          `Run npx --yes openapi-projector@latest update to add current defaults.`,
          `Then check ${relativeProjectRulesPath}.`,
        ].join('\n'),
      );
    }
    throw error;
  }

  return reviewPaths;
}

export { assertProjectRulesReadyForProject };
