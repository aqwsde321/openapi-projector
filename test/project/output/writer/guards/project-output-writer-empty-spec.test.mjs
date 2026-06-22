import assert from 'node:assert/strict';
import test from 'node:test';

import { assertMissing } from '#test-support/files/assertions.mjs';
import {
  projectOutputPaths,
  writeProjectOutputFixture,
} from '#test-support/project/output-writer.mjs';
import { withTempProjectOutput } from '#test-support/project/output-temp.mjs';

test('writeProjectOutputs throws before writing when the spec has no endpoints', async () => {
  await withTempProjectOutput(async (workspace) => {
    const { generatedDir } = projectOutputPaths(workspace);

    await assert.rejects(
      () =>
        writeProjectOutputFixture(workspace, {
          spec: {
            openapi: '3.0.3',
            info: {
              title: 'Empty',
              version: '1.0.0',
            },
            paths: {},
          },
          schemaContents: 'export type Empty = never;\n',
        }),
      /No endpoints found in OpenAPI spec/,
    );
    await assertMissing(generatedDir);
  });
});
