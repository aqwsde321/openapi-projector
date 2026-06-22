import { toKebabCase } from '../core/text-utils.mjs';

function buildEndpointIdFromPath(method, endpointPath) {
  const segments = endpointPath
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        return `by-${segment.slice(1, -1)}`;
      }
      return segment;
    });

  return toKebabCase([method, ...segments].join('-'));
}

function createUniqueId(baseId, usedIds) {
  const normalizedBaseId = baseId || 'endpoint';
  let candidate = normalizedBaseId;
  let index = 2;

  while (usedIds.has(candidate)) {
    candidate = `${normalizedBaseId}-${index}`;
    index += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

export {
  buildEndpointIdFromPath,
  createUniqueId,
};
