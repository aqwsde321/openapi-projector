function buildRuntimeWrapperReview({
  runtimeFetchImportPath,
  runtimeFetchSymbol,
  runtimeFetchImportKind,
  runtimeCallStyle,
}) {
  return {
    importPath: runtimeFetchImportPath,
    importSymbol: runtimeFetchSymbol,
    importKind: runtimeFetchImportKind,
    adapterStyle: runtimeCallStyle,
    callShape:
      runtimeCallStyle === 'request-object'
        ? 'fetchAPI({ url, method, params, data, headers })'
        : 'fetchAPI(url, { method, params, data, headers })',
    assumptions: [
      'The imported helper returns the response body typed as T.',
      'If the project helper returns AxiosResponse<T> or a response envelope, adapt the wrapper before copying generated API files.',
      'Request params, data, headers, and method must match the existing frontend client contract.',
    ],
  };
}

export { buildRuntimeWrapperReview };
