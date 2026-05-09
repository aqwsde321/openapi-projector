import path from 'node:path';

const DEFAULT_PROJECT_RULES_PATH = 'openapi/config/project-rules.jsonc';
const DEFAULT_PROJECT_RULES_ANALYSIS_PATH = 'openapi/review/project-rules/analysis.md';
const DEFAULT_PROJECT_RULES_ANALYSIS_JSON_PATH = 'openapi/review/project-rules/analysis.json';

function resolveProjectRulesAnalysisPaths(rootDir, projectConfig = {}) {
  const analysisPath = path.resolve(
    rootDir,
    projectConfig.projectRulesAnalysisPath ?? DEFAULT_PROJECT_RULES_ANALYSIS_PATH,
  );
  const analysisJsonPath = path.resolve(
    rootDir,
    projectConfig.projectRulesAnalysisJsonPath ?? path.join(path.dirname(analysisPath), 'analysis.json'),
  );

  return {
    analysisPath,
    analysisJsonPath,
  };
}

export {
  DEFAULT_PROJECT_RULES_ANALYSIS_JSON_PATH,
  DEFAULT_PROJECT_RULES_ANALYSIS_PATH,
  DEFAULT_PROJECT_RULES_PATH,
  resolveProjectRulesAnalysisPaths,
};
