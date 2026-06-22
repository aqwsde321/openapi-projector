import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { readJson } from '#src/io/files.mjs';
import { writeTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';

test('readJson supports JSONC comments and trailing commas', async () => {
  await withTempDir('openapi-projector-jsonc-', async (workspace) => {
    const filePath = path.join(workspace, 'config.jsonc');

    await writeTextFile(
      filePath,
      [
        '{',
        '  // trailing commas are valid JSONC in config files',
        '  "sourceUrl": "https://api.example.com/openapi.json",',
        '  "paths": [',
        '    "openapi/config/project.jsonc",',
        '  ],',
        '}',
        '',
      ].join('\n'),
    );

    assert.deepEqual(await readJson(filePath), {
      sourceUrl: 'https://api.example.com/openapi.json',
      paths: ['openapi/config/project.jsonc'],
    });
  });
});
