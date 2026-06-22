import path from 'node:path';

import {
  loadProjectConfig,
} from '../../core/project-workspace.mjs';
import { pathExists } from '../../io/files.mjs';
import { reportLocalConfigStatus } from './local-config-status.mjs';
import { checkDownloadedOpenApiSource } from './openapi-source-check.mjs';
import {
  isProjectConfigMissingError,
  toDoctorRelativePath,
} from './workspace-helpers.mjs';

async function checkDoctorTargetRoot(rootDir, report) {
  const { fail, lines, pass } = report;

  if (!rootDir) {
    fail('Target project root is not configured.');
    lines.push('  Fix: run from the frontend project root or pass --project-root <frontend-project-root>.');
    report.print();
    return false;
  }

  if (await pathExists(rootDir)) {
    pass(`Target project root exists: ${rootDir}`);
    return true;
  }

  fail(`Target project root does not exist: ${rootDir}`);
  report.print();
  return false;
}

async function checkDoctorProjectConfig(rootDir, { fail, pass, warn }) {
  try {
    const result = await loadProjectConfig(rootDir);
    pass(`Project config found: ${toDoctorRelativePath(rootDir, result.projectConfigPath)}`);
    return {
      projectConfig: result.projectConfig,
      projectConfigMissing: false,
    };
  } catch (error) {
    if (isProjectConfigMissingError(error)) {
      warn(error.message);
      return {
        projectConfig: null,
        projectConfigMissing: true,
      };
    }

    fail(`Project config is invalid: ${error.message}`);
    return {
      projectConfig: null,
      projectConfigMissing: false,
    };
  }
}

async function checkSourceScanRoot(rootDir, { pass, warn }) {
  const srcDir = path.join(rootDir, 'src');
  if (await pathExists(srcDir)) {
    pass('Target project source scan root exists: src');
  } else {
    warn('Target project src directory was not found. rules will still create a default scaffold.');
  }
}

export {
  checkDoctorProjectConfig,
  checkDoctorTargetRoot,
  checkDownloadedOpenApiSource,
  checkSourceScanRoot,
  reportLocalConfigStatus,
};
