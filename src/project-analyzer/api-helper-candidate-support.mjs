import {
  incrementCounts,
  sortedCounts,
} from './signal-utils.mjs';

function buildApiHelperCounts(signals) {
  const counts = new Map();

  incrementCounts(counts, signals.helperImports);
  incrementCounts(counts, signals.helperCalls, 2);

  return counts;
}

function selectKnownCallStyle(helperCallStyles) {
  const [topCallStyle] = sortedCounts(
    new Map([...helperCallStyles].filter(([style]) => style !== 'unknown')),
  );

  return topCallStyle?.value ?? 'unknown';
}

function selectApiHelperEvidence({ signals, symbol }) {
  return signals.helperEvidence
    .concat(signals.callStyleEvidence)
    .filter((evidence) => evidence.reason.includes(symbol))
    .slice(0, 8);
}

export {
  buildApiHelperCounts,
  selectApiHelperEvidence,
  selectKnownCallStyle,
};
