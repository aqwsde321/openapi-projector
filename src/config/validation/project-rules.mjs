import {
  addIssue,
  validateOptionalFileName,
} from './common.mjs';
import { isPlainObject } from '../../core/object-utils.mjs';
import { validateApiRules } from './project-rules-api.mjs';
import { validateHookRules } from './project-rules-hooks.mjs';

function validateLayoutRules(issues, layout) {
  if (!isPlainObject(layout)) {
    addIssue(issues, 'layout', 'must be an object');
    return;
  }

  validateOptionalFileName(issues, 'layout.schemaFileName', layout.schemaFileName);
}

function validateReviewRules(issues, review) {
  if (!isPlainObject(review)) {
    addIssue(issues, 'review', 'must be an object');
    return;
  }

  if (review.rulesReviewed != null && typeof review.rulesReviewed !== 'boolean') {
    addIssue(issues, 'review.rulesReviewed', 'must be a boolean');
  }

  if (
    review.notes != null &&
    (!Array.isArray(review.notes) || review.notes.some((item) => typeof item !== 'string'))
  ) {
    addIssue(issues, 'review.notes', 'must be an array of strings');
  }
}

function validateProjectRules(projectRules) {
  const issues = [];

  if (!isPlainObject(projectRules)) {
    addIssue(issues, '$', 'must be an object');
    return issues;
  }

  const api = projectRules.api ?? {};
  const hooks = projectRules.hooks ?? {};
  const layout = projectRules.layout ?? {};
  const review = projectRules.review ?? {};
  const rulesReviewed = isPlainObject(review) && review.rulesReviewed === true;

  validateApiRules(issues, api, rulesReviewed);
  validateLayoutRules(issues, layout);
  validateHookRules(issues, hooks);
  validateReviewRules(issues, review);

  return issues;
}

export { validateProjectRules };
