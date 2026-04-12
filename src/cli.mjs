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

async function runCli(argv) {
  const commandName = argv[0] ?? 'help';
  const command = commandMap.get(commandName);

  if (!command) {
    printUnknownCommand(commandName);
    process.exitCode = 1;
    return;
  }

  await command.run(argv.slice(1));
}

export { runCli };
