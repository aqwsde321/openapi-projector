import { isPlainObject } from '../../core/object-utils.mjs';
import {
  addIssue,
  formatProjectRulesReviewInstruction,
  formatValidationIssues,
  validateOptionalString,
} from './common.mjs';
import { validateProjectRules } from './project-rules.mjs';
import { validateProjectConfigPathFields } from './relative-paths.mjs';

function validateProjectConfig(projectConfig) {
  const issues = [];

  if (!isPlainObject(projectConfig)) {
    addIssue(issues, '$', 'must be an object');
    return issues;
  }

  if (projectConfig.sourceUrl != null && typeof projectConfig.sourceUrl !== 'string') {
    addIssue(issues, 'sourceUrl', 'must be a string');
  }
  validateOptionalString(issues, 'swaggerUiUrl', projectConfig.swaggerUiUrl);

  validateProjectConfigPathFields(issues, projectConfig);

  return issues;
}

function assertValidProjectRules(projectRules) {
  const issues = validateProjectRules(projectRules);

  if (issues.length > 0) {
    throw new Error(`Project rules are invalid: ${formatValidationIssues(issues)}`);
  }
}

function assertProjectRulesReviewed(projectRules, reviewInstructionOptions = {}) {
  assertValidProjectRules(projectRules);

  if (!isPlainObject(projectRules.review) || projectRules.review.rulesReviewed !== true) {
    throw new Error(
      [
        'Project rules have not been reviewed.',
        formatProjectRulesReviewInstruction(reviewInstructionOptions),
        'Set review.rulesReviewed to true before generating project candidates.',
      ].join('\n'),
    );
  }
}

function assertValidProjectConfig(projectConfig) {
  const issues = validateProjectConfig(projectConfig);

  if (issues.length > 0) {
    throw new Error(`Project config validation failed: ${formatValidationIssues(issues)}`);
  }
}

export {
  assertProjectRulesReviewed,
  assertValidProjectConfig,
  validateProjectConfig,
};
