import path from 'node:path';

import { relativePosixPath } from '../core/path-utils.mjs';

const DEFAULT_PROJECT_RULES_PATH = 'openapi/config/project-rules.jsonc';
const DEFAULT_PROJECT_RULES_ANALYSIS_PATH = 'openapi/review/project-rules/analysis.md';
const DEFAULT_PROJECT_RULES_ANALYSIS_JSON_PATH = 'openapi/review/project-rules/analysis.json';

function resolveProjectRulesPath(rootDir, projectConfig = {}) {
  return path.resolve(
    rootDir,
    projectConfig.projectRulesPath ?? DEFAULT_PROJECT_RULES_PATH,
  );
}

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

function resolveProjectRulesCommandPaths(rootDir, projectConfig) {
  const { analysisPath, analysisJsonPath } = resolveProjectRulesAnalysisPaths(
    rootDir,
    projectConfig,
  );
  const rulesPath = resolveProjectRulesPath(rootDir, projectConfig);

  return {
    analysisPath,
    analysisJsonPath,
    relativeAnalysisJsonPath: relativePosixPath(rootDir, analysisJsonPath),
    relativeRulesPath: relativePosixPath(rootDir, rulesPath),
    rulesPath,
  };
}

function resolveProjectRulesReviewPaths(rootDir, projectConfig, projectRulesPath) {
  const { analysisPath, analysisJsonPath } = resolveProjectRulesAnalysisPaths(
    rootDir,
    projectConfig,
  );
  const relativeProjectRulesPath = relativePosixPath(rootDir, projectRulesPath);
  const relativeAnalysisPath = relativePosixPath(rootDir, analysisPath);
  const relativeAnalysisJsonPath = relativePosixPath(rootDir, analysisJsonPath);

  return {
    relativeProjectRulesPath,
    relativeAnalysisPath,
    relativeAnalysisJsonPath,
    reviewInstructionOptions: {
      projectRulesPath: relativeProjectRulesPath,
      projectRulesAnalysisPath: relativeAnalysisPath,
      projectRulesAnalysisJsonPath: relativeAnalysisJsonPath,
    },
  };
}

export {
  DEFAULT_PROJECT_RULES_ANALYSIS_JSON_PATH,
  DEFAULT_PROJECT_RULES_ANALYSIS_PATH,
  DEFAULT_PROJECT_RULES_PATH,
  resolveProjectRulesAnalysisPaths,
  resolveProjectRulesCommandPaths,
  resolveProjectRulesPath,
  resolveProjectRulesReviewPaths,
};
