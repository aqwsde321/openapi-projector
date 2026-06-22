import { HTTP_CLIENT_PACKAGES } from './helper-call-classifier.mjs';
import {
  createCandidate,
  incrementCounts,
  incrementCounter,
  sortedCounts,
} from './signal-utils.mjs';

function collectPackageDependencyEvidence(packageJson) {
  const dependencyNames = new Set([
    ...Object.keys(packageJson?.dependencies ?? {}),
    ...Object.keys(packageJson?.devDependencies ?? {}),
  ]);

  return HTTP_CLIENT_PACKAGES
    .filter((packageName) => dependencyNames.has(packageName))
    .map((packageName) => ({
      file: 'package.json',
      reason: `dependency ${packageName} is declared`,
      snippet: packageName,
    }));
}

function buildHttpClientCounts(packageEvidence, signals) {
  const counts = new Map();

  for (const evidence of packageEvidence) {
    incrementCounter(counts, evidence.snippet, 2);
  }

  incrementCounts(counts, signals.httpClientImports, 2);

  if ((signals.fetchCalls.get('fetch') ?? 0) > 0) {
    incrementCounter(counts, 'fetch', signals.fetchCalls.get('fetch'));
  }

  return counts;
}

function selectHttpClientEvidence({ packageEvidence, signals, value }) {
  return [
    ...packageEvidence.filter((evidence) => evidence.snippet === value),
    ...signals.httpClientEvidence.filter((evidence) => evidence.reason.includes(value)),
  ].slice(0, 5);
}

function pickHttpClientCandidate(packageEvidence, signals) {
  const counts = buildHttpClientCounts(packageEvidence, signals);
  const [top] = sortedCounts(counts);
  if (!top) {
    return createCandidate('unknown', 0, []);
  }

  return createCandidate(
    top.value,
    Math.min(1, 0.45 + top.count * 0.15),
    selectHttpClientEvidence({
      packageEvidence,
      signals,
      value: top.value,
    }),
  );
}

export {
  collectPackageDependencyEvidence,
  pickHttpClientCandidate,
};
