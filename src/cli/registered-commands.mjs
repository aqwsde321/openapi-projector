import { catalogCommand } from '../commands/catalog.mjs';
import { downloadCommand } from '../commands/download.mjs';
import { doctorCommand } from '../commands/doctor.mjs';
import { generateCommand } from '../commands/generate.mjs';
import { initCommand } from '../commands/init.mjs';
import { prepareCommand } from '../commands/prepare.mjs';
import { projectCommand } from '../commands/project.mjs';
import { rulesCommand } from '../commands/rules.mjs';
import {
  updateCommand,
  upgradeDocsCommand,
} from '../commands/update.mjs';
import {
  helpCommand,
  installSkillCommand,
  refreshCommand,
  versionCommand,
} from './builtin-commands.mjs';
import { commandDescriptions } from './help.mjs';

const commandAliases = [
  ['--version', 'version'],
];

const configlessCommandNames = new Set([
  'help',
  'version',
  '--version',
  'install-skill',
]);

const registeredCommands = [
  catalogCommand,
  doctorCommand,
  downloadCommand,
  generateCommand,
  helpCommand,
  initCommand,
  installSkillCommand,
  prepareCommand,
  projectCommand,
  refreshCommand,
  rulesCommand,
  updateCommand,
  upgradeDocsCommand,
  versionCommand,
];

const commandByName = new Map(
  registeredCommands.map((command) => [command.name, command]),
);

function resolveRegisteredCommand(commandName) {
  const command = commandByName.get(commandName);
  if (!command) {
    throw new Error(`Command metadata references unregistered command: ${commandName}`);
  }
  return command;
}

const commandMap = new Map([
  ...commandDescriptions.map(([name]) => [name, resolveRegisteredCommand(name)]),
  ...commandAliases.map(([alias, name]) => [
    alias,
    resolveRegisteredCommand(name),
  ]),
]);

function getCliCommand(commandName) {
  return commandMap.get(commandName);
}

function isConfiglessCliCommand(commandName) {
  return configlessCommandNames.has(commandName);
}

export {
  getCliCommand,
  helpCommand,
  isConfiglessCliCommand,
};
