import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { assertMatchesAll } from '#test-support/assertions/text.mjs';
import { readTextFile } from '#test-support/files/io.mjs';
import { createHookOutputSpec } from '#test-support/project/hook-output-fixture.mjs';
import {
  projectOutputPaths,
  writeProjectOutputFixture,
} from '#test-support/project/output-writer.mjs';
import { withTempProjectOutput } from '#test-support/project/output-temp.mjs';

test('writeProjectOutputs generates React Query hook candidates when hook rules are enabled', async () => {
  await withTempProjectOutput(async (workspace) => {
    const { generatedDir } = projectOutputPaths(workspace);
    const manifest = await writeProjectOutputFixture(workspace, {
      spec: createHookOutputSpec(),
      apiRules: {
        fetchApiImportPath: '@/shared/api',
        fetchApiSymbol: 'fetchAPI',
        wrapperGrouping: 'tag',
      },
      hookRules: {
        enabled: true,
        queryKeyStrategy: 'path-and-fields',
        staleTimeImportPath: '@/shared/constant/api',
        staleTimeSymbol: 'STALE_TIME',
      },
      layoutRules: {},
    });

    assert.deepEqual(
      manifest.files.map((file) => file.generated),
      [
        'openapi/project/src/openapi-generated/schema.ts',
        'openapi/project/src/openapi-generated/Customers/get-customers-list.dto.ts',
        'openapi/project/src/openapi-generated/Customers/get-customers-list.api.ts',
        'openapi/project/src/openapi-generated/Customers/get-customers-list.query.ts',
        'openapi/project/src/openapi-generated/Profiles/update-profile.dto.ts',
        'openapi/project/src/openapi-generated/Profiles/update-profile.api.ts',
        'openapi/project/src/openapi-generated/Profiles/update-profile.mutation.ts',
      ],
    );
    assert.equal(
      manifest.applicationReview.endpoints[0].generatedFiles.hook,
      'openapi/project/src/openapi-generated/Customers/get-customers-list.query.ts',
    );
    assert.equal(
      manifest.applicationReview.endpoints[1].generatedFiles.hook,
      'openapi/project/src/openapi-generated/Profiles/update-profile.mutation.ts',
    );

    const querySource = await readTextFile(
      path.join(generatedDir, 'Customers/get-customers-list.query.ts'),
    );
    assertMatchesAll(querySource, [
      /import \{ useQuery \} from '@tanstack\/react-query';/,
      /queryKey: \["\/customers", params\.page\],/,
      /staleTime: STALE_TIME,/,
    ]);

    const mutationSource = await readTextFile(
      path.join(generatedDir, 'Profiles/update-profile.mutation.ts'),
    );
    assertMatchesAll(mutationSource, [
      /import \{ useMutation \} from '@tanstack\/react-query';/,
      /mutationFn: \(params: UpdateProfileRequestDto\) => updateProfile\(params\),/,
    ]);
  });
});
