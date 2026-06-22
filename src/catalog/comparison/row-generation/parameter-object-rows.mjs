import { formatInlineCode, toTitleCase } from '../../format/inline.mjs';
import { parseParameterDetailPath } from '../path-utils/index.mjs';
import {
  formatSchemaTypeLabel,
  getAddedOrRemovedDetailValue,
  isAddedOrRemovedDetail,
} from './object-row-values.mjs';

function appendParameterObjectRows(rows, details, consumedIndexes) {
  const groups = new Map();

  details.forEach((detail, index) => {
    const parsed = parseParameterDetailPath(detail.path);

    if (!parsed || !isAddedOrRemovedDetail(detail)) {
      return;
    }

    const groupKey = `${detail.kind}:${parsed.parameterKey}`;
    const group = groups.get(groupKey) ?? {
      kind: detail.kind,
      location: parsed.location,
      name: parsed.name,
      indexes: [],
      values: new Map(),
    };

    group.indexes.push(index);
    group.values.set(parsed.fieldPath, getAddedOrRemovedDetailValue(detail));
    groups.set(groupKey, group);
  });

  for (const group of groups.values()) {
    if (!group.values.has('in') || !group.values.has('name')) {
      continue;
    }

    rows.push({
      category: `${toTitleCase(group.location)} Parameter`,
      target: formatInlineCode(group.name),
      previous:
        group.kind === 'added'
          ? '없음'
          : formatParameterSummary(group.values),
      next:
        group.kind === 'removed'
          ? '없음'
          : formatParameterSummary(group.values),
    });

    group.indexes.forEach((index) => consumedIndexes.add(index));
  }
}

function formatParameterSummary(values) {
  const parts = [
    formatInlineCode(formatSchemaTypeLabel(values, { fieldPrefix: 'schema' })),
  ];

  if (values.has('schema.format')) {
    parts.push(`format=${formatInlineCode(values.get('schema.format'))}`);
  }

  if (values.has('required')) {
    parts.push(values.get('required') ? 'required' : 'optional');
  }

  return parts.join(', ');
}

export { appendParameterObjectRows };
