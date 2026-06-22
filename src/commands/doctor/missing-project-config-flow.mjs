import { checkExistingProjectRules } from './existing-project-rules.mjs';
import { checkDoctorSourceUrl } from './source-url.mjs';
import { checkSourceScanRoot } from './workspace-checks.mjs';

async function runDoctorWithMissingProjectConfig({
  checkUrl,
  context,
  projectConfigMissing,
  report,
  rootDir,
}) {
  const { fail, lines, pass, skip, warn } = report;

  if (!projectConfigMissing) {
    lines.push('  Fix: repair the existing project config before running prepare.');
    return report.finish();
  }

  warn('Project config will be created by prepare/init.');
  const initSourceUrl = context.toolLocalConfig?.initDefaults?.sourceUrl;

  await checkDoctorSourceUrl({
    checkUrl,
    configuredMessage: (sourceUrl) => `sourceUrl available for initial prepare: ${sourceUrl}`,
    fail,
    lines,
    missingFix:
      '  Fix: run npx --yes openapi-projector@latest init, then set sourceUrl in openapi/config/project.jsonc.',
    missingMessage: 'Project config is missing.',
    pass,
    skip,
    sourceUrl: initSourceUrl,
  });

  skip('Downloaded OpenAPI JSON will be checked after prepare/init creates project config.');
  await checkExistingProjectRules(rootDir, { fail, lines, pass });
  await checkSourceScanRoot(rootDir, { pass, warn });
  return report.finish();
}

export { runDoctorWithMissingProjectConfig };
