import {
  hasDocSnapshotChanged,
  hasDocSnapshots,
} from './doc-snapshot-diff.mjs';

function hasDocChanged(previousEntry, nextEntry) {
  if (hasDocSnapshots(previousEntry, nextEntry)) {
    return hasDocSnapshotChanged(previousEntry, nextEntry);
  }

  if (
    typeof previousEntry.docFingerprint === 'string' &&
    typeof nextEntry.docFingerprint === 'string'
  ) {
    return previousEntry.docFingerprint !== nextEntry.docFingerprint;
  }

  return hasDocFieldChanges(previousEntry, nextEntry);
}

function hasDocFieldChanges(previousEntry, nextEntry) {
  return (
    previousEntry.summary !== nextEntry.summary ||
    previousEntry.description !== nextEntry.description ||
    previousEntry.operationId !== nextEntry.operationId ||
    (previousEntry.tags?.join(', ') ?? '') !== (nextEntry.tags?.join(', ') ?? '')
  );
}

export { hasDocChanged };
