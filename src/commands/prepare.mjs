import { initCommand } from './init.mjs';
import { refreshCommand } from './refresh.mjs';
import { rulesCommand } from './rules.mjs';
import { projectCommand } from './project.mjs';
import { loadProjectConfig, loadProjectRules } from '../core/openapi-utils.mjs';
import { assertProjectRulesReviewed } from '../config/validation.mjs';
import { formatSuccess, formatWarning } from '../cli-format.mjs';

async function hasProjectConfig(rootDir) {
  try {
    await loadProjectConfig(rootDir);
    return true;
  } catch (error) {
    if (error.message?.startsWith('Project config not found.')) {
      return false;
    }
    throw error;
  }
}

function isConfiguredSourceUrl(sourceUrl) {
  return typeof sourceUrl === 'string' && sourceUrl.trim() && !sourceUrl.includes('example.com');
}

function logPrepareStep(command, description) {
  console.log('');
  console.log(formatSuccess(`${command}: ${description}`));
}

const prepareCommand = {
  name: 'prepare',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();

    console.log(formatSuccess(`prepare: running in ${rootDir}`));

    if (await hasProjectConfig(rootDir)) {
      console.log(formatSuccess('init: skipped because project config already exists'));
    } else {
      logPrepareStep('init', '작업 공간과 기본 설정을 생성합니다.');
      await initCommand.run(options);
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
    await refreshCommand.run(options);

    logPrepareStep(
      'rules',
      '현재 프론트엔드 프로젝트의 API 호출 규칙을 분석해 openapi/config/project-rules.jsonc를 만듭니다.',
    );
    await rulesCommand.run(options);

    const { projectRules } = await loadProjectRules(rootDir, projectConfig);
    try {
      assertProjectRulesReviewed(projectRules);
    } catch (error) {
      console.log('');
      console.log(formatWarning('project: review.rulesReviewed가 true가 아니어서 DTO/API 후보 생성을 건너뜁니다.'));
      console.log('- update: openapi/config/project-rules.jsonc -> review.rulesReviewed=true');
      throw error;
    }

    logPrepareStep('project', '검토된 규칙으로 DTO/API 후보를 생성합니다.');
    await projectCommand.run(options);

    console.log('');
    console.log(formatSuccess('prepare complete: openapi/project/summary.md를 확인하세요.'));
  },
};

export { prepareCommand };
