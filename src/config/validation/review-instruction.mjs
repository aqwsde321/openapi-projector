import {
  DEFAULT_PROJECT_RULES_ANALYSIS_JSON_PATH,
  DEFAULT_PROJECT_RULES_ANALYSIS_PATH,
  DEFAULT_PROJECT_RULES_PATH,
} from '../project-paths.mjs';
import { normalizeNonBlankString } from '../../core/text-utils.mjs';

function normalizeInstructionPath(value, fallback) {
  return normalizeNonBlankString(value) ?? fallback;
}

function formatProjectRulesReviewInstruction({
  projectRulesPath = DEFAULT_PROJECT_RULES_PATH,
  projectRulesAnalysisPath = DEFAULT_PROJECT_RULES_ANALYSIS_PATH,
  projectRulesAnalysisJsonPath = DEFAULT_PROJECT_RULES_ANALYSIS_JSON_PATH,
} = {}) {
  const analysisPath = normalizeInstructionPath(
    projectRulesAnalysisPath,
    DEFAULT_PROJECT_RULES_ANALYSIS_PATH,
  );
  const analysisJsonPath = normalizeInstructionPath(
    projectRulesAnalysisJsonPath,
    DEFAULT_PROJECT_RULES_ANALYSIS_JSON_PATH,
  );
  const rulesPath = normalizeInstructionPath(projectRulesPath, DEFAULT_PROJECT_RULES_PATH);

  return `Review ${analysisPath} and ${analysisJsonPath}, then edit ${rulesPath}.`;
}

export { formatProjectRulesReviewInstruction };
