import {
  getCommandArgv,
  getCommandContext,
} from '../../cli/command-options.mjs';
import {
  initProject,
  initToolLocalConfig,
} from '../../core/project-workspace.mjs';
import { parseInitArgs } from './options.mjs';
import {
  DEFAULT_SOURCE_URL,
  promptForSourceUrl,
  shouldPromptForSourceUrl,
} from './source-url/index.mjs';
import { printInitSummary } from './summary.mjs';

async function runInit(rootDir, options = {}) {
  const argv = getCommandArgv(options);
  const context = getCommandContext(options);
  const force = argv.includes('--force');
  const initArgs = parseInitArgs(argv);
  const stdin = context.stdin ?? process.stdin;
  const stdout = context.stdout ?? process.stdout;
  const fetchImpl = context.fetch ?? globalThis.fetch;
  const promptDefaultSourceUrl =
    context.toolLocalConfig?.initDefaults?.sourceUrl ?? DEFAULT_SOURCE_URL;
  const interactiveSourceUrl = shouldPromptForSourceUrl({
    context,
    initArgs,
    stdin,
    stdout,
  })
    ? await promptForSourceUrl({
      defaultSourceUrl: promptDefaultSourceUrl,
      fetchImpl,
      stdin,
      stdout,
    })
    : null;
  const projectConfigOverrides = {
    ...(context.toolLocalConfig?.initDefaults ?? {}),
    ...(interactiveSourceUrl ? { sourceUrl: interactiveSourceUrl } : {}),
    ...(initArgs.sourceUrl ? { sourceUrl: initArgs.sourceUrl } : {}),
  };
  const result = await initProject(rootDir, { force, projectConfigOverrides });
  const localConfigResult = await initToolLocalConfig(rootDir);

  await printInitSummary({
    localConfigResult,
    result,
    rootDir,
  });
}

export { runInit };
