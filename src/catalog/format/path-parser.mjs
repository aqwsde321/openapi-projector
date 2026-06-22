function parseFormattedPath(pathText) {
  const segments = [];
  let index = 0;

  while (index < pathText.length) {
    const char = pathText[index];

    if (char === '.') {
      index += 1;
      continue;
    }

    if (char === '[') {
      const endIndex = findPathBracketEnd(pathText, index);
      if (endIndex < 0) {
        return segments;
      }

      try {
        segments.push(JSON.parse(pathText.slice(index + 1, endIndex)));
      } catch {
        return segments;
      }

      index = endIndex + 1;
      continue;
    }

    let endIndex = index + 1;
    while (
      endIndex < pathText.length &&
      pathText[endIndex] !== '.' &&
      pathText[endIndex] !== '['
    ) {
      endIndex += 1;
    }

    segments.push(pathText.slice(index, endIndex));
    index = endIndex;
  }

  return segments;
}

function findPathBracketEnd(pathText, startIndex) {
  let inString = false;
  let escaped = false;

  for (let index = startIndex + 1; index < pathText.length; index += 1) {
    const char = pathText[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString && char === ']') {
      return index;
    }
  }

  return -1;
}

export { parseFormattedPath };
