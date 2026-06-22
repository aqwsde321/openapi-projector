function stripJsonTrailingCommas(rawText) {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (inString) {
      result += char;

      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === ',') {
      let nextIndex = index + 1;
      while (/\s/.test(rawText[nextIndex] ?? '')) {
        nextIndex += 1;
      }

      if (rawText[nextIndex] === '}' || rawText[nextIndex] === ']') {
        continue;
      }
    }

    result += char;
  }

  return result;
}

export { stripJsonTrailingCommas };
