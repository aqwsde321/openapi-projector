import path from 'node:path';

import { loadToolLocalConfig } from './core/openapi-utils.mjs';
import { helpCommand } from './commands/help.mjs';
import { initCommand } from './commands/init.mjs';
import { downloadCommand } from './commands/download.mjs';
import { catalogCommand } from './commands/catalog.mjs';
import { generateCommand } from './commands/generate.mjs';
import { rulesCommand } from './commands/rules.mjs';
import { projectCommand } from './commands/project.mjs';
import { applyCommand } from './commands/apply.mjs';
import { refreshCommand } from './commands/refresh.mjs';

const commandMap = new Map([
  ['help', helpCommand],
  ['init', initCommand],
  ['download', downloadCommand],
  ['catalog', catalogCommand],
  ['generate', generateCommand],
  ['rules', rulesCommand],
  ['project', projectCommand],
  ['apply', applyCommand],
  ['refresh', refreshCommand],
]);

function printUnknownCommand(commandName) {
  console.error(`Unknown command: ${commandName}`);
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

async function runCli(argv) {
  const parsed = parseCliArgs(argv);
  const commandName = parsed.argv[0] ?? 'help';
  const command = commandMap.get(commandName);

  if (!command) {
    printUnknownCommand(commandName);
    process.exitCode = 1;
    return;
  }

  if (commandName === 'help') {
    await command.run({ argv: parsed.argv.slice(1) });
    return;
  }

  const { toolLocalConfigPath, toolLocalConfig } = await loadToolLocalConfig();
  const targetRootValue =
    normalizeConfiguredString(parsed.projectRoot) ??
    normalizeConfiguredString(toolLocalConfig?.projectRoot) ??
    null;

  if (!targetRootValue) {
    throw new Error(
      [
        'Target project root is not configured.',
        `Set "projectRoot" in ${toolLocalConfigPath} or pass --project-root /path/to/service-app.`,
      ].join('\n'),
    );
  }

  const context = {
    targetRoot: path.resolve(targetRootValue),
    toolLocalConfigPath,
    toolLocalConfig,
  };

  await command.run({ argv: parsed.argv.slice(1), context });
}

export { runCli };
