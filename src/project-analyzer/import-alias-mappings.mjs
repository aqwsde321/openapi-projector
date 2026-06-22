import {
  normalizeImportTargetPrefix,
  stripWildcardSuffix,
} from './import-alias-targets.mjs';

function buildImportAliasMapping({
  rootDir,
  baseUrl,
  aliasPattern,
  aliasPrefix,
  targetPattern,
}) {
  if (typeof targetPattern !== 'string') {
    return null;
  }

  const targetPrefix = normalizeImportTargetPrefix({
    rootDir,
    baseUrl,
    targetPattern,
  });
  if (targetPrefix == null) {
    return null;
  }

  return {
    aliasPattern,
    aliasPrefix,
    targetPattern,
    targetPrefix,
  };
}

function buildImportAliasMappings({ rootDir, baseUrl, paths }) {
  const mappings = [];

  if (!paths) {
    return mappings;
  }

  for (const [aliasPattern, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets)) {
      continue;
    }

    const aliasPrefix = stripWildcardSuffix(aliasPattern);

    for (const targetPattern of targets) {
      const mapping = buildImportAliasMapping({
        rootDir,
        baseUrl,
        aliasPattern,
        aliasPrefix,
        targetPattern,
      });
      if (mapping) {
        mappings.push(mapping);
      }
    }
  }

  return mappings;
}

function sortImportAliasMappings(mappings) {
  return mappings.sort(
    (left, right) =>
      right.targetPrefix.length - left.targetPrefix.length ||
      left.aliasPattern.localeCompare(right.aliasPattern) ||
      left.targetPattern.localeCompare(right.targetPattern),
  );
}

export {
  buildImportAliasMappings,
  sortImportAliasMappings,
};
