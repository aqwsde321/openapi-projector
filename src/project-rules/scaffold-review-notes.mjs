import {
  UNKNOWN_API_HELPER_CALL_STYLE_WARNING_MESSAGE,
  UNSUPPORTED_API_HELPER_IMPORT_KIND_WARNING_MESSAGE,
} from '../project-analyzer/api-helper-candidate.mjs';

const UNKNOWN_CALL_STYLE_REVIEW_NOTE =
  'adapterStyle was defaulted to url-config because the analyzer could not confirm the helper call shape. Inspect existing API calls before setting rulesReviewed to true.';
const UNSUPPORTED_IMPORT_KIND_REVIEW_NOTE =
  'fetchApiImportKind was defaulted to named because the analyzer found a helper import kind that generated wrappers do not support directly.';
const GENERATED_REVIEW_NOTES = new Set([
  UNKNOWN_API_HELPER_CALL_STYLE_WARNING_MESSAGE,
  UNSUPPORTED_API_HELPER_IMPORT_KIND_WARNING_MESSAGE,
  UNKNOWN_CALL_STYLE_REVIEW_NOTE,
  UNSUPPORTED_IMPORT_KIND_REVIEW_NOTE,
]);

function buildReviewNotes(analysis) {
  const apiHelper = analysis?.apiHelper?.value ?? {};

  return [
    ...(analysis?.warnings ?? []).map((warning) => warning.message),
    ...(apiHelper.callStyle === 'unknown' ? [UNKNOWN_CALL_STYLE_REVIEW_NOTE] : []),
    ...(apiHelper.importKind && !['named', 'default'].includes(apiHelper.importKind)
      ? [UNSUPPORTED_IMPORT_KIND_REVIEW_NOTE]
      : []),
  ];
}

function hasOnlyGeneratedReviewNotes(review, { allowEmpty = false } = {}) {
  const notes = review.notes ?? [];

  return (
    review.rulesReviewed === false &&
    Array.isArray(notes) &&
    (allowEmpty || notes.length > 0) &&
    notes.every((note) => GENERATED_REVIEW_NOTES.has(note))
  );
}

export {
  buildReviewNotes,
  hasOnlyGeneratedReviewNotes,
};
