import { stripMarkdownFormatting } from '../../format/inline.mjs';
export {
  getSchemaEnumValues,
  getSchemaEnumValuesForTarget,
} from './schema-enum-values.mjs';

function formatEnumValues(values) {
  return values.map((value) => String(value)).join(', ');
}

function formatEnumTypeLabel(values) {
  return `enum(${values.map((item) => JSON.stringify(item)).join(', ')})`;
}

function parseComparisonEnumValues(value) {
  const raw = stripMarkdownFormatting(value);
  if (!raw || raw === '없음') {
    return null;
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }

  const enumMatch = raw.match(/^enum\((.*)\)$/u);
  if (!enumMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(`[${enumMatch[1]}]`);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return enumMatch[1]
      .split(',')
      .map((item) => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
}

export {
  formatEnumTypeLabel,
  formatEnumValues,
  parseComparisonEnumValues,
};
