import { isPlainObject } from '../core/object-utils.mjs';

const REQUIRED_REVIEWED_API_RULE_PATHS = new Set([
  'api.fetchApiImportPath',
  'api.fetchApiSymbol',
  'api.fetchApiImportKind',
  'api.adapterStyle',
]);

function getProjectRulesMissingCurrentDefaults(projectRules) {
  if (projectRules?.review?.rulesReviewed !== true) {
    return [];
  }

  const api = isPlainObject(projectRules.api) ? projectRules.api : {};
  return Array.from(REQUIRED_REVIEWED_API_RULE_PATHS).filter((pathName) => {
    const key = pathName.replace(/^api\./, '');
    return api[key] == null;
  });
}

export { getProjectRulesMissingCurrentDefaults };
