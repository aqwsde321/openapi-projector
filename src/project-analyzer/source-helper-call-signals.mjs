import { shouldTrackHelperCall } from './helper-call-classifier.mjs';
import {
  incrementCounter,
  incrementNestedCounter,
  makeHelperKey,
} from './signal-utils.mjs';
import { getNodeText, pushEvidence } from './source-evidence.mjs';
import {
  getRuntimeImportKind,
  getRuntimeImportSymbol,
} from './source-helper-call-runtime.mjs';

function buildHelperCallReason(symbol, memberName, runtimeSymbol, callStyle) {
  return runtimeSymbol === symbol
    ? `calls ${memberName ? `${symbol}.${memberName}` : symbol} as ${callStyle}`
    : `calls ${symbol} for API helper ${runtimeSymbol} as ${callStyle}`;
}

function recordHelperCall(context) {
  const {
    node,
    sourceFile,
    signals,
    symbol,
    memberName,
    imported,
    callStyle,
  } = context;

  if (
    !shouldTrackHelperCall({
      symbol,
      imported,
      memberName,
      callStyle,
    })
  ) {
    return;
  }

  const importPath = imported?.importPath ?? '<local>';
  const runtimeSymbol = getRuntimeImportSymbol(imported) ?? symbol;
  const key = makeHelperKey({
    symbol: runtimeSymbol,
    importPath,
    importKind: getRuntimeImportKind(imported),
  });

  incrementCounter(signals.helperCalls, key);
  incrementCounter(signals.callStyles, callStyle);
  incrementNestedCounter(signals.helperCallStyles, key, callStyle);
  pushEvidence(
    signals.callStyleEvidence,
    context,
    buildHelperCallReason(symbol, memberName, runtimeSymbol, callStyle),
    getNodeText(sourceFile, node),
  );
}

export { recordHelperCall };
