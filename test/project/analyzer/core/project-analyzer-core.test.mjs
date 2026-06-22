import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeProject } from '#src/project-analyzer/analyze-project.mjs';
import { assertApiHelperEvidenceIncludes } from '#test-support/project/analyzer-assertions.mjs';
import { writeMixedApiHelperProject } from '#test-support/project/analyzer-fixture.mjs';
import { withTempProject } from '#test-support/project/analyzer-temp.mjs';

test('analyzeProject detects helpers, call style, API layer, and naming evidence', async () => {
  await withTempProject(async (workspace) => {
    await writeMixedApiHelperProject(workspace);

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.equal(analysis.generatedAt, '2026-04-28T00:00:00.000Z');
    assert.equal(analysis.files.scanned, 2);
    assert.deepEqual(analysis.files.roots, ['src']);
    assert.equal(analysis.files.analysisRoot, 'src');
    assert.deepEqual(analysis.files.sections, [
      {
        section: 'src/features',
        count: 2,
      },
    ]);
    assert.equal(analysis.httpClient.value, 'axios');
    assert.ok(analysis.httpClient.confidence > 0.5);
    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@/shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assert.ok(analysis.apiHelper.confidence > 0.7);
    assertApiHelperEvidenceIncludes(
      analysis,
      'imports API helper request from @/shared/request',
    );
    assert.deepEqual(analysis.legacy.fetchApiImportStats, [
      {
        importPath: '@/shared/http',
        count: 1,
      },
    ]);
    assert.deepEqual(analysis.apiLayer.value.baseDirs, ['src/features/*/api']);
    assert.equal(analysis.apiLayer.value.style, 'function');
    assert.deepEqual(analysis.naming.value.functionPrefixes, ['create', 'fetch', 'update']);
    assert.deepEqual(analysis.naming.value.dtoSuffixes, ['Payload', 'Response']);
  });
});
