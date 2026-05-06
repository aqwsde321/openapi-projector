const SUPPORTED_ADAPTER_STYLES = new Set(['url-config', 'request-object']);
const SUPPORTED_FETCH_API_IMPORT_KINDS = new Set(['named', 'default']);
const SUPPORTED_HOOK_LIBRARIES = new Set(['@tanstack/react-query']);
const SUPPORTED_HOOK_QUERY_KEY_STRATEGIES = new Set(['path-and-params', 'path-and-fields']);
const SUPPORTED_HOOK_RESPONSE_UNWRAPS = new Set(['none', 'data']);
const SUPPORTED_HTTP_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
  'TRACE',
]);
const SUPPORTED_TAG_FILE_CASES = new Set(['kebab', 'title']);
const SUPPORTED_WRAPPER_GROUPINGS = new Set(['tag', 'flat']);
const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const PROJECT_CONFIG_PATH_FIELDS = [
  'sourcePath',
  'catalogJsonPath',
  'catalogMarkdownPath',
  'docsDir',
  'generatedSchemaPath',
  'projectRulesAnalysisPath',
  'projectRulesAnalysisJsonPath',
  'projectRulesPath',
  'projectGeneratedSrcDir',
  'endpointsDir',
];

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

function validateRequiredEnum(issues, path, value, supportedValues) {
  if (value == null) {
    addIssue(issues, path, 'is required when review.rulesReviewed is true');
    return;
  }

  validateOptionalEnum(issues, path, value, supportedValues);
}

function validateOptionalString(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !value.trim()) {
    addIssue(issues, path, 'must be a non-empty string');
  }
}

function validateRequiredString(issues, path, value) {
  if (value == null) {
    addIssue(issues, path, 'is required when review.rulesReviewed is true');
    return;
  }

  validateOptionalString(issues, path, value);
}

function validateOptionalIdentifier(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    addIssue(issues, path, 'must be a valid JavaScript identifier');
  }
}

function validateOptionalBoolean(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'boolean') {
    addIssue(issues, path, 'must be a boolean');
  }
}

function validateOptionalMethodList(issues, path, value) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    addIssue(issues, path, 'must be an array of HTTP methods');
    return [];
  }

  const methods = [];

  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string' || !item.trim()) {
      addIssue(issues, `${path}[${index}]`, 'must be a non-empty string');
      continue;
    }

    const method = item.toUpperCase();
    methods.push(method);

    if (!SUPPORTED_HTTP_METHODS.has(method)) {
      addIssue(
        issues,
        `${path}[${index}]`,
        `unsupported HTTP method ${JSON.stringify(item)}`,
      );
    }
  }

  return methods;
}

function validateRequiredIdentifier(issues, path, value) {
  if (value == null) {
    addIssue(issues, path, 'is required when review.rulesReviewed is true');
    return;
  }

  validateOptionalIdentifier(issues, path, value);
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

function isAbsolutePathLike(value) {
  return value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value);
}

function validateOptionalRelativePath(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !value.trim()) {
    addIssue(issues, path, 'must be a non-empty string');
    return;
  }

  if (isAbsolutePathLike(value)) {
    addIssue(issues, path, 'must be relative to the project root');
    return;
  }

  if (value.split(/[\\/]+/).includes('..')) {
    addIssue(issues, path, 'must not contain .. path segments');
  }
}

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

  for (const field of PROJECT_CONFIG_PATH_FIELDS) {
    validateOptionalRelativePath(issues, field, projectConfig[field]);
  }

  return issues;
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

  if (!isPlainObject(api)) {
    addIssue(issues, 'api', 'must be an object');
  } else {
    if (rulesReviewed) {
      validateRequiredString(issues, 'api.fetchApiImportPath', api.fetchApiImportPath);
      validateRequiredIdentifier(issues, 'api.fetchApiSymbol', api.fetchApiSymbol);
      validateRequiredEnum(
        issues,
        'api.fetchApiImportKind',
        api.fetchApiImportKind,
        SUPPORTED_FETCH_API_IMPORT_KINDS,
      );
      validateRequiredEnum(
        issues,
        'api.adapterStyle',
        api.adapterStyle,
        SUPPORTED_ADAPTER_STYLES,
      );
    } else {
      validateOptionalString(issues, 'api.fetchApiImportPath', api.fetchApiImportPath);
      validateOptionalIdentifier(issues, 'api.fetchApiSymbol', api.fetchApiSymbol);
      validateOptionalEnum(
        issues,
        'api.fetchApiImportKind',
        api.fetchApiImportKind,
        SUPPORTED_FETCH_API_IMPORT_KINDS,
      );
      validateOptionalEnum(
        issues,
        'api.adapterStyle',
        api.adapterStyle,
        SUPPORTED_ADAPTER_STYLES,
      );
    }
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
  }

  if (!isPlainObject(hooks)) {
    addIssue(issues, 'hooks', 'must be an object');
  } else {
    validateOptionalBoolean(issues, 'hooks.enabled', hooks.enabled);
    validateOptionalEnum(
      issues,
      'hooks.library',
      hooks.library,
      SUPPORTED_HOOK_LIBRARIES,
    );
    const queryMethods = validateOptionalMethodList(
      issues,
      'hooks.queryMethods',
      hooks.queryMethods,
    );
    const mutationMethods = validateOptionalMethodList(
      issues,
      'hooks.mutationMethods',
      hooks.mutationMethods,
    );
    const queryMethodSet = new Set(queryMethods);

    for (const method of mutationMethods) {
      if (queryMethodSet.has(method)) {
        addIssue(
          issues,
          'hooks.mutationMethods',
          `must not overlap hooks.queryMethods; duplicate method ${method}`,
        );
      }
    }

    validateOptionalEnum(
      issues,
      'hooks.queryKeyStrategy',
      hooks.queryKeyStrategy,
      SUPPORTED_HOOK_QUERY_KEY_STRATEGIES,
    );
    validateOptionalEnum(
      issues,
      'hooks.responseUnwrap',
      hooks.responseUnwrap,
      SUPPORTED_HOOK_RESPONSE_UNWRAPS,
    );
    validateOptionalString(issues, 'hooks.staleTimeImportPath', hooks.staleTimeImportPath);
    validateOptionalIdentifier(issues, 'hooks.staleTimeSymbol', hooks.staleTimeSymbol);

    if (hooks.staleTimeImportPath != null && hooks.staleTimeSymbol == null) {
      addIssue(issues, 'hooks.staleTimeSymbol', 'is required with hooks.staleTimeImportPath');
    }

    if (hooks.staleTimeSymbol != null && hooks.staleTimeImportPath == null) {
      addIssue(issues, 'hooks.staleTimeImportPath', 'is required with hooks.staleTimeSymbol');
    }
  }

  if (!isPlainObject(review)) {
    addIssue(issues, 'review', 'must be an object');
  } else {
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

function assertProjectRulesReviewed(projectRules) {
  assertValidProjectRules(projectRules);

  if (!isPlainObject(projectRules.review) || projectRules.review.rulesReviewed !== true) {
    throw new Error(
      [
        'Project rules have not been reviewed.',
        'Review openapi/review/project-rules/analysis.md and analysis.json, then update openapi/config/project-rules.jsonc.',
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
  assertValidProjectRules,
  formatValidationIssues,
  validateProjectConfig,
  validateProjectRules,
};
