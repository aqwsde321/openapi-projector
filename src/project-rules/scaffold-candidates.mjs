import { isPlainObject } from '../core/object-utils.mjs';
import { DEFAULT_REVIEW_RULES } from './defaults.mjs';
import { buildScaffoldDefaultsFromAnalysis } from './analysis-scaffold-defaults.mjs';
import { buildScaffoldCandidates } from './scaffold-candidate-list.mjs';
import {
  hasKnownScaffoldShape,
  matchesScaffoldCandidate,
} from './scaffold-matchers.mjs';
import {
  buildScaffoldSignature,
} from './scaffold-signature.mjs';

function isDefaultProjectRulesScaffold(rules, previousAnalysis = null) {
  if (!isPlainObject(rules)) {
    return false;
  }

  const api = rules.api ?? {};
  const hooks = rules.hooks ?? undefined;
  const layout = rules.layout ?? {};
  const review = rules.review ?? DEFAULT_REVIEW_RULES;
  const hasKnownShape =
    isPlainObject(api) &&
    (hooks == null || isPlainObject(hooks)) &&
    isPlainObject(layout) &&
    isPlainObject(review) &&
    hasKnownScaffoldShape(rules);

  if (!hasKnownShape) {
    return false;
  }

  return buildScaffoldCandidates(previousAnalysis, rules).some((candidate) =>
    matchesScaffoldCandidate({ api, hooks, layout, review }, candidate),
  );
}

export {
  buildScaffoldDefaultsFromAnalysis,
  buildScaffoldSignature,
  isDefaultProjectRulesScaffold,
};
