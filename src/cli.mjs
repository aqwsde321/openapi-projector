import path from 'node:path';

import { formatFailure } from './cli-format.mjs';
import { loadToolLocalConfig } from './core/openapi-utils.mjs';
import { helpCommand } from './commands/help.mjs';
import { initCommand } from './commands/init.mjs';
import { downloadCommand } from './commands/download.mjs';
import { catalogCommand } from './commands/catalog.mjs';
import { generateCommand } from './commands/generate.mjs';
import { rulesCommand } from './commands/rules.mjs';
import { projectCommand } from './commands/project.mjs';
import { refreshCommand } from './commands/refresh.mjs';
import { doctorCommand } from './commands/doctor.mjs';
import { prepareCommand } from './commands/prepare.mjs';
import { upgradeDocsCommand } from './commands/upgrade-docs.mjs';
import { updateCommand } from './commands/update.mjs';
import { versionCommand } from './commands/version.mjs';

const commandMap = new Map([
  ['help', helpCommand],
  ['init', initCommand],
  ['download', downloadCommand],
  ['catalog', catalogCommand],
  ['generate', generateCommand],
  ['rules', rulesCommand],
  ['project', projectCommand],
  ['refresh', refreshCommand],
  ['doctor', doctorCommand],
  ['prepare', prepareCommand],
  ['update', updateCommand],
  ['upgrade-docs', upgradeDocsCommand],
  ['version', versionCommand],
  ['--version', versionCommand],
]);

function printUnknownCommand(commandName) {
  console.error(formatFailure(`Unknown command: ${commandName}`, process.stderr));
  console.error('');
  helpCommand.run();
}

function parseCliArgs(argv) {
  const rest = [];
  let projectRoot = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--project-root') {
      projectRoot = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--project-root=')) {
      projectRoot = arg.slice('--project-root='.length) || null;
      continue;
    }

    rest.push(arg);
  }

  return {
    projectRoot,
    argv: rest,
  };
}

function normalizeConfiguredString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function resolveConfiguredProjectRoot(projectRootValue, configPath) {
  const normalized = normalizeConfiguredString(projectRootValue);
  if (!normalized) {
    return null;
  }

  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return path.resolve(path.dirname(configPath), normalized);
}

async function runCli(argv) {
  const parsed = parseCliArgs(argv);
  const commandName = parsed.argv[0] ?? 'help';
  const command = commandMap.get(commandName);

  if (!command) {
    printUnknownCommand(commandName);
    process.exitCode = 1;
    return;
  }

  if (commandName === 'help' || commandName === 'version' || commandName === '--version') {
    await command.run({ argv: parsed.argv.slice(1) });
    return;
  }

  const {
    toolLocalConfigPath,
    toolLocalConfig,
    toolLocalConfigCandidates,
    toolLocalConfigs,
  } =
    await loadToolLocalConfig(process.cwd());
  const targetRootValue =
    normalizeConfiguredString(parsed.projectRoot) ??
    resolveConfiguredProjectRoot(toolLocalConfig?.projectRoot, toolLocalConfigPath) ??
    process.cwd();

  const context = {
    targetRoot: path.resolve(targetRootValue),
    toolLocalConfigPath,
    toolLocalConfig,
    toolLocalConfigCandidates,
    toolLocalConfigs,
  };

  const result = await command.run({ argv: parsed.argv.slice(1), context });
  if (result?.ok === false) {
    process.exitCode = 1;
  }
}

export { runCli };
