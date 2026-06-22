import { formatWarning } from '../../cli/format.mjs';
import { resolveProjectRulesReviewPaths } from '../../config/project-paths.mjs';
import { assertProjectRulesReviewed } from '../../config/validation/assertions.mjs';
import { loadProjectRules } from '../../core/project-workspace.mjs';

async function assertPrepareProjectRulesReviewed(rootDir, projectConfig) {
  const { projectRules, projectRulesPath } = await loadProjectRules(rootDir, projectConfig);
  const reviewPaths = resolveProjectRulesReviewPaths(rootDir, projectConfig, projectRulesPath);
  const {
    relativeProjectRulesPath,
    relativeAnalysisPath,
    relativeAnalysisJsonPath,
  } = reviewPaths;

  try {
    assertProjectRulesReviewed(projectRules, reviewPaths.reviewInstructionOptions);
  } catch (error) {
    if (!error.message?.startsWith('Project rules have not been reviewed.')) {
      throw error;
    }

    console.log('');
    console.log(formatWarning('project: review.rulesReviewed가 true가 아니어서 DTO/API 후보 생성을 건너뜁니다.'));
    console.log(
      `- manual: ${relativeProjectRulesPath}에서 review.rulesReviewed=true로 설정`,
    );
    throw new Error(
      [
        'Project rules have not been reviewed.',
        `Review ${relativeAnalysisPath} and ${relativeAnalysisJsonPath}, then edit ${relativeProjectRulesPath}.`,
        'Set review.rulesReviewed to true before generating project candidates.',
      ].join('\n'),
    );
  }
}

export { assertPrepareProjectRulesReviewed };
