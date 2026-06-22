import path from 'node:path';
import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';
import { workspacePath } from '#test-support/cli/workspace.mjs';
import { readTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';

test(
  'cli install-skill copies the bundled Codex skill to a custom target directory',
  { concurrency: false },
  async () => {
    await withTempDir('openapi-projector-skill-', async (workspace) => {
      const targetDir = workspacePath(workspace, 'codex-skills/openapi-projector');

      const { output } = await captureConsoleLog(() =>
        runCli(['install-skill', '--target-dir', targetDir, '--yes']),
      );
      const installedSkill = await readTextFile(path.join(targetDir, 'SKILL.md'));

      assertMatchesAll(output, [/Installed openapi-projector skill for Codex/]);
      assertMatchesAll(installedSkill, [
        /name: openapi-projector/,
        /\$openapi-projector POST \/login 적용/,
        /\$openapi-projector 룰 새로 적용하고 POST \/login 적용/,
        /use the last successful `openapi\/project\/` candidates/,
        /install-skill --yes --force/,
        /ask the user before running it/,
        /Default apply behavior/,
      ]);
    });
  },
);
