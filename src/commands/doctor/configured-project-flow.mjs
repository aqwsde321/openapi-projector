import {
  checkDoctorProjectRules,
} from './project-rules.mjs';
import { checkDoctorSourceUrl } from './source-url.mjs';
import {
  checkDownloadedOpenApiSource,
  checkSourceScanRoot,
} from './workspace-checks.mjs';

async function runDoctorWithConfiguredProject({
  checkUrl,
  projectConfig,
  report,
  rootDir,
}) {
  const { fail, lines, pass, skip, warn } = report;

  await checkDoctorSourceUrl({
    checkUrl,
    configuredMessage: (sourceUrl) => `sourceUrl configured: ${sourceUrl}`,
    fail,
    lines,
    missingFix: '  Fix: set sourceUrl in openapi/config/project.jsonc before doctor/prepare.',
    missingMessage: 'sourceUrl is not configured.',
    pass,
    skip,
    sourceUrl: projectConfig.sourceUrl,
  });

  await checkDownloadedOpenApiSource(rootDir, projectConfig, {
    fail,
    lines,
    pass,
    warn,
  });

  await checkDoctorProjectRules(rootDir, projectConfig, { fail, lines, pass, warn });

  await checkSourceScanRoot(rootDir, { pass, warn });

  return report.finish();
}

export { runDoctorWithConfiguredProject };
