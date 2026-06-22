function mergePreviewLineKeys(previousLines, nextLines) {
  const previousKeys = previousLines.map((line) => line.key);
  const nextKeys = nextLines.map((line) => line.key);
  const previousKeySet = new Set(previousKeys);
  const nextKeySet = new Set(nextKeys);
  const keys = [];
  const addedKeys = new Set();
  let previousIndex = 0;

  const addKey = (key) => {
    if (addedKeys.has(key)) {
      return;
    }
    keys.push(key);
    addedKeys.add(key);
  };

  for (const nextKey of nextKeys) {
    while (
      previousIndex < previousKeys.length &&
      !nextKeySet.has(previousKeys[previousIndex])
    ) {
      addKey(previousKeys[previousIndex]);
      previousIndex += 1;
    }

    if (previousKeySet.has(nextKey)) {
      while (
        previousIndex < previousKeys.length &&
        previousKeys[previousIndex] !== nextKey
      ) {
        addKey(previousKeys[previousIndex]);
        previousIndex += 1;
      }
      previousIndex += 1;
    }

    addKey(nextKey);
  }

  while (previousIndex < previousKeys.length) {
    addKey(previousKeys[previousIndex]);
    previousIndex += 1;
  }

  return keys;
}

export { mergePreviewLineKeys };
