import {
  relativePosixPath as relativePath,
} from '../core/path-utils.mjs';
import {
  createCandidate,
  incrementCounter,
  sortedCounts,
} from './signal-utils.mjs';

function buildFetchApiImportStats(signals) {
  return sortedCounts(signals.fetchApiImportPaths).map((entry) => ({
    importPath: entry.value,
    count: entry.count,
  }));
}

function resolveFileSection(rootDir, filePath) {
  const relative = relativePath(rootDir, filePath);
  const segments = relative.split('/');

  return segments[0] === 'src' && segments.length > 2
    ? `src/${segments[1]}`
    : segments[0] ?? '.';
}

function summarizeFileSections(rootDir, files) {
  const counts = new Map();

  for (const filePath of files) {
    incrementCounter(counts, resolveFileSection(rootDir, filePath));
  }

  return sortedCounts(counts).map((entry) => ({
    section: entry.value,
    count: entry.count,
  }));
}

function pickApiLayerCandidate(signals) {
  const baseDirs = sortedCounts(signals.apiLayerBaseDirs)
    .slice(0, 5)
    .map((entry) => entry.value);
  const [topStyle] = sortedCounts(signals.apiLayerStyles);

  return createCandidate(
    {
      baseDirs,
      style: topStyle?.value ?? 'unknown',
      usesReactQuery: signals.apiLayerStyles.has('react-query'),
    },
    baseDirs.length > 0 ? Math.min(1, 0.4 + baseDirs.length * 0.1) : 0,
    signals.apiLayerEvidence.slice(0, 8),
  );
}

function pickNamingCandidate(signals) {
  return createCandidate(
    {
      functionPrefixes: sortedCounts(signals.functionPrefixes).map((entry) => entry.value),
      dtoSuffixes: sortedCounts(signals.dtoSuffixes).map((entry) => entry.value),
    },
    signals.functionPrefixes.size > 0 || signals.dtoSuffixes.size > 0 ? 0.65 : 0,
    [],
  );
}

export {
  buildFetchApiImportStats,
  pickApiLayerCandidate,
  pickNamingCandidate,
  summarizeFileSections,
};
