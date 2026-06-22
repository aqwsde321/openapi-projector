import { stripMarkdownFormatting } from '../../format/inline.mjs';
import { javaTypeFromOpenApiType } from '../../schema-java-types.mjs';

function parseComparisonValue(value) {
  const raw = stripMarkdownFormatting(value);
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  const type = parts.find((part) =>
    !['required', 'optional', 'nullable', 'true', 'false', '없음'].includes(part) &&
    !part.startsWith('format=')
  );
  const format = parts.find((part) => part.startsWith('format='));

  return {
    raw,
    type: type ?? null,
    format: format ? format.slice('format='.length) : null,
    required: parts.includes('required') ? true : parts.includes('optional') ? false : null,
    nullable: parts.includes('nullable'),
  };
}

function javaTypeFromComparisonValue(summary) {
  const type = summary.type;
  if (!type) {
    return null;
  }

  if (type.endsWith('[]')) {
    return `List<${javaTypeFromComparisonValue({ ...summary, type: type.slice(0, -2) }) ?? 'Object'}>`;
  }

  if (type.startsWith('enum(')) {
    return 'String';
  }

  return javaTypeFromOpenApiType(type, summary.format) ?? type;
}

function formatComparisonValueFlags(summary) {
  const flags = [];

  if (summary.required === true) {
    flags.push('required');
  } else if (summary.required === false) {
    flags.push('optional');
  }
  if (summary.nullable) {
    flags.push('nullable');
  }

  return flags.length > 0 ? ` (${flags.join(', ')})` : '';
}

export {
  formatComparisonValueFlags,
  javaTypeFromComparisonValue,
  parseComparisonValue,
};
