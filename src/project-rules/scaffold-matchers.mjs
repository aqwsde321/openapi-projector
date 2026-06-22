import {
  DEFAULT_API_RULES,
  DEFAULT_HOOK_RULES,
  LEGACY_SCHEMA_LAYOUT_RULES,
} from './defaults.mjs';
import { hasKnownScaffoldShape } from './scaffold-shape.mjs';

function arraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

function matchesScaffoldApiValues(api, expectedApi) {
  return Object.keys(DEFAULT_API_RULES).every((key) => {
    if (key === 'fetchApiImportKind' && api[key] == null) {
      return true;
    }

    return api[key] === expectedApi[key];
  });
}

function matchesScaffoldLayoutValues(layout, expectedLayout) {
  return (
    (layout.schemaFileName == null ||
      layout.schemaFileName === expectedLayout.schemaFileName ||
      layout.schemaFileName === LEGACY_SCHEMA_LAYOUT_RULES.schemaFileName) &&
    (layout.apiDirName == null ||
      layout.apiDirName === expectedLayout.apiDirName ||
      layout.apiDirName === LEGACY_SCHEMA_LAYOUT_RULES.apiDirName)
  );
}

function matchesScaffoldHookValues(hooks, expectedHooks) {
  if (hooks == null) {
    return true;
  }

  return Object.keys(DEFAULT_HOOK_RULES).every((key) => {
    if (hooks[key] == null) {
      return true;
    }

    return JSON.stringify(hooks[key]) === JSON.stringify(expectedHooks[key]);
  });
}

function matchesScaffoldReviewValues(review, candidate) {
  const notes = review.notes ?? [];

  if (review.rulesReviewed !== false || !arraysEqual(notes, candidate.reviewNotes)) {
    return false;
  }

  if (review.scaffoldSignature == null) {
    return true;
  }

  return review.scaffoldSignature === candidate.scaffoldSignature;
}

function matchesScaffoldCandidate({ api, hooks, layout, review }, candidate) {
  return (
    matchesScaffoldApiValues(api, candidate.api) &&
    matchesScaffoldHookValues(hooks, candidate.hooks ?? DEFAULT_HOOK_RULES) &&
    matchesScaffoldLayoutValues(layout, candidate.layout) &&
    matchesScaffoldReviewValues(review, candidate)
  );
}

export {
  hasKnownScaffoldShape,
  matchesScaffoldCandidate,
};
