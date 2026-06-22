import { diffValues } from '../diff-utils/diff-values.mjs';
import { normalizeDiffValue } from '../diff-utils/normalize.mjs';
import { stableStringify } from '../diff-utils/stable-stringify.mjs';

function hasDocSnapshots(previousEntry, nextEntry) {
  return (
    Object.hasOwn(previousEntry, 'docSnapshot') &&
    Object.hasOwn(nextEntry, 'docSnapshot')
  );
}

function hasDocSnapshotChanged(previousEntry, nextEntry) {
  return (
    stableStringify(normalizeDiffValue(previousEntry.docSnapshot)) !==
    stableStringify(normalizeDiffValue(nextEntry.docSnapshot))
  );
}

function diffDocSnapshots(previousSnapshot, nextSnapshot) {
  return diffValues(
    normalizeDiffValue(previousSnapshot),
    normalizeDiffValue(nextSnapshot),
    [],
  );
}

export {
  diffDocSnapshots,
  hasDocSnapshotChanged,
  hasDocSnapshots,
};
