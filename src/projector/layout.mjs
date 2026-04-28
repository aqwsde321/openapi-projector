import {
  normalizeText,
  toKebabCase,
} from '../core/openapi-utils.mjs';

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

export { buildTagDirectoryName };
