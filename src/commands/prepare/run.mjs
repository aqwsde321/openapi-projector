import {
  isConfiguredSourceUrl,
  loadProjectConfig,
} from '../../core/project-workspace.mjs';
import {
  logInitSkipped,
  logPrepareComplete,
  logPrepareStart,
  logPrepareStep,
} from './output.mjs';
import { assertPrepareProjectRulesReviewed } from './review-gate.mjs';
import {
  runInitStep,
  runProjectStep,
  runRefreshSteps,
  runRulesStep,
} from './steps.mjs';
import {
  hasProjectConfig,
  warnIfProjectRulesUpdateRecommended,
} from './workspace.mjs';

async function runPrepare(rootDir, options) {
  logPrepareStart(rootDir);

  if (await hasProjectConfig(rootDir)) {
    logInitSkipped();
  } else {
    logPrepareStep('init', '작업 공간과 기본 설정을 생성합니다.');
    await runInitStep(options);
  }

  const { projectConfig } = await loadProjectConfig(rootDir);
  if (!isConfiguredSourceUrl(projectConfig.sourceUrl)) {
    throw new Error(
      [
        'sourceUrl is not configured.',
        'Set sourceUrl in openapi/config/project.jsonc before running prepare.',
      ].join('\n'),
    );
  }

  logPrepareStep(
    'refresh',
    'Swagger/OpenAPI를 내려받고 이전 버전과 비교해 openapi/changes.md를 만듭니다.',
  );
  await runRefreshSteps(options);

  await warnIfProjectRulesUpdateRecommended(rootDir, projectConfig);

  logPrepareStep(
    'rules',
    '현재 프론트엔드 프로젝트의 API 호출 규칙을 분석해 openapi/config/project-rules.jsonc를 만듭니다.',
  );
  await runRulesStep(options);

  await assertPrepareProjectRulesReviewed(rootDir, projectConfig);

  logPrepareStep('project', '검토된 규칙으로 DTO/API 후보를 생성합니다.');
  await runProjectStep(options);

  logPrepareComplete();
}

export { runPrepare };
