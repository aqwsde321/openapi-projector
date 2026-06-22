import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { readJson } from '#src/io/files.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { assertAllMissing } from '#test-support/files/assertions.mjs';
import { readTextFile } from '#test-support/files/io.mjs';
import {
  openapiGitignorePath,
  reviewChangesHistoryDirPath,
  reviewChangesSummaryJsonPath,
  reviewChangesSummaryMarkdownPath,
  topLevelChangesJsonPath,
  topLevelChangesMarkdownPath,
} from '#test-support/project/paths.mjs';

export async function readCatalogChangeArtifacts(workspace) {
  const historyDir = reviewChangesHistoryDirPath(workspace);
  const historyFiles = await fs.readdir(historyDir);
  const historyMarkdownFiles = historyFiles.filter((fileName) =>
    fileName.endsWith('.md'),
  );
  const historyJsonFiles = historyFiles.filter((fileName) =>
    fileName.endsWith('.json'),
  );

  assert.equal(historyMarkdownFiles.length, 1);
  assert.equal(historyJsonFiles.length, 1);
  await assertAllMissing([
    reviewChangesSummaryMarkdownPath(workspace),
    reviewChangesSummaryJsonPath(workspace),
  ]);

  return {
    historyJson: await readJson(path.join(historyDir, historyJsonFiles[0])),
    historySource: await readTextFile(
      path.join(historyDir, historyMarkdownFiles[0]),
    ),
    openapiGitignoreSource: await readTextFile(
      openapiGitignorePath(workspace),
    ),
    topLevelChangesJson: await readJson(topLevelChangesJsonPath(workspace)),
    topLevelChangesSource: await readTextFile(
      topLevelChangesMarkdownPath(workspace),
    ),
  };
}

export function assertCatalogChangeMetadata({
  historyJson,
  openapiGitignoreSource,
  topLevelChangesJson,
}) {
  const detailPaths = historyJson.contractChanged[0].details.map(
    (detail) => detail.path,
  );

  assert.equal(historyJson.contractChanged.length, 1);
  assert.equal(topLevelChangesJson.contractChanged.length, 1);
  assertMatchesAll(openapiGitignoreSource, [/changes\.md/, /changes\.json/]);
  assert.equal(historyJson.contractChanged[0].detailsUnavailable, undefined);
  assert.deepEqual(historyJson.contractChanged[0].projectFiles, {
    dto: 'openapi/project/src/openapi-generated/Users/get-users-by-id.dto.ts',
    api: 'openapi/project/src/openapi-generated/Users/get-users-by-id.api.ts',
  });
  assert.ok(
    detailPaths.includes('operation.parameters["query.active"].schema.type'),
  );
  assert.ok(
    detailPaths.includes('referencedSchemas.User.properties.email.type'),
  );
  assert.ok(detailPaths.includes('referencedSchemas.User.required'));
  assert.ok(
    detailPaths.includes('referencedSchemas.ResponseHeader.properties.value.type'),
  );
  assert.ok(detailPaths.includes('referencedSchemas.ChangedHeader.required'));
}

export function assertCatalogComparisonRows(historyJson) {
  const comparisonRows = historyJson.contractChanged[0].comparisonRows;
  const comparisonDisplayRows = historyJson.contractChanged[0].comparisonDisplayRows;

  assert.deepEqual(historyJson.contractChanged[0].comparisonRows[0], {
    category: 'Query Parameter',
    target: '`active`',
    previous: '없음',
    next: '`boolean`, required',
  });
  assert.deepEqual(comparisonRows.find((row) => row.target === '`User.email.required`'), {
    category: 'Response Body/Header Field',
    target: '`User.email.required`',
    previous: 'optional',
    next: 'required',
  });
  assert.deepEqual(comparisonRows.find((row) => row.target === '`User.attachments`'), {
    category: 'Response Body/Header Field',
    target: '`User.attachments`',
    previous: '없음',
    next: '`File[]`',
  });
  assert.deepEqual(
    comparisonRows.find((row) => row.target === '`ResponseHeader.value.type`'),
    {
      category: 'Response Header Field',
      target: '`ResponseHeader.value.type`',
      previous: '`string`',
      next: '`integer`',
    },
  );
  assert.deepEqual(
    comparisonRows.find((row) => row.target === '`ResponseHeader.value.required`'),
    {
      category: 'Response Header Field',
      target: '`ResponseHeader.value.required`',
      previous: 'required',
      next: 'optional',
    },
  );
  assert.deepEqual(
    comparisonRows.find((row) => row.target === '`ChangedHeader.expiresAt.required`'),
    {
      category: 'Response Header Field',
      target: '`ChangedHeader.expiresAt.required`',
      previous: 'optional',
      next: 'required',
    },
  );
  assert.deepEqual(comparisonDisplayRows.find((row) => row.declaration === 'active: Boolean (required)'), {
    change: '🟢 추가',
    location: '요청 Query 파라미터',
    declaration: 'active: Boolean (required)',
  });
  assert.deepEqual(
    comparisonDisplayRows.find((row) => row.declaration === 'value: Integer (required → optional)'),
    {
      change: '🟡 변경',
      location: '응답 Header 필드',
      declaration: 'value: Integer (required → optional)',
    },
  );
}

function sortComparisonTableRows(rows) {
  return rows
    .map((row) => JSON.stringify(row))
    .sort()
    .map((row) => JSON.parse(row));
}

export function assertCatalogComparisonTableRows(actualRows, expectedRows) {
  assert.deepEqual(
    sortComparisonTableRows(actualRows),
    sortComparisonTableRows(expectedRows),
  );
}

export function assertCatalogChangeMarkdown({
  historySource,
  topLevelChangesSource,
}) {
  assertMatchesAll(topLevelChangesSource, [
    /\[DTO\]\(<project\/src\/openapi-generated\/Users\/get-users-by-id\.dto\.ts>\)/,
    /\[API\]\(<project\/src\/openapi-generated\/Users\/get-users-by-id\.api\.ts>\)/,
    /History: \[openapi\/review\/changes\/history\]\(<review\/changes\/history>\)/,
    /Comparison baseline: \[openapi\/review\/catalog\/endpoints\.json\]\(<review\/catalog\/endpoints\.json>\)/,
  ]);
  assertMatchesAll(historySource, [
    /🧩 Contract Changed: 1/,
    /\[DTO\]\(<\.\.\/\.\.\/\.\.\/project\/src\/openapi-generated\/Users\/get-users-by-id\.dto\.ts>\)/,
    /\[API\]\(<\.\.\/\.\.\/\.\.\/project\/src\/openapi-generated\/Users\/get-users-by-id\.api\.ts>\)/,
    /\| 변경 \| 위치 \| AS-IS \| TO-BE \|/,
    /## 🧩 Contract Changed\n\n- \[GET\] `\/users\/\{id\}` - Get user/,
    /\n  \| 변경 \| 위치 \| AS-IS \| TO-BE \|/,
    /\n  <details>\n  <summary>전체 AS-IS \/ TO-BE 보기<\/summary>/,
    /\| 🟢 추가 \| 요청 Query 파라미터 \| 없음 \| `active: Boolean \(required\)` \|/,
    /\| 🟡 변경 \| 응답 Header 필드 \| `value: String \(required\)` \| `value: Integer \(optional\)` \|/,
    /<details>/,
    /<summary>전체 AS-IS \/ TO-BE 보기<\/summary>/,
    /\| AS-IS \| TO-BE \|/,
    /\*\*🟢 &nbsp;&nbsp;- active: Boolean \(required\)\*\*/,
    /\*\*🟢 &nbsp;&nbsp;- attachments: List&lt;File&gt;\*\*/,
    /\*\*🟡 &nbsp;&nbsp;- email: String\*\*/,
    /\*\*🟡 &nbsp;&nbsp;- email: Integer\*\*/,
    /\*\*🟡 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- value: String \(required\)\*\*/,
    /\*\*🟡 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- value: Integer \(optional\)\*\*/,
    /\*\*🟡 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- expiresAt: String \(required\)\*\*/,
  ]);
  assertDoesNotMatchAny(historySource, [
    /## 🧩 Contract Changed\n\n### \[GET\] `\/users\/\{id\}` - Get user/,
  ]);
}
