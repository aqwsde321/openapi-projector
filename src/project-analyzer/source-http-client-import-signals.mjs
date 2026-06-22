import { HTTP_CLIENT_PACKAGES } from './helper-call-classifier.mjs';
import { incrementCounter } from './signal-utils.mjs';
import { getNodeText, pushEvidence } from './source-evidence.mjs';

function recordHttpClientImportSignal(context) {
  const { node, sourceFile, signals, importPath } = context;

  if (!HTTP_CLIENT_PACKAGES.includes(importPath)) {
    return;
  }

  incrementCounter(signals.httpClientImports, importPath);
  pushEvidence(
    signals.httpClientEvidence,
    context,
    `imports HTTP client package ${importPath}`,
    getNodeText(sourceFile, node),
  );
}

export { recordHttpClientImportSignal };
