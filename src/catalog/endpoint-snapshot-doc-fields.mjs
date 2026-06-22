const DOC_ONLY_FIELD_KEYS = new Set([
  'summary',
  'description',
  'operationId',
  'tags',
  'externalDocs',
  'example',
  'examples',
  'title',
  'deprecated',
]);

function stripDocOnlyFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripDocOnlyFields(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const stripped = {};

  for (const [key, child] of Object.entries(value)) {
    if (DOC_ONLY_FIELD_KEYS.has(key)) {
      continue;
    }

    stripped[key] = stripDocOnlyFields(child);
  }

  return stripped;
}

function extractDocOnlyFields(value) {
  if (Array.isArray(value)) {
    const extractedItems = value.map((item) => extractDocOnlyFields(item));
    return extractedItems.some((item) => item !== null) ? extractedItems : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const extracted = {};

  for (const [key, child] of Object.entries(value)) {
    if (DOC_ONLY_FIELD_KEYS.has(key)) {
      extracted[key] = child;
      continue;
    }

    const childDocs = extractDocOnlyFields(child);
    if (childDocs !== null) {
      extracted[key] = childDocs;
    }
  }

  return Object.keys(extracted).length > 0 ? extracted : null;
}

export {
  extractDocOnlyFields,
  stripDocOnlyFields,
};
