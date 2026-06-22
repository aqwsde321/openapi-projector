import {
  relativePosixPath as relativePath,
} from '../core/path-utils.mjs';
import { incrementCounter } from './signal-utils.mjs';
import { pushEvidence } from './source-evidence.mjs';

const ROOT_API_LAYER_DIRS = new Set(['api', 'apis', 'services']);
const DOMAIN_API_LAYER_DIRS = new Set(['features', 'entities']);
const API_FILE_NAME_PATTERN = /^api\.(ts|tsx)$/;

function isDomainApiLayerDir(segment) {
  return DOMAIN_API_LAYER_DIRS.has(segment);
}

function isNestedApiLayerSegment(segment) {
  return segment === 'api' || segment === 'apis' || segment.startsWith('api.');
}

function stripTypeScriptExtension(segment) {
  return segment.replace(/\.(ts|tsx)$/, '');
}

function detectApiLayerBaseDir(rootDir, filePath) {
  const relative = relativePath(rootDir, filePath);
  const segments = relative.split('/');

  if (segments[0] !== 'src') {
    return null;
  }

  if (ROOT_API_LAYER_DIRS.has(segments[1])) {
    return `src/${segments[1]}`;
  }

  if (!isDomainApiLayerDir(segments[1])) {
    return null;
  }

  if (segments.length >= 4 && isNestedApiLayerSegment(segments[3])) {
    return `src/${segments[1]}/*/${stripTypeScriptExtension(segments[3])}`;
  }

  if (segments.length >= 3 && API_FILE_NAME_PATTERN.test(segments[2])) {
    return `src/${segments[1]}/*/api`;
  }

  return null;
}

function recordApiLayerBaseDir({ rootDir, filePath, signals }) {
  const apiLayerBaseDir = detectApiLayerBaseDir(rootDir, filePath);

  if (!apiLayerBaseDir) {
    return;
  }

  incrementCounter(signals.apiLayerBaseDirs, apiLayerBaseDir);
  pushEvidence(
    signals.apiLayerEvidence,
    { rootDir, filePath },
    `matches API layer pattern ${apiLayerBaseDir}`,
  );
}

export { recordApiLayerBaseDir };
