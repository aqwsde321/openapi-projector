import {
  buildCliCommandContext,
  parseCliArgs,
} from './context.mjs';
import { formatFailure } from './format.mjs';
import {
  getCliCommand,
  helpCommand,
  isConfiglessCliCommand,
} from './registered-commands.mjs';

function printUnknownCommand(commandName) {
  console.error(formatFailure(`Unknown command: ${commandName}`, process.stderr));
  console.error('');
  helpCommand.run();
}

async function runCli(argv) {
  const parsed = parseCliArgs(argv);
  const commandName = parsed.argv[0] ?? 'help';
  const command = getCliCommand(commandName);

  if (!command) {
    printUnknownCommand(commandName);
    process.exitCode = 1;
    return;
  }

  if (isConfiglessCliCommand(commandName)) {
    await command.run({ argv: parsed.argv.slice(1) });
    return;
  }

  const context = await buildCliCommandContext(parsed);

  const result = await command.run({ argv: parsed.argv.slice(1), context });
  if (result?.ok === false) {
    process.exitCode = 1;
  }
}

export { runCli };
