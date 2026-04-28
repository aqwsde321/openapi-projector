const SUPPORTED_ADAPTER_STYLES = new Set(['url-config', 'request-object']);
const SUPPORTED_TAG_FILE_CASES = new Set(['kebab', 'title']);
const SUPPORTED_WRAPPER_GROUPINGS = new Set(['tag']);
const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function addIssue(issues, path, message) {
  issues.push({ path, message });
}

function validateOptionalEnum(issues, path, value, supportedValues) {
  if (value == null) {
    return;
  }

  if (!supportedValues.has(value)) {
    addIssue(
      issues,
      path,
      `unsupported value ${JSON.stringify(value)}; supported values: ${Array.from(supportedValues).join(', ')}`,
    );
  }
}

function validateOptionalString(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !value.trim()) {
    addIssue(issues, path, 'must be a non-empty string');
  }
}

function validateOptionalIdentifier(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    addIssue(issues, path, 'must be a valid JavaScript identifier');
  }
}

function validateOptionalFileName(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !value.trim()) {
    addIssue(issues, path, 'must be a non-empty string');
    return;
  }

  if (
    value.includes('/') ||
    value.includes('\\') ||
    value === '.' ||
    value === '..' ||
    value.includes('..')
  ) {
    addIssue(issues, path, 'must be a file name, not a path');
    return;
  }

  if (!value.endsWith('.ts')) {
    addIssue(issues, path, 'must end with .ts');
  }
}

function validateOptionalPathSegment(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !value.trim()) {
    addIssue(issues, path, 'must be a non-empty string');
    return;
  }

  if (value.includes('/') || value.includes('\\') || value === '.' || value === '..') {
    addIssue(issues, path, 'must be a single path segment');
  }
}

function validateProjectRules(projectRules) {
  const issues = [];

  if (!isPlainObject(projectRules)) {
    addIssue(issues, '$', 'must be an object');
    return issues;
  }

  const api = projectRules.api ?? {};
  const layout = projectRules.layout ?? {};

  if (!isPlainObject(api)) {
    addIssue(issues, 'api', 'must be an object');
  } else {
    validateOptionalString(issues, 'api.fetchApiImportPath', api.fetchApiImportPath);
    validateOptionalIdentifier(issues, 'api.fetchApiSymbol', api.fetchApiSymbol);
    validateOptionalEnum(
      issues,
      'api.adapterStyle',
      api.adapterStyle,
      SUPPORTED_ADAPTER_STYLES,
    );
    validateOptionalEnum(
      issues,
      'api.wrapperGrouping',
      api.wrapperGrouping,
      SUPPORTED_WRAPPER_GROUPINGS,
    );
    validateOptionalEnum(
      issues,
      'api.tagFileCase',
      api.tagFileCase,
      SUPPORTED_TAG_FILE_CASES,
    );
  }

  if (!isPlainObject(layout)) {
    addIssue(issues, 'layout', 'must be an object');
  } else {
    validateOptionalFileName(issues, 'layout.schemaFileName', layout.schemaFileName);
    validateOptionalPathSegment(issues, 'layout.apiDirName', layout.apiDirName);
  }

  return issues;
}

function formatValidationIssues(issues) {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
}

function assertValidProjectRules(projectRules) {
  const issues = validateProjectRules(projectRules);

  if (issues.length > 0) {
    throw new Error(`Project rules are invalid: ${formatValidationIssues(issues)}`);
  }
}

export {
  assertValidProjectRules,
  formatValidationIssues,
  validateProjectRules,
};
