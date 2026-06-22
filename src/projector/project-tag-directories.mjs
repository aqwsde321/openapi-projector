import {
  normalizeText,
  toKebabCase,
} from '../core/text-utils.mjs';

function buildTagDirectoryName(tag, tagFileCase = 'title') {
  const normalizedTag = normalizeText(tag) || 'default';

  if (tagFileCase === 'title') {
    const sanitized = normalizedTag
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/g, '');

    return sanitized || 'default';
  }

  return toKebabCase(normalizedTag);
}

function buildTagDirectories(operations, tagFileCase, buildEndpoint) {
  const tagDirectoryMap = new Map();

  for (const operation of operations) {
    const tagDirectoryName = buildTagDirectoryName(
      operation.tag || 'default',
      tagFileCase,
    );

    if (!tagDirectoryMap.has(tagDirectoryName)) {
      tagDirectoryMap.set(tagDirectoryName, []);
    }

    tagDirectoryMap.get(tagDirectoryName).push(operation);
  }

  return Array.from(tagDirectoryMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tagDirectoryName, tagOperations]) => ({
      tagDirectoryName,
      endpoints: buildTagDirectoryEndpoints(tagDirectoryName, tagOperations, buildEndpoint),
    }));
}

function buildTagDirectoryEndpoints(tagDirectoryName, operations, buildEndpoint) {
  const usedNames = new Set();
  return operations.map((operation) =>
    buildEndpoint(operation, usedNames, tagDirectoryName),
  );
}

export {
  buildTagDirectories,
  buildTagDirectoryName,
};
