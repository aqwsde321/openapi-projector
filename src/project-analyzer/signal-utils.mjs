function incrementCounter(map, key, count = 1) {
  map.set(key, (map.get(key) ?? 0) + count);
}

function incrementNestedCounter(map, parentKey, childKey, count = 1) {
  if (!map.has(parentKey)) {
    map.set(parentKey, new Map());
  }

  incrementCounter(map.get(parentKey), childKey, count);
}

function incrementCounts(target, source, weight = 1) {
  source.forEach((count, value) => incrementCounter(target, value, count * weight));
}

function sortedCounts(map) {
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || String(left.value).localeCompare(String(right.value)));
}

function createCandidate(value, confidence = 0, evidence = [], metadata = {}) {
  return {
    value,
    confidence,
    evidence,
    ...metadata,
  };
}

function makeHelperKey({ symbol, importPath, importKind }) {
  return [symbol, importPath, importKind ?? 'named'].join('\0');
}

function parseHelperKey(value) {
  const [symbol, importPath, importKind = 'named'] = String(value).split('\0');
  return { symbol, importPath, importKind };
}

export {
  createCandidate,
  incrementCounter,
  incrementCounts,
  incrementNestedCounter,
  makeHelperKey,
  parseHelperKey,
  sortedCounts,
};
