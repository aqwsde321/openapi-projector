const HTTP_CLIENT_PACKAGES = ['axios', 'ky'];
const HELPER_SYMBOLS = new Set([
  'fetchAPI',
  'apiClient',
  'request',
  'http',
  'client',
  'httpClient',
]);
const HTTP_METHOD_MEMBERS = new Set(['get', 'post', 'put', 'patch', 'delete', 'request']);
const API_HELPER_IMPORT_PATH_PATTERN =
  /(^|[/@_-])(api|apis|client|fetch|http|request)([/._-]|$)/i;

function isLikelyApiImportPath(importPath) {
  return API_HELPER_IMPORT_PATH_PATTERN.test(importPath);
}

function isLikelyHelperBinding(imported) {
  return Boolean(
    imported &&
      (HELPER_SYMBOLS.has(imported.localName) ||
        HELPER_SYMBOLS.has(imported.importedName) ||
        isLikelyApiImportPath(imported.importPath)),
  );
}

function isHelperSymbol(symbol) {
  return HELPER_SYMBOLS.has(symbol);
}

function shouldTrackHelperCall({ symbol, imported, memberName, callStyle }) {
  const symbolLooksHelper =
    HELPER_SYMBOLS.has(symbol) ||
    HELPER_SYMBOLS.has(imported?.localName) ||
    HELPER_SYMBOLS.has(imported?.importedName);
  const importLooksHelper = isLikelyHelperBinding(imported);

  if (memberName) {
    return HTTP_METHOD_MEMBERS.has(memberName) && (symbolLooksHelper || importLooksHelper);
  }

  return symbolLooksHelper || (importLooksHelper && callStyle !== 'unknown');
}

export {
  HTTP_CLIENT_PACKAGES,
  isHelperSymbol,
  shouldTrackHelperCall,
};
