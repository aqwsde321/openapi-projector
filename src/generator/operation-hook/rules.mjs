const DEFAULT_QUERY_METHODS = ['GET'];
const DEFAULT_MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function normalizeMethodList(value, fallback) {
  return (Array.isArray(value) ? value : fallback).map((method) =>
    String(method).toUpperCase(),
  );
}

function normalizeHookRules(hookRules = {}) {
  return {
    enabled: hookRules.enabled === true,
    library: hookRules.library ?? '@tanstack/react-query',
    queryMethods: normalizeMethodList(hookRules.queryMethods, DEFAULT_QUERY_METHODS),
    mutationMethods: normalizeMethodList(
      hookRules.mutationMethods,
      DEFAULT_MUTATION_METHODS,
    ),
    queryKeyStrategy: hookRules.queryKeyStrategy ?? 'path-and-params',
    responseUnwrap: hookRules.responseUnwrap ?? 'none',
    staleTimeImportPath: hookRules.staleTimeImportPath ?? null,
    staleTimeSymbol: hookRules.staleTimeSymbol ?? null,
  };
}

export { normalizeHookRules };
