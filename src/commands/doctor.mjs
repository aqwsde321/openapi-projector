import fs from 'node:fs/promises';
import path from 'node:path';

import {
  loadProjectConfig,
  loadProjectRules,
  readJson,
} from '../core/openapi-utils.mjs';
import {
  formatValidationIssues,
  validateProjectRules,
} from '../config/validation.mjs';
import { loadSupportedOpenApiSpec } from '../openapi/load-spec.mjs';
import { failureMark, successMark, warningMark } from '../cli-format.mjs';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function toRelative(rootDir, targetPath) {
  const relativePath = path.relative(rootDir, targetPath);
  return relativePath || '.';
}

function isConfiguredSourceUrl(sourceUrl) {
  return typeof sourceUrl === 'string' && sourceUrl.trim() && !sourceUrl.includes('example.com');
}

function isConfiguredString(value) {
  return typeof value === 'string' && value.trim();
}

function isProjectConfigMissingError(error) {
  return error.message?.startsWith('Project config not found.');
}

async function checkSourceUrl(sourceUrl) {
  const response = await fetch(sourceUrl, { method: 'GET' });
  if (!response.ok) {
    return `HTTP ${response.status} ${response.statusText}`;
  }
  return null;
}

const doctorCommand = {
  name: 'doctor',
  async run(options = {}) {
    const argv = Array.isArray(options) ? options : (options.argv ?? []);
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? null;
    const checkUrl = argv.includes('--check-url');
    const lines = [];
    let ok = true;

    const pass = (message) => lines.push(`${successMark()} [PASS] ${message}`);
    const warn = (message) => lines.push(`${warningMark()} [WARN] ${message}`);
    const fail = (message) => {
      ok = false;
      lines.push(`${failureMark()} [FAIL] ${message}`);
    };
    const skip = (message) => lines.push(`- [SKIP] ${message}`);
    const checkExistingProjectRules = async () => {
      const rulesPath = path.join(rootDir, 'openapi/config/project-rules.jsonc');
      if (!(await pathExists(rulesPath))) {
        return;
      }

      try {
        const projectRules = await readJson(rulesPath);
        const rulesIssues = validateProjectRules(projectRules);
        if (rulesIssues.length > 0) {
          const rulesError = formatValidationIssues(rulesIssues);
          fail(`${toRelative(rootDir, rulesPath)} is invalid: ${rulesError}`);
        } else if (projectRules.review?.rulesReviewed !== true) {
          fail(`Existing project rules are valid but not reviewed: ${toRelative(rootDir, rulesPath)}`);
          lines.push(
            '  Next: review openapi/review/project-rules/analysis.md and analysis.json, then set review.rulesReviewed to true.',
          );
        } else {
          pass(`Existing project rules are valid: ${toRelative(rootDir, rulesPath)}`);
        }
      } catch (error) {
        fail(`Existing project rules are invalid: ${error.message}`);
        lines.push('  Fix: repair or remove openapi/config/project-rules.jsonc before running prepare.');
      }
    };
    const checkSourceScanRoot = async () => {
      const srcDir = path.join(rootDir, 'src');
      if (await pathExists(srcDir)) {
        pass('Target project source scan root exists: src');
      } else {
        warn('Target project src directory was not found. rules will still create a default scaffold.');
      }
    };

    lines.push('openapi-projector doctor', '');

    if (context.toolLocalConfig) {
      const localConfigName = path.basename(context.toolLocalConfigPath);
      if (localConfigName === '.openapi-tool.local.jsonc') {
        warn(`Using legacy local config: ${localConfigName}`);
        warn('Prefer .openapi-projector.local.jsonc for new setups.');
        if (
          context.toolLocalConfigs?.some(
            (entry) =>
              path.basename(entry.toolLocalConfigPath) === '.openapi-projector.local.jsonc' &&
              !isConfiguredString(entry.toolLocalConfig?.projectRoot),
          )
        ) {
          warn('The new local config exists but projectRoot is blank, so legacy config was used.');
        }
      } else {
        pass(`Local config found: ${localConfigName}`);
      }
    } else {
      if (rootDir) {
        warn('Local config not found. Using current target root.');
      } else {
        fail('Local config not found.');
        lines.push('  Fix: run npx --yes openapi-projector init.');
      }
    }

    if (!rootDir) {
      fail('Target project root is not configured.');
      lines.push('  Fix: run from the frontend project root or pass --project-root <frontend-project-root>.');
      console.log(lines.join('\n'));
      return { ok };
    }

    if (await pathExists(rootDir)) {
      pass(`Target project root exists: ${rootDir}`);
    } else {
      fail(`Target project root does not exist: ${rootDir}`);
      console.log(lines.join('\n'));
      return { ok };
    }

    let projectConfig = null;
    let projectConfigMissing = false;
    try {
      const result = await loadProjectConfig(rootDir);
      projectConfig = result.projectConfig;
      pass(`Project config found: ${toRelative(rootDir, result.projectConfigPath)}`);
    } catch (error) {
      if (isProjectConfigMissingError(error)) {
        projectConfigMissing = true;
        warn(error.message);
      } else {
        fail(`Project config is invalid: ${error.message}`);
      }
    }

    if (!projectConfig) {
      if (!projectConfigMissing) {
        lines.push('  Fix: repair the existing project config before running prepare.');
        lines.push('');
        lines.push('Result: fix failed checks before continuing.');
        console.log(lines.join('\n'));
        return { ok };
      }

      warn('Project config will be created by prepare/init.');
      const initSourceUrl = context.toolLocalConfig?.initDefaults?.sourceUrl;

      if (isConfiguredSourceUrl(initSourceUrl)) {
        pass(`sourceUrl available for initial prepare: ${initSourceUrl}`);
        if (checkUrl) {
          try {
            const sourceUrlError = await checkSourceUrl(initSourceUrl);
            if (sourceUrlError) {
              fail(`sourceUrl is not reachable: ${sourceUrlError}`);
            } else {
              pass('sourceUrl is reachable.');
            }
          } catch (error) {
            fail(`sourceUrl check failed: ${error.message}`);
          }
        } else {
          skip('sourceUrl reachability was not checked. Run doctor --check-url to verify it.');
        }
      } else {
        fail('Project config is missing.');
        lines.push(
          '  Fix: run npx --yes openapi-projector init, then set sourceUrl in openapi/config/project.jsonc.',
        );
      }

      skip('Downloaded OpenAPI JSON will be checked after prepare/init creates project config.');
      await checkExistingProjectRules();
      await checkSourceScanRoot();
      lines.push('');
      lines.push(ok ? 'Result: ready enough to continue.' : 'Result: fix failed checks before continuing.');
      console.log(lines.join('\n'));
      return { ok };
    }

    if (isConfiguredSourceUrl(projectConfig.sourceUrl)) {
      pass(`sourceUrl configured: ${projectConfig.sourceUrl}`);
      if (checkUrl) {
        try {
          const sourceUrlError = await checkSourceUrl(projectConfig.sourceUrl);
          if (sourceUrlError) {
            fail(`sourceUrl is not reachable: ${sourceUrlError}`);
          } else {
            pass('sourceUrl is reachable.');
          }
        } catch (error) {
          fail(`sourceUrl check failed: ${error.message}`);
        }
      } else {
        skip('sourceUrl reachability was not checked. Run doctor --check-url to verify it.');
      }
    } else {
      fail('sourceUrl is not configured.');
      lines.push('  Fix: set sourceUrl in openapi/config/project.jsonc before doctor/prepare.');
    }

    const sourcePath = path.resolve(rootDir, projectConfig.sourcePath);
    if (await pathExists(sourcePath)) {
      try {
        await loadSupportedOpenApiSpec(sourcePath);
        pass(`Downloaded OpenAPI JSON is valid: ${toRelative(rootDir, sourcePath)}`);
      } catch (error) {
        fail(`Downloaded OpenAPI JSON is invalid: ${error.message}`);
      }
    } else {
      warn(`Downloaded OpenAPI JSON not found: ${toRelative(rootDir, sourcePath)}`);
      lines.push('  Next: run npx --yes openapi-projector refresh after sourceUrl is configured.');
    }

    try {
      const { projectRulesPath, projectRules } = await loadProjectRules(rootDir, projectConfig);
      const rulesIssues = validateProjectRules(projectRules);
      if (rulesIssues.length > 0) {
        const rulesError = formatValidationIssues(rulesIssues);
        fail(`${toRelative(rootDir, projectRulesPath)} is invalid: ${rulesError}`);
      } else if (projectRules.review?.rulesReviewed !== true) {
        fail(`Project rules are valid but not reviewed: ${toRelative(rootDir, projectRulesPath)}`);
        lines.push(
          '  Next: review openapi/review/project-rules/analysis.md and analysis.json, then set review.rulesReviewed to true.',
        );
      } else {
        pass(`Project rules are valid: ${toRelative(rootDir, projectRulesPath)}`);
      }
    } catch (error) {
      if (error?.code === 'ENOENT') {
        warn(`Project rules are not ready: ${error.message}`);
        lines.push('  Next: run npx --yes openapi-projector rules.');
      } else {
        fail(`Project rules are invalid: ${error.message}`);
        lines.push(
          '  Fix: repair or remove the existing project rules file, then run npx --yes openapi-projector rules.',
        );
      }
    }

    await checkSourceScanRoot();

    lines.push('');
    lines.push(ok ? 'Result: ready enough to continue.' : 'Result: fix failed checks before continuing.');
    console.log(lines.join('\n'));
    return { ok };
  },
};

export { doctorCommand };
