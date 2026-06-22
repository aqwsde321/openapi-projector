import test from 'node:test';

import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import {
  assertCatalogComparisonTableRows,
} from '#test-support/catalog/comparison-assertions.mjs';
import {
  readTopLevelCatalogChanges,
  rerunCatalogWithSpec,
  runCatalog,
} from '#test-support/catalog/commands.mjs';
import {
  EXPECTED_ENUM_CONTRACT_TABLE_ROWS,
  createChangedEnumContractSpec,
  createEnumContractSpec,
} from '#test-support/catalog/enum-contract-fixture.mjs';
import { withWorkspace } from '#test-support/cli/workspace.mjs';

test(
  'catalog renders enum-only contract changes with distinct comparison cells',
  { concurrency: false },
  async () => {
    const spec = createEnumContractSpec();

    await withWorkspace({ spec }, async (workspace) => {
      await runCatalog(workspace);

      await rerunCatalogWithSpec(workspace, createChangedEnumContractSpec(spec));

      const topLevelChanges = await readTopLevelCatalogChanges(workspace);
      const contractChange = topLevelChanges.json.contractChanged[0];

      assertMatchesAll(topLevelChanges.source, [
        /\| 🟢 추가 \| 요청 Query 파라미터 enum 값 \| 없음 \| `claimStatuses: APPROVED` \|/,
        /\| 🔴 삭제 \| 요청 Query 파라미터 enum 값 \| `itemTypes: SET` \| 없음 \|/,
        /\| 🟢 추가 \| 요청 Query 파라미터 enum 값 \| 없음 \| `productTypes: SET` \|/,
        /\| 🟢 추가 \| 요청 Query 파라미터 필드 \| 없음 \| `newStatuses: List<String> \(optional, enum: WAITING\)` \|/,
        /\| 🔴 삭제 \| 응답 Body enum 값 \| `claimStatus: APPROVED` \| 없음 \|/,
      ]);
      assertDoesNotMatchAny(topLevelChanges.source, [
        /\| 🟡 변경 \| 응답 Body 필드 \| `claimStatus: String` \| `claimStatus: String` \|/,
        /enum: WAITING, APPROVED/,
        /itemTypes: \["SINGLE","SET"\]/,
        /productTypes: \["MIXED","OPTION_SET","SET","SINGLE"\]/,
        /newStatuses: String \(optional, enum: WAITING\)/,
      ]);
      assertCatalogComparisonTableRows(
        contractChange.comparisonTableRows,
        EXPECTED_ENUM_CONTRACT_TABLE_ROWS,
      );
    });
  },
);
