import {
  DEFAULT_API_RULES,
  DEFAULT_HOOK_RULES,
  DEFAULT_LAYOUT_RULES,
  DEFAULT_REVIEW_RULES,
} from './defaults.mjs';
import { hasOnlyGeneratedReviewNotes } from './scaffold-review-notes.mjs';
import { createScaffoldCandidate } from './scaffold-signature.mjs';

function buildCurrentRulesScaffoldCandidate(rules) {
  const api = rules.api ?? {};
  const hooks = rules.hooks ?? DEFAULT_HOOK_RULES;
  const review = rules.review ?? DEFAULT_REVIEW_RULES;
  const notes = review.notes ?? [];

  if (!hasOnlyGeneratedReviewNotes(review, { allowEmpty: true })) {
    return null;
  }

  if (typeof review.scaffoldSignature !== 'string' || !review.scaffoldSignature.trim()) {
    return null;
  }

  if (
    typeof api.fetchApiImportPath !== 'string' ||
    typeof api.fetchApiSymbol !== 'string' ||
    !['url-config', 'request-object'].includes(api.adapterStyle)
  ) {
    return null;
  }

  const candidate = createScaffoldCandidate({
    api: {
      fetchApiImportPath: api.fetchApiImportPath,
      fetchApiSymbol: api.fetchApiSymbol,
      fetchApiImportKind: api.fetchApiImportKind ?? DEFAULT_API_RULES.fetchApiImportKind,
      adapterStyle: api.adapterStyle,
      wrapperGrouping: DEFAULT_API_RULES.wrapperGrouping,
      tagFileCase: DEFAULT_API_RULES.tagFileCase,
    },
    hooks: {
      enabled: hooks.enabled === true,
      library: hooks.library ?? DEFAULT_HOOK_RULES.library,
      queryMethods: hooks.queryMethods ?? DEFAULT_HOOK_RULES.queryMethods,
      mutationMethods: hooks.mutationMethods ?? DEFAULT_HOOK_RULES.mutationMethods,
      queryKeyStrategy: hooks.queryKeyStrategy ?? DEFAULT_HOOK_RULES.queryKeyStrategy,
      responseUnwrap: hooks.responseUnwrap ?? DEFAULT_HOOK_RULES.responseUnwrap,
    },
    layout: DEFAULT_LAYOUT_RULES,
    reviewNotes: notes,
  });

  return review.scaffoldSignature === candidate.scaffoldSignature ? candidate : null;
}

export { buildCurrentRulesScaffoldCandidate };
