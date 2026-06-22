import { buildOperationKey } from '../endpoint-catalog.mjs';
import { buildDocChangeDetails } from './doc-change-details.mjs';

function toChangeItem(entry, projectCandidateFilesByOperation = new Map()) {
  const item = {
    id: entry.id,
    method: entry.method,
    path: entry.path,
    summary: entry.summary,
  };
  const projectFiles = projectCandidateFilesByOperation.get(
    buildOperationKey(entry.method, entry.path),
  );

  return projectFiles ? { ...item, projectFiles } : item;
}

function toDocChangeItem(
  previousEntry,
  nextEntry,
  projectCandidateFilesByOperation = new Map(),
) {
  const details = buildDocChangeDetails(previousEntry, nextEntry);

  return {
    ...toChangeItem(nextEntry, projectCandidateFilesByOperation),
    detailCount: details.length,
    detailsTruncated: false,
    details,
  };
}

export {
  toChangeItem,
  toDocChangeItem,
};
