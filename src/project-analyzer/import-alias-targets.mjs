import path from 'node:path';

import {
  relativePosixPath as relativePath,
  stripLeadingDotSlash,
} from '../core/path-utils.mjs';

function stripWildcardSuffix(value) {
  if (value === '*') {
    return '';
  }

  return value.endsWith('*') ? value.slice(0, -1) : value;
}

function normalizeImportTargetPrefix({ rootDir, baseUrl, targetPattern }) {
  const isWildcardTarget = targetPattern === '*' || targetPattern.endsWith('*');
  const targetPrefix = stripWildcardSuffix(targetPattern);

  const absoluteTargetPrefix = path.resolve(baseUrl, targetPrefix);
  const normalized = stripLeadingDotSlash(
    relativePath(rootDir, absoluteTargetPrefix),
  );
  if (isWildcardTarget && normalized && !normalized.endsWith('/')) {
    return `${normalized}/`;
  }

  return normalized;
}

export { normalizeImportTargetPrefix, stripWildcardSuffix };
