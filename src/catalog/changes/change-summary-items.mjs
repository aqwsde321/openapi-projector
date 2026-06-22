import { toChangeItem } from './change-items.mjs';
import { appendNextEntryChange } from './change-next-entry-item.mjs';

function collectChangeSummaryItems({
  previousEntries,
  nextEntries,
  projectCandidateFilesByOperation,
}) {
  const previousMap = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const nextMap = new Map(nextEntries.map((entry) => [entry.id, entry]));
  const added = [];
  const removed = [];
  const contractChanged = [];
  const docChanged = [];

  for (const entry of nextEntries) {
    appendNextEntryChange({
      added,
      contractChanged,
      docChanged,
      entry,
      previous: previousMap.get(entry.id),
      projectCandidateFilesByOperation,
    });
  }

  for (const entry of previousEntries) {
    if (!nextMap.has(entry.id)) {
      removed.push(toChangeItem(entry));
    }
  }

  return {
    added,
    removed,
    contractChanged,
    docChanged,
  };
}

export { collectChangeSummaryItems };
