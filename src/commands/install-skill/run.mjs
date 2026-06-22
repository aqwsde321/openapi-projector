import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatSuccess } from '../../cli/format.mjs';
import { ensureDir, pathExists } from '../../io/files.mjs';
import { parseInstallSkillArgs } from './options.mjs';
import { resolveInstallSkillTargetDir } from './target-dir.mjs';
import { installSkillUsage } from './usage.mjs';

const SKILL_NAME = 'openapi-projector';
const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);
const SOURCE_SKILL_DIR = path.join(PACKAGE_ROOT, 'skills', SKILL_NAME);

async function runInstallSkill({ argv }) {
  const options = parseInstallSkillArgs(argv);
  if (options.help) {
    console.log(installSkillUsage());
    return { ok: true };
  }

  const targetDir = resolveInstallSkillTargetDir(options.targetDir, SKILL_NAME);
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

  await ensureDir(path.dirname(targetDir));
  await fs.cp(SOURCE_SKILL_DIR, targetDir, { recursive: true });

  console.log(formatSuccess('Installed openapi-projector skill for Codex.'));
  console.log('Use it with: $openapi-projector POST /api/users 적용');

  return { ok: true, targetDir };
}

export { runInstallSkill };
