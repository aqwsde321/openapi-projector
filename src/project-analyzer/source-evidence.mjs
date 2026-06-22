import { relativePosixPath as relativePath } from '../core/path-utils.mjs';

function getNodeText(sourceFile, node) {
  return node.getText(sourceFile).replace(/\s+/g, ' ').trim();
}

function createEvidence(rootDir, filePath, reason, snippet = null) {
  return {
    file: relativePath(rootDir, filePath),
    reason,
    ...(snippet ? { snippet } : {}),
  };
}

function pushEvidence(target, { rootDir, filePath }, reason, snippet = null) {
  target.push(createEvidence(rootDir, filePath, reason, snippet));
}

export { getNodeText, pushEvidence };
