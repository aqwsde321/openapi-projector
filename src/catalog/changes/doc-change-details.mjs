import {
  diffDocSnapshots,
  hasDocSnapshots,
} from './doc-snapshot-diff.mjs';
import { hasDocChanged } from './doc-change-detection.mjs';

const TOP_LEVEL_OPERATION_DOC_PATHS = new Set([
  'operation.summary',
  'operation.description',
  'operation.operationId',
  'operation.tags',
]);

function buildDocChangeDetails(previousEntry, nextEntry) {
  const details = [];

  appendFieldChange(details, 'summary', previousEntry.summary, nextEntry.summary);
  appendFieldChange(details, 'description', previousEntry.description, nextEntry.description);
  appendFieldChange(details, 'operationId', previousEntry.operationId, nextEntry.operationId);
  appendFieldChange(
    details,
    'tags',
    previousEntry.tags?.join(', ') ?? '',
    nextEntry.tags?.join(', ') ?? '',
  );

  if (hasDocSnapshots(previousEntry, nextEntry)) {
    details.push(
      ...diffDocSnapshots(previousEntry.docSnapshot, nextEntry.docSnapshot)
        .filter((detail) => !isTopLevelOperationDocPath(detail.path)),
    );
  }

  if (details.length === 0) {
    details.push({
      kind: 'changed',
      path: 'documentation',
      previous: null,
      next: null,
      message: hasDocSnapshots(previousEntry, nextEntry)
        ? '문서 내용이 변경됐지만 표시 가능한 문서 필드를 찾지 못했습니다.'
        : '문서 세부 항목이 변경됐지만 이전 catalog에 문서 snapshot이 없어 상세 비교할 수 없습니다. 이번 refresh 이후부터 상세 항목으로 표시됩니다.',
    });
  }

  return details;
}

function appendFieldChange(details, pathName, previousValue, nextValue) {
  if (previousValue === nextValue) {
    return;
  }

  details.push({
    kind: 'changed',
    path: pathName,
    previous: previousValue ?? null,
    next: nextValue ?? null,
  });
}

function isTopLevelOperationDocPath(detailPath) {
  return TOP_LEVEL_OPERATION_DOC_PATHS.has(detailPath);
}

export {
  buildDocChangeDetails,
  hasDocChanged,
};
