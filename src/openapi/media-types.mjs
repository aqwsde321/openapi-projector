function normalizeMediaType(mediaType) {
  return typeof mediaType === 'string'
    ? mediaType.split(';', 1)[0].trim().toLowerCase()
    : '';
}

function getMediaTypePriority(mediaType, options = {}) {
  const normalized = normalizeMediaType(mediaType);

  if (normalized === 'application/json') {
    return 0;
  }

  if (normalized.endsWith('+json')) {
    return 1;
  }

  if (normalized === '*/*') {
    return 2;
  }

  if (options.allowMultipart && normalized === 'multipart/form-data') {
    return 3;
  }

  return null;
}

function choosePreferredMediaType(mediaTypes, options = {}) {
  const candidates = mediaTypes
    .map((mediaType) => ({
      mediaType,
      normalized: normalizeMediaType(mediaType),
      priority: getMediaTypePriority(mediaType, options),
    }))
    .filter((candidate) => candidate.priority != null)
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        left.normalized.localeCompare(right.normalized) ||
        String(left.mediaType).localeCompare(String(right.mediaType)),
    );

  return candidates[0]?.mediaType ?? null;
}

function choosePreferredRequestMediaType(mediaTypes) {
  return choosePreferredMediaType(mediaTypes, { allowMultipart: true });
}

function choosePreferredResponseMediaType(mediaTypes) {
  return choosePreferredMediaType(mediaTypes);
}

export {
  choosePreferredRequestMediaType,
  choosePreferredResponseMediaType,
};
