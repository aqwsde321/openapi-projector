function createSignalState() {
  return {
    apiLayerBaseDirs: new Map(),
    apiLayerEvidence: [],
    apiLayerStyles: new Map(),
    callStyleEvidence: [],
    callStyles: new Map(),
    dtoSuffixes: new Map(),
    fetchApiImportPaths: new Map(),
    fetchCalls: new Map(),
    functionPrefixes: new Map(),
    helperCalls: new Map(),
    helperCallStyles: new Map(),
    helperEvidence: [],
    helperImports: new Map(),
    httpClientEvidence: [],
    httpClientImports: new Map(),
  };
}

export { createSignalState };
