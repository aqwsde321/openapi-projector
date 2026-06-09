import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatSuccess } from '../cli-format.mjs';

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const SKILL_NAME = 'openapi-projector';
const SOURCE_SKILL_DIR = path.join(PACKAGE_ROOT, 'skills', SKILL_NAME);

function usage() {
  return [
    'Usage:',
    '  openapi-projector install-skill [options]',
    '',
    'Options:',
    '  --agent codex          Install for Codex. This is the default and currently supported agent.',
    '  --target-dir <path>    Install to a custom skill directory instead of ~/.codex/skills/openapi-projector.',
    '  --force                Replace an existing installed skill.',
    '  --dry-run              Print the target path without writing files.',
    '  --yes                 Accepted for agent-driven flows; install-skill does not prompt.',
    '  --help                 Show this help.',
  ].join('\n');
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index + 1] ?? null;
  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

function parseArgs(argv) {
  const options = {
    agent: 'codex',
    dryRun: false,
    force: false,
    targetDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help') {
      return { ...options, help: true };
    }

    if (arg === '--agent') {
      options.agent = readOptionValue(argv, index, '--agent');
      index += 1;
      continue;
    }

    if (arg.startsWith('--agent=')) {
      const value = arg.slice('--agent='.length);
      if (!value) {
        throw new Error('--agent requires a value.');
      }
      options.agent = value;
      continue;
    }

    if (arg === '--target-dir') {
      options.targetDir = readOptionValue(argv, index, '--target-dir');
      index += 1;
      continue;
    }

    if (arg.startsWith('--target-dir=')) {
      const value = arg.slice('--target-dir='.length);
      if (!value) {
        throw new Error('--target-dir requires a value.');
      }
      options.targetDir = value;
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

    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }

  if (options.agent !== 'codex') {
    throw new Error(`Unsupported agent: ${options.agent}\n\n${usage()}`);
  }

  if (options.targetDir === '') {
    throw new Error('--target-dir requires a value.');
  }

  return options;
}

function resolveTargetDir(targetDir) {
  if (targetDir) {
    return path.resolve(targetDir);
  }

  return path.join(os.homedir(), '.codex', 'skills', SKILL_NAME);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const installSkillCommand = {
  name: 'install-skill',
  async run({ argv }) {
    const options = parseArgs(argv);
    if (options.help) {
      console.log(usage());
      return { ok: true };
    }

    const targetDir = resolveTargetDir(options.targetDir);
    const sourceExists = await pathExists(SOURCE_SKILL_DIR);
    if (!sourceExists) {
      throw new Error(`Bundled skill not found: ${SOURCE_SKILL_DIR}`);
    }

    console.log('openapi-projector Codex skill');
    console.log(`- source: ${SOURCE_SKILL_DIR}`);
    console.log(`- target: ${targetDir}`);

    if (options.dryRun) {
      console.log(formatSuccess('Dry run complete; no files were written.'));
      return { ok: true, targetDir };
    }

    const targetExists = await pathExists(targetDir);
    if (targetExists && !options.force) {
      console.log(formatSuccess('Skill already installed.'));
      console.log('Use --force to replace the existing installed skill.');
      return { ok: true, targetDir };
    }

    if (targetExists) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }

    await fs.mkdir(path.dirname(targetDir), { recursive: true });
    await fs.cp(SOURCE_SKILL_DIR, targetDir, { recursive: true });

    console.log(formatSuccess('Installed openapi-projector skill for Codex.'));
    console.log('Use it with: $openapi-projector POST /api/users 적용');

    return { ok: true, targetDir };
  },
};

export { installSkillCommand };
