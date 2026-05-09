import path from 'node:path';
import { initCommand } from './init.mjs';
import { refreshCommand } from './refresh.mjs';
import { getProjectRulesMissingCurrentDefaults, rulesCommand } from './rules.mjs';
import { projectCommand } from './project.mjs';
import { loadProjectConfig, loadProjectRules } from '../core/openapi-utils.mjs';
import { assertProjectRulesReviewed } from '../config/validation.mjs';
import { resolveProjectRulesAnalysisPaths } from '../config/project-paths.mjs';
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

function toPosixPath(value) {
  return value.replaceAll(path.sep, '/');
}

function toProjectRelativePath(rootDir, projectPath) {
  return toPosixPath(path.relative(rootDir, path.resolve(rootDir, projectPath)));
}

async function warnIfProjectRulesUpdateRecommended(rootDir, projectConfig) {
  let projectRules;
  let projectRulesPath;
  try {
    ({ projectRules, projectRulesPath } = await loadProjectRules(rootDir, projectConfig));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const missingFields = getProjectRulesMissingCurrentDefaults(projectRules);
  if (missingFields.length === 0) {
    return;
  }

  console.log(formatWarning('project rules are missing defaults added by the current CLI.'));
  for (const field of missingFields) {
    console.log(`- missing: ${field}`);
  }
  console.log('- this run will add safe defaults');
  console.log(`- check: ${toPosixPath(path.relative(rootDir, projectRulesPath))}`);
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

    await warnIfProjectRulesUpdateRecommended(rootDir, projectConfig);

    logPrepareStep(
      'rules',
      '현재 프론트엔드 프로젝트의 API 호출 규칙을 분석해 openapi/config/project-rules.jsonc를 만듭니다.',
    );
    await rulesCommand.run(options);

    const { projectRules, projectRulesPath } = await loadProjectRules(rootDir, projectConfig);
    const relativeProjectRulesPath = toPosixPath(path.relative(rootDir, projectRulesPath));
    const { analysisPath, analysisJsonPath } = resolveProjectRulesAnalysisPaths(rootDir, projectConfig);
    const relativeAnalysisPath = toProjectRelativePath(rootDir, analysisPath);
    const relativeAnalysisJsonPath = toProjectRelativePath(rootDir, analysisJsonPath);
    try {
      assertProjectRulesReviewed(projectRules, {
        projectRulesPath: relativeProjectRulesPath,
        projectRulesAnalysisPath: relativeAnalysisPath,
        projectRulesAnalysisJsonPath: relativeAnalysisJsonPath,
      });
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

    logPrepareStep('project', '검토된 규칙으로 DTO/API 후보를 생성합니다.');
    await projectCommand.run(options);

    console.log('');
    console.log(formatSuccess('prepare complete: openapi/project/summary.md를 확인하세요.'));
  },
};

export { prepareCommand };
