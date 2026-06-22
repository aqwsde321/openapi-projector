import { buildContractChangeItem } from './change-contract-item.mjs';
import { hasDocChanged } from './doc-change-detection.mjs';
import {
  toChangeItem,
  toDocChangeItem,
} from './change-items.mjs';

function appendNextEntryChange({
  added,
  contractChanged,
  docChanged,
  entry,
  previous,
  projectCandidateFilesByOperation,
}) {
  if (!previous) {
    added.push(toChangeItem(entry, projectCandidateFilesByOperation));
    return;
  }

  if (previous.contractFingerprint !== entry.contractFingerprint) {
    appendContractOrDocChange({
      contractChanged,
      docChanged,
      entry,
      previous,
      projectCandidateFilesByOperation,
    });
    return;
  }

  if (hasDocChanged(previous, entry)) {
    docChanged.push(toDocChangeItem(previous, entry, projectCandidateFilesByOperation));
  }
}

function appendContractOrDocChange({
  contractChanged,
  docChanged,
  entry,
  previous,
  projectCandidateFilesByOperation,
}) {
  const contractChangeItem = buildContractChangeItem(
    toChangeItem(entry, projectCandidateFilesByOperation),
    previous,
    entry,
  );

  if (contractChangeItem) {
    contractChanged.push(contractChangeItem);
    return;
  }

  if (hasDocChanged(previous, entry)) {
    docChanged.push(toDocChangeItem(previous, entry, projectCandidateFilesByOperation));
  }
}

export { appendNextEntryChange };
