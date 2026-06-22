const DEFAULT_API_RULES = {
  fetchApiImportPath: '@/shared/api',
  fetchApiSymbol: 'fetchAPI',
  fetchApiImportKind: 'named',
  adapterStyle: 'url-config',
  wrapperGrouping: 'tag',
  tagFileCase: 'title',
};
const DEFAULT_HOOK_RULES = {
  enabled: false,
  library: '@tanstack/react-query',
  queryMethods: ['GET'],
  mutationMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  queryKeyStrategy: 'path-and-params',
  responseUnwrap: 'none',
};
const DEFAULT_LAYOUT_RULES = {
  schemaFileName: 'schema.ts',
};
const LEGACY_SCHEMA_LAYOUT_RULES = {
  schemaFileName: 'schema.ts',
  apiDirName: 'apis',
};
const DEFAULT_REVIEW_RULES = {
  rulesReviewed: false,
  notes: [],
};

export {
  DEFAULT_API_RULES,
  DEFAULT_HOOK_RULES,
  DEFAULT_LAYOUT_RULES,
  DEFAULT_REVIEW_RULES,
  LEGACY_SCHEMA_LAYOUT_RULES,
};
