import assert from 'node:assert/strict';
import test from 'node:test';

import { readFixtureJson } from '#test-support/fixtures/json.mjs';
import {
  EXPECTED_GENERATED_FILES,
  EXPECTED_MANIFEST,
  EXPECTED_SUMMARY,
} from '#test-support/project/output-snapshot-expected.mjs';
import {
  collectProjectOutputFiles,
  readNormalizedProjectOutputFile,
  withTempProjectOutputSnapshot,
} from '#test-support/project/output-temp.mjs';
import {
  projectOutputPaths,
  writeProjectOutputFixture,
} from '#test-support/project/output-writer.mjs';

test(
  'project output for oas31 fixture matches the golden generated file snapshot',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas31.json');

    await withTempProjectOutputSnapshot(async (workspace) => {
      const { generatedDir, summaryPath } = projectOutputPaths(workspace);
      const manifest = await writeProjectOutputFixture(workspace, {
        spec,
        schemaContents: 'export interface paths {}\n',
        apiRules: {
          fetchApiImportPath: '../../test-support/fetch-api',
          fetchApiSymbol: 'fetchAPI',
          adapterStyle: 'url-config',
          tagFileCase: 'title',
        },
        layoutRules: {
          schemaFileName: 'schema.ts',
        },
      });

      assert.deepEqual(
        {
          ...manifest,
          generatedAt: '<generatedAt>',
        },
        EXPECTED_MANIFEST,
      );
      assert.deepEqual(await collectProjectOutputFiles(generatedDir), EXPECTED_GENERATED_FILES);
      assert.equal(
        await readNormalizedProjectOutputFile(summaryPath),
        EXPECTED_SUMMARY,
      );
    });
  },
);
