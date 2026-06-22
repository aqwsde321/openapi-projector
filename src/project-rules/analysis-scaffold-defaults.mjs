import {
  DEFAULT_API_RULES,
  DEFAULT_HOOK_RULES,
  DEFAULT_LAYOUT_RULES,
} from './defaults.mjs';
import { buildReviewNotes } from './scaffold-review-notes.mjs';
import { createScaffoldCandidate } from './scaffold-signature.mjs';

function findMostUsedImportPath(stats) {
  return stats[0]?.importPath ?? null;
}

function buildScaffoldDefaultsFromAnalysis(analysis) {
  const apiHelper = analysis?.apiHelper?.value ?? {};
  const fetchApiImportStats = analysis?.legacy?.fetchApiImportStats ?? [];
  const hasImportedHelper = apiHelper.importPath && apiHelper.importPath !== '<local>';
  const fetchApiImportPath = hasImportedHelper
    ? apiHelper.importPath
    : findMostUsedImportPath(fetchApiImportStats) ?? DEFAULT_API_RULES.fetchApiImportPath;
  const fetchApiSymbol = hasImportedHelper
    ? apiHelper.symbol ?? DEFAULT_API_RULES.fetchApiSymbol
    : DEFAULT_API_RULES.fetchApiSymbol;
  const fetchApiImportKind =
    hasImportedHelper && apiHelper.importKind === 'default' ? 'default' : 'named';
  const adapterStyle = ['url-config', 'request-object'].includes(apiHelper.callStyle)
    ? apiHelper.callStyle
    : DEFAULT_API_RULES.adapterStyle;

  return createScaffoldCandidate({
    api: {
      fetchApiImportPath,
      fetchApiSymbol,
      fetchApiImportKind,
      adapterStyle,
      wrapperGrouping: DEFAULT_API_RULES.wrapperGrouping,
      tagFileCase: DEFAULT_API_RULES.tagFileCase,
    },
    hooks: {
      ...DEFAULT_HOOK_RULES,
      enabled: analysis?.apiLayer?.value?.usesReactQuery === true,
    },
    layout: DEFAULT_LAYOUT_RULES,
    reviewNotes: buildReviewNotes(analysis),
  });
}

export { buildScaffoldDefaultsFromAnalysis };
