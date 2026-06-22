function formatDetailValue(value) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  const normalized = raw === undefined ? 'null' : raw;
  const compact = normalized.replace(/\s+/g, ' ');
  const truncated = compact.length > 140 ? `${compact.slice(0, 137)}...` : compact;
  return formatInlineCode(truncated);
}

function formatInlineCode(value) {
  return `\`${String(value).replace(/`/g, '\\`')}\``;
}

function stripMarkdownFormatting(value) {
  return String(value ?? '')
    .replace(/\\`/g, '`')
    .replace(/`/g, '')
    .trim();
}

function toTitleCase(value) {
  const text = String(value ?? '');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : 'Unknown';
}

export {
  formatDetailValue,
  formatInlineCode,
  stripMarkdownFormatting,
  toTitleCase,
};
