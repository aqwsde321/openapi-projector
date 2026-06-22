import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { assertAllMissing } from '#test-support/files/assertions.mjs';
import { readTextFile } from '#test-support/files/io.mjs';
import { createFlatProjectOutputSpec } from '#test-support/project/flat-output-fixture.mjs';
import {
  projectOutputPaths,
  writeProjectOutputFixture,
} from '#test-support/project/output-writer.mjs';
import { withTempProjectOutput } from '#test-support/project/output-temp.mjs';

test('writeProjectOutputs can generate flat endpoint files without tag folders', async () => {
  await withTempProjectOutput(async (workspace) => {
    const { generatedDir } = projectOutputPaths(workspace);
    const manifest = await writeProjectOutputFixture(workspace, {
      spec: createFlatProjectOutputSpec(),
      apiRules: {
        fetchApiImportPath: '@/shared/api',
        fetchApiSymbol: 'fetchAPI',
        wrapperGrouping: 'flat',
      },
      layoutRules: {},
    });

    assert.equal(manifest.generatedEndpoints, 2);
    assert.deepEqual(
      manifest.files.map((file) => file.generated),
      [
        'openapi/project/src/openapi-generated/schema.ts',
        'openapi/project/src/openapi-generated/get-user.dto.ts',
        'openapi/project/src/openapi-generated/get-user.api.ts',
        'openapi/project/src/openapi-generated/get-user2.dto.ts',
        'openapi/project/src/openapi-generated/get-user2.api.ts',
      ],
    );
    assert.equal(
      await readTextFile(path.join(generatedDir, 'schema.ts')),
      'export type Contracts = never;\n',
    );
    await assertAllMissing([
      path.join(generatedDir, 'index.ts'),
      path.join(generatedDir, 'Admins'),
      path.join(generatedDir, 'Users'),
    ]);
  });
});
