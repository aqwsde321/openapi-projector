function parseParameterDetailPath(detailPath) {
  const match = detailPath.match(/^operation\.parameters\[(.+?)\]\.(.+)$/);

  if (!match) {
    return null;
  }

  let parameterKey;
  try {
    parameterKey = JSON.parse(match[1]);
  } catch {
    return null;
  }

  const separatorIndex = parameterKey.indexOf('.');
  if (separatorIndex < 0) {
    return null;
  }

  return {
    parameterKey,
    location: parameterKey.slice(0, separatorIndex),
    name: parameterKey.slice(separatorIndex + 1),
    fieldPath: match[2],
  };
}

export { parseParameterDetailPath };
