function buildApiFunctionImports({
  apiTypeImports,
  dtoImportPath,
  runtimeFetchImportKind,
  runtimeFetchImportPath,
  runtimeFetchSymbol,
}) {
  return [
    buildRuntimeFetchImport({
      runtimeFetchImportKind,
      runtimeFetchImportPath,
      runtimeFetchSymbol,
    }),
    `import type { ${Array.from(apiTypeImports).sort((left, right) => left.localeCompare(right)).join(', ')} } from '${dtoImportPath}';`,
  ];
}

function buildRuntimeFetchImport({
  runtimeFetchImportKind,
  runtimeFetchImportPath,
  runtimeFetchSymbol,
}) {
  if (runtimeFetchImportKind === 'default') {
    return `import fetchAPI from '${runtimeFetchImportPath}';`;
  }

  return runtimeFetchSymbol === 'fetchAPI'
    ? `import { fetchAPI } from '${runtimeFetchImportPath}';`
    : `import { ${runtimeFetchSymbol} as fetchAPI } from '${runtimeFetchImportPath}';`;
}

export { buildApiFunctionImports };
