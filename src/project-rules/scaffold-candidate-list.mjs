import {
  DEFAULT_API_RULES,
  DEFAULT_HOOK_RULES,
  DEFAULT_LAYOUT_RULES,
  DEFAULT_REVIEW_RULES,
  LEGACY_SCHEMA_LAYOUT_RULES,
} from './defaults.mjs';
import { buildScaffoldDefaultsFromAnalysis } from './analysis-scaffold-defaults.mjs';
import { buildCurrentRulesScaffoldCandidate } from './current-rules-scaffold-candidate.mjs';
import { createScaffoldCandidate } from './scaffold-signature.mjs';

function buildScaffoldCandidates(previousAnalysis, rules) {
  const candidates = [
    createScaffoldCandidate({
      api: DEFAULT_API_RULES,
      hooks: DEFAULT_HOOK_RULES,
      layout: DEFAULT_LAYOUT_RULES,
      reviewNotes: DEFAULT_REVIEW_RULES.notes,
    }),
    createScaffoldCandidate({
      api: DEFAULT_API_RULES,
      hooks: DEFAULT_HOOK_RULES,
      layout: LEGACY_SCHEMA_LAYOUT_RULES,
      reviewNotes: DEFAULT_REVIEW_RULES.notes,
    }),
  ];

  if (previousAnalysis) {
    const previousCandidate = buildScaffoldDefaultsFromAnalysis(previousAnalysis);
    candidates.push(previousCandidate);
    candidates.push(
      createScaffoldCandidate({
        api: previousCandidate.api,
        layout: LEGACY_SCHEMA_LAYOUT_RULES,
        reviewNotes: previousCandidate.reviewNotes,
      }),
    );
  }

  const currentRulesCandidate = buildCurrentRulesScaffoldCandidate(rules);
  if (currentRulesCandidate) {
    candidates.push(currentRulesCandidate);
  }

  return candidates;
}

export { buildScaffoldCandidates };
