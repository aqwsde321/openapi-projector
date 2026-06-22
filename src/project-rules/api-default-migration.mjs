import { DEFAULT_API_RULES } from './defaults.mjs';

const API_HELPER_DEFAULT_KEYS = [
  'fetchApiImportPath',
  'fetchApiSymbol',
  'fetchApiImportKind',
  'adapterStyle',
];

const API_FIXED_DEFAULT_KEYS = [
  'wrapperGrouping',
  'tagFileCase',
];

function shouldFillCompleteHelperFromAnalysis(existingApi) {
  return existingApi.fetchApiImportPath == null && existingApi.fetchApiSymbol == null;
}

function applyApiDefaults({
  api,
  entries,
  existingApi,
  scaffoldDefaults,
  setDefaultIfMissing,
}) {
  const missingHelperDefaults = shouldFillCompleteHelperFromAnalysis(existingApi)
    ? scaffoldDefaults.api
    : DEFAULT_API_RULES;

  for (const key of API_HELPER_DEFAULT_KEYS) {
    setDefaultIfMissing(api, key, `api.${key}`, missingHelperDefaults[key], entries);
  }

  for (const key of API_FIXED_DEFAULT_KEYS) {
    setDefaultIfMissing(api, key, `api.${key}`, DEFAULT_API_RULES[key], entries);
  }
}

export { applyApiDefaults };
