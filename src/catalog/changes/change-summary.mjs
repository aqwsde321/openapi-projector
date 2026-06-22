import { collectChangeSummaryItems } from './change-summary-items.mjs';

const CATALOG_FORMAT_VERSION = 2;

function buildChangeSummary(
  previousEntries,
  nextEntries,
  previousVersion,
  projectCandidateFilesByOperation = new Map(),
) {
  const now = new Date().toISOString();

  if (shouldCreateBaselineSummary(previousEntries, previousVersion)) {
    return buildBaselineChangeSummary(now, nextEntries);
  }

  const changeItems = collectChangeSummaryItems({
    nextEntries,
    previousEntries,
    projectCandidateFilesByOperation,
  });

  return {
    generatedAt: now,
    baseline: false,
    total: nextEntries.length,
    ...changeItems,
  };
}

function shouldCreateBaselineSummary(previousEntries, previousVersion) {
  return (
    previousVersion !== CATALOG_FORMAT_VERSION ||
    !previousEntries ||
    previousEntries.length === 0 ||
    previousEntries.every(
      (entry) => !entry.rawFingerprint || !entry.contractFingerprint,
    )
  );
}

function buildBaselineChangeSummary(generatedAt, nextEntries) {
  return {
    generatedAt,
    baseline: true,
    total: nextEntries.length,
    added: [],
    removed: [],
    contractChanged: [],
    docChanged: [],
  };
}

function hasRecordedChanges(changeSummary) {
  return (
    !changeSummary.baseline &&
    (changeSummary.added.length > 0 ||
      changeSummary.removed.length > 0 ||
      changeSummary.contractChanged.length > 0 ||
      changeSummary.docChanged.length > 0)
  );
}

export {
  CATALOG_FORMAT_VERSION,
  buildChangeSummary,
  hasRecordedChanges,
};
