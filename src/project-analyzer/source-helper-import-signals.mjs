import { isHelperSymbol } from './helper-call-classifier.mjs';
import {
  incrementCounter,
  makeHelperKey,
} from './signal-utils.mjs';
import { getNodeText, pushEvidence } from './source-evidence.mjs';

function recordHelperImportSignal(context, binding) {
  const {
    node,
    sourceFile,
    signals,
    importPath,
    normalizedImportPath,
  } = context;

  if (!isHelperSymbol(binding.localName) && !isHelperSymbol(binding.importedName)) {
    return;
  }

  const symbol = binding.kind === 'named' ? binding.importedName : binding.localName;
  const key = makeHelperKey({
    symbol,
    importPath: normalizedImportPath,
    importKind: binding.kind,
  });

  incrementCounter(signals.helperImports, key);
  pushEvidence(
    signals.helperEvidence,
    context,
    buildHelperImportReason(binding, symbol, importPath, normalizedImportPath),
    getNodeText(sourceFile, node),
  );
}

function buildHelperImportReason(binding, symbol, importPath, normalizedImportPath) {
  const normalizedSuffix =
    normalizedImportPath !== importPath ? ` (normalized from ${importPath})` : '';

  return binding.localName === symbol
    ? `imports API helper ${symbol} from ${normalizedImportPath}${normalizedSuffix}`
    : `imports API helper ${symbol} as ${binding.localName} from ${normalizedImportPath}${normalizedSuffix}`;
}

export { recordHelperImportSignal };
