const REQUIRED_AFTER_RULES_REVIEW_MESSAGE = 'is required when review.rulesReviewed is true';

function addIssue(issues, path, message) {
  issues.push({ path, message });
}

function addRequiredAfterRulesReviewIssue(issues, path) {
  addIssue(issues, path, REQUIRED_AFTER_RULES_REVIEW_MESSAGE);
}

function validateRequiredValue(issues, path, value, validateValue) {
  if (value == null) {
    addRequiredAfterRulesReviewIssue(issues, path);
    return;
  }

  validateValue();
}

function formatValidationIssues(issues) {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
}

export {
  addIssue,
  addRequiredAfterRulesReviewIssue,
  formatValidationIssues,
  validateRequiredValue,
};
