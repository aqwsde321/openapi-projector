function createProjectRules({
  rulesReviewed = true,
  notes = [],
  includeCurrentDefaults = true,
  hooks,
} = {}) {
  const api = {
    fetchApiImportPath: '../../test-support/fetch-api',
    fetchApiSymbol: 'fetchAPI',
    wrapperGrouping: 'tag',
    tagFileCase: 'title',
  };

  if (includeCurrentDefaults) {
    api.fetchApiImportKind = 'named';
    api.adapterStyle = 'url-config';
  }

  return {
    review: {
      rulesReviewed,
      notes,
    },
    api,
    ...(hooks === undefined ? {} : { hooks }),
    layout: {
      schemaFileName: 'schema.ts',
    },
  };
}

export { createProjectRules };
