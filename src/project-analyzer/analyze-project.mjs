import path from 'node:path';

import {
  buildAnalysisWarnings,
  pickApiHelperCandidate,
} from './api-helper-candidate.mjs';
import {
  relativePosixPath as relativePath,
  toPosixPath,
} from '../core/path-utils.mjs';
import {
  collectPackageDependencyEvidence,
  pickHttpClientCandidate,
} from './http-client-candidate.mjs';
import {
  buildFetchApiImportStats,
  pickApiLayerCandidate,
  pickNamingCandidate,
  summarizeFileSections,
} from './analysis-summary.mjs';
import { createSignalState } from './analysis-signals.mjs';
import { readImportAliasConfig } from './import-aliases.mjs';
import {
  analyzeProjectFiles,
  readPackageJson,
  scanTypeScriptFiles,
} from './project-files.mjs';

async function analyzeProject(rootDir, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const { roots, files } = await scanTypeScriptFiles(rootDir);
  const packageJson = await readPackageJson(rootDir);
  const packageEvidence = collectPackageDependencyEvidence(packageJson);
  const importAliases = await readImportAliasConfig(rootDir);
  const signals = createSignalState();

  await analyzeProjectFiles({ rootDir, files, signals, importAliases });

  const analysisRoot = roots[0] ?? path.resolve(rootDir, 'src');

  const apiHelper = pickApiHelperCandidate(signals);

  return {
    generatedAt,
    root: toPosixPath(rootDir),
    files: {
      scanned: files.length,
      roots: roots.map((root) => relativePath(rootDir, root)),
      analysisRoot: relativePath(rootDir, analysisRoot),
      sections: summarizeFileSections(rootDir, files),
    },
    pathAliases: importAliases,
    httpClient: pickHttpClientCandidate(packageEvidence, signals),
    apiHelper,
    apiLayer: pickApiLayerCandidate(signals),
    naming: pickNamingCandidate(signals),
    warnings: buildAnalysisWarnings(apiHelper),
    legacy: {
      fetchApiImportStats: buildFetchApiImportStats(signals),
    },
  };
}

export { analyzeProject };
