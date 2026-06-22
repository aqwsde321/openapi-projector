import test from 'node:test';

import { runCli } from '#src/cli/run.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { captureConsoleLog } from '#test-support/cli/console.mjs';

test(
  'cli help keeps first-time setup focused on a single init command',
  { concurrency: false },
  async () => {
    const { output } = await captureConsoleLog(() => runCli(['help']));

    assertMatchesAll(output, [
      /npx --yes openapi-projector@latest init/,
      /interactive terminals can confirm, validate, or retry the default sourceUrl/,
      /CI\/scripts can pass --source-url explicitly or use --no-input/,
      /update\s+기존 openapi 작업공간을 최신 CLI 형식으로 안전하게 갱신/,
      /upgrade-docs\s+기존 설정은 보존하고 openapi\/README\.md 안내 문서만 최신화/,
      /install-skill\s+Codex용 openapi-projector 스킬 설치/,
      /npx --yes openapi-projector@latest install-skill --yes/,
    ]);
    assertDoesNotMatchAny(output, [
      /npx --yes openapi-projector@latest init --source-url/,
    ]);
  },
);
