import path from 'node:path';

import {
  relativePosixPath as relativePath,
  stripLeadingDotSlash,
  toPosixPath,
} from '../core/path-utils.mjs';

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function applyImportAliasMapping(normalizedProjectPath, mapping) {
  const isPrefixMapping = mapping.targetPrefix.endsWith('/');

  if (normalizedProjectPath === trimTrailingSlash(mapping.targetPrefix)) {
    return trimTrailingSlash(mapping.aliasPrefix);
  }

  if (isPrefixMapping && normalizedProjectPath.startsWith(mapping.targetPrefix)) {
    return `${mapping.aliasPrefix}${normalizedProjectPath.slice(mapping.targetPrefix.length)}`;
  }

  return null;
}

function applyImportAlias(projectPath, importAliases) {
  const normalizedProjectPath = stripLeadingDotSlash(toPosixPath(projectPath));

  for (const mapping of importAliases.mappings) {
    const mappedPath = applyImportAliasMapping(normalizedProjectPath, mapping);
    if (mappedPath !== null) {
      return mappedPath;
    }
  }

  return null;
}

function normalizeImportPath({ rootDir, filePath, importPath, importAliases }) {
  if (importAliases.mappings.length === 0) {
    return importPath;
  }

  if (importPath.startsWith('.')) {
    const absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
    const projectPath = relativePath(rootDir, absoluteImportPath);
    return applyImportAlias(projectPath, importAliases) ?? importPath;
  }

  return applyImportAlias(importPath, importAliases) ?? importPath;
}

export {
  normalizeImportPath,
};
