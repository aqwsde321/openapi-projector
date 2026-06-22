import ts from 'typescript';

import {
  incrementCounter,
} from './signal-utils.mjs';
import {
  detectCallStyle,
  getCallTarget,
} from './source-call-targets.mjs';
import { getNodeText, pushEvidence } from './source-evidence.mjs';
import { recordHelperCall } from './source-helper-call-signals.mjs';

function recordFetchCall(context) {
  const { node, sourceFile, signals, symbol } = context;

  if (symbol !== 'fetch') {
    return;
  }

  incrementCounter(signals.fetchCalls, 'fetch');
  pushEvidence(
    signals.httpClientEvidence,
    context,
    'calls global fetch',
    getNodeText(sourceFile, node),
  );
}

function recordReactQueryCall({ signals, symbol }) {
  if (symbol === 'useQuery' || symbol === 'useMutation') {
    incrementCounter(signals.apiLayerStyles, 'react-query');
  }
}

function recordCallExpression({
  node,
  sourceFile,
  rootDir,
  filePath,
  signals,
  importedSymbols,
}) {
  if (!ts.isCallExpression(node)) {
    return;
  }

  const target = getCallTarget(node);
  if (!target) {
    return;
  }

  const { symbol, memberName } = target;
  const imported = importedSymbols.get(symbol);
  const callStyle = memberName ? 'unknown' : detectCallStyle(node);
  const context = {
    node,
    sourceFile,
    rootDir,
    filePath,
    signals,
    symbol,
    memberName,
    imported,
    callStyle,
  };

  recordHelperCall(context);
  recordFetchCall(context);
  recordReactQueryCall(context);
}

export { recordCallExpression };
