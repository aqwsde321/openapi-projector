import { addIssue } from './common.mjs';

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

function validateProjectConfigPathFields(issues, projectConfig) {
  for (const field of PROJECT_CONFIG_PATH_FIELDS) {
    validateOptionalRelativePath(issues, field, projectConfig[field]);
  }
}

export { validateProjectConfigPathFields };
