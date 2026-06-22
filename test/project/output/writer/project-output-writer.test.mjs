import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { assertMissing } from '#test-support/files/assertions.mjs';
import { readTextFile } from '#test-support/files/io.mjs';
import {
  projectOutputPaths,
  writeProjectOutputFixture,
} from '#test-support/project/output-writer.mjs';
import { withTempProjectOutput } from '#test-support/project/output-temp.mjs';
import { createAllSkippedProjectOutputSpec } from '#test-support/project/skipped-output-fixture.mjs';

test('writeProjectOutputs handles all-skipped specs and custom schema file names', async () => {
  await withTempProjectOutput(async (workspace) => {
    const { generatedDir, summaryPath } = projectOutputPaths(workspace);
    const manifest = await writeProjectOutputFixture(workspace, {
      spec: createAllSkippedProjectOutputSpec(),
      generatedSchemaPath: 'openapi/review/generated/contracts.ts',
      layoutRules: {
        schemaFileName: 'contracts.ts',
      },
    });

    assert.equal(manifest.totalEndpoints, 1);
    assert.equal(manifest.generatedEndpoints, 0);
    assert.equal(manifest.skippedEndpoints, 1);
    assert.deepEqual(manifest.files, [
      {
        kind: 'schema',
        generated: 'openapi/project/src/openapi-generated/contracts.ts',
      },
    ]);
    assert.deepEqual(manifest.skippedOperations, [
      {
        method: 'GET',
        path: '/reports/export',
        reasons: ['response media type text/csv'],
      },
    ]);

    const summarySource = await readTextFile(summaryPath);

    assertMatchesAll(summarySource, [
      /Generated endpoints: 0/,
      /`GET \/reports\/export`: response media type text\/csv/,
    ]);
    await assertMissing(path.join(generatedDir, 'index.ts'));
    assert.equal(
      await readTextFile(path.join(generatedDir, 'contracts.ts')),
      'export type Contracts = never;\n',
    );
    await assertMissing(path.join(generatedDir, 'Reports'));
  });
});
