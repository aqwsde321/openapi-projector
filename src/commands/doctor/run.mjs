import {
  getCommandArgv,
  getCommandContext,
  resolveCommandRoot,
} from '../../cli/command-options.mjs';
import {
  runDoctorWithConfiguredProject,
  runDoctorWithMissingProjectConfig,
} from './flows.mjs';
import { parseDoctorArgs } from './options.mjs';
import { createDoctorReporter } from './report.mjs';
import {
  checkDoctorProjectConfig,
  checkDoctorTargetRoot,
  reportLocalConfigStatus,
} from './workspace-checks.mjs';

async function runDoctor(options = {}) {
  const argv = getCommandArgv(options);
  const context = getCommandContext(options);
  const rootDir = resolveCommandRoot(options, { defaultRoot: null });
  const { checkUrl } = parseDoctorArgs(argv);
  const report = createDoctorReporter();
  const { fail, lines, pass, warn } = report;

  reportLocalConfigStatus(context, rootDir, { fail, lines, pass, warn });

  if (!(await checkDoctorTargetRoot(rootDir, report))) {
    return { ok: report.ok };
  }

  const { projectConfig, projectConfigMissing } = await checkDoctorProjectConfig(rootDir, {
    fail,
    pass,
    warn,
  });

  if (!projectConfig) {
    return runDoctorWithMissingProjectConfig({
      checkUrl,
      context,
      projectConfigMissing,
      report,
      rootDir,
    });
  }

  return runDoctorWithConfiguredProject({
    checkUrl,
    projectConfig,
    report,
    rootDir,
  });
}

export { runDoctor };
