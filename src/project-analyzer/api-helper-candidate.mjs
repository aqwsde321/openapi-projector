import {
  createCandidate,
  parseHelperKey,
  sortedCounts,
} from './signal-utils.mjs';
import {
  buildApiHelperCounts,
  selectApiHelperEvidence,
  selectKnownCallStyle,
} from './api-helper-candidate-support.mjs';
export {
  buildAnalysisWarnings,
  UNKNOWN_API_HELPER_CALL_STYLE_WARNING_MESSAGE,
  UNSUPPORTED_API_HELPER_IMPORT_KIND_WARNING_MESSAGE,
} from './api-helper-warnings.mjs';

function createDefaultApiHelperCandidate() {
  return createCandidate(
    {
      symbol: 'fetchAPI',
      importPath: '@/shared/api',
      importKind: 'named',
      callStyle: 'url-config',
    },
    0.2,
    [],
  );
}

function pickApiHelperCandidate(signals) {
  const counts = buildApiHelperCounts(signals);
  const [top] = sortedCounts(counts);
  if (!top) {
    return createDefaultApiHelperCandidate();
  }

  const { symbol, importPath, importKind } = parseHelperKey(top.value);
  const helperCallStyles = signals.helperCallStyles.get(top.value) ?? new Map();
  const callStyle = selectKnownCallStyle(helperCallStyles);
  const hasUnknownCallStyle = (helperCallStyles.get('unknown') ?? 0) > 0;

  return createCandidate(
    {
      symbol,
      importPath,
      importKind,
      callStyle,
    },
    Math.min(1, 0.45 + top.count * 0.12),
    selectApiHelperEvidence({ signals, symbol }),
    {
      callStyles: sortedCounts(helperCallStyles),
      hasUnknownCallStyle,
    },
  );
}

export { pickApiHelperCandidate };
