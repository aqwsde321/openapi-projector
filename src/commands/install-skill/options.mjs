import { installSkillUsage } from './usage.mjs';

function readOptionValue(argv, index, optionName) {
  const value = argv[index + 1] ?? null;
  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

function readOptionArg(argv, index, optionName, key) {
  const arg = argv[index];
  const inlinePrefix = `${optionName}=`;
  if (arg === optionName) {
    return { key, nextIndex: index + 1, value: readOptionValue(argv, index, optionName) };
  }

  if (!arg.startsWith(inlinePrefix)) {
    return null;
  }

  const value = arg.slice(inlinePrefix.length);
  if (!value) {
    throw new Error(`${optionName} requires a value.`);
  }

  return { key, nextIndex: index, value };
}

function parseInstallSkillArgs(argv) {
  const options = {
    agent: 'codex',
    dryRun: false,
    force: false,
    targetDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const valueOption =
      readOptionArg(argv, index, '--agent', 'agent') ??
      readOptionArg(argv, index, '--target-dir', 'targetDir');

    if (arg === '--help') {
      return { ...options, help: true };
    }

    if (valueOption) {
      options[valueOption.key] = valueOption.value;
      index = valueOption.nextIndex;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--yes') {
      continue;
    }

    throw new Error(`Unknown option: ${arg}\n\n${installSkillUsage()}`);
  }

  if (options.agent !== 'codex') {
    throw new Error(`Unsupported agent: ${options.agent}\n\n${installSkillUsage()}`);
  }

  if (options.targetDir === '') {
    throw new Error('--target-dir requires a value.');
  }

  return options;
}

export {
  parseInstallSkillArgs,
};
