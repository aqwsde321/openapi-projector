import assert from 'node:assert/strict';
import test from 'node:test';

import { parseInstallSkillArgs } from '#src/commands/install-skill/options.mjs';

test('parseInstallSkillArgs reads supported install-skill options', () => {
  assert.deepEqual(
    parseInstallSkillArgs([
      '--agent=codex',
      '--target-dir',
      '/tmp/openapi-projector-skill',
      '--force',
      '--dry-run',
      '--yes',
    ]),
    {
      agent: 'codex',
      dryRun: true,
      force: true,
      targetDir: '/tmp/openapi-projector-skill',
    },
  );
});

test('parseInstallSkillArgs reports invalid install-skill options', () => {
  assert.throws(
    () => parseInstallSkillArgs(['--agent', 'cursor']),
    /Unsupported agent: cursor/,
  );
  assert.throws(
    () => parseInstallSkillArgs(['--target-dir=']),
    /--target-dir requires a value\./,
  );
  assert.throws(
    () => parseInstallSkillArgs(['--unknown']),
    /Unknown option: --unknown/,
  );
});
