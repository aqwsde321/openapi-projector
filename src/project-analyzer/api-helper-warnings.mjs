const UNKNOWN_API_HELPER_CALL_STYLE_WARNING_MESSAGE =
  'API helper candidate was found, but the request call shape was not url-config or request-object. Inspect member calls such as apiClient.get/post before trusting adapterStyle.';
const UNSUPPORTED_API_HELPER_IMPORT_KIND_WARNING_MESSAGE =
  'API helper candidate uses an import kind that generated wrappers cannot reproduce automatically. Confirm fetchApiImportPath and fetchApiSymbol manually.';

function buildAnalysisWarnings(apiHelper) {
  const warnings = [];
  const value = apiHelper.value ?? {};

  if (
    apiHelper.confidence > 0 &&
    (value.callStyle === 'unknown' || apiHelper.hasUnknownCallStyle)
  ) {
    warnings.push({
      code: 'unknown-api-helper-call-style',
      message: UNKNOWN_API_HELPER_CALL_STYLE_WARNING_MESSAGE,
    });
  }

  if (value.importKind && !['named', 'default'].includes(value.importKind)) {
    warnings.push({
      code: 'unsupported-api-helper-import-kind',
      message: UNSUPPORTED_API_HELPER_IMPORT_KIND_WARNING_MESSAGE,
    });
  }

  return warnings;
}

export {
  buildAnalysisWarnings,
  UNKNOWN_API_HELPER_CALL_STYLE_WARNING_MESSAGE,
  UNSUPPORTED_API_HELPER_IMPORT_KIND_WARNING_MESSAGE,
};
