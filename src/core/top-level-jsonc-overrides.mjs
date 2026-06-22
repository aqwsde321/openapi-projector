function replaceTopLevelJsoncValue(rawText, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`("${escapedKey}"\\s*:\\s*)([^\\n,]+)`, 'm');

  if (!pattern.test(rawText)) {
    return rawText;
  }

  return rawText.replace(pattern, `$1${JSON.stringify(value)}`);
}

function applyTopLevelJsoncOverrides(rawText, overrides) {
  let nextText = rawText;

  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value === undefined) {
      continue;
    }

    nextText = replaceTopLevelJsoncValue(nextText, key, value);
  }

  return nextText;
}

export { applyTopLevelJsoncOverrides };
