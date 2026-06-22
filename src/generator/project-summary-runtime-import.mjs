function renderRuntimeImport(wrapper) {
  if (wrapper.importKind === 'default') {
    return `import fetchAPI from '${wrapper.importPath}'`;
  }

  if (wrapper.importSymbol === 'fetchAPI') {
    return `import { fetchAPI } from '${wrapper.importPath}'`;
  }

  return `import { ${wrapper.importSymbol} as fetchAPI } from '${wrapper.importPath}'`;
}

export { renderRuntimeImport };
