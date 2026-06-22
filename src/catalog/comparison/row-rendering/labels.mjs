import { stripMarkdownFormatting } from '../../format/inline.mjs';
import { getSchemaDisplayName } from '../schema-renames/index.mjs';
import {
  parseReferencedSchemaTarget,
  stripSchemaTargetMetadata,
} from '../path-utils/index.mjs';
import {
  inferParameterLocation,
  parseParameterTarget,
} from '../path-utils/parameter-row-labels.mjs';
import { localizeComparisonCategory } from './categories.mjs';
import { matchKnownSchemaTarget } from '../schema-usage/targets.mjs';

function getComparisonRowKind(row) {
  if (row.previous === '없음') {
    return 'added';
  }

  if (row.next === '없음') {
    return 'removed';
  }

  return 'changed';
}

function formatComparisonKind(kind) {
  return {
    added: '🟢 추가',
    changed: '🟡 변경',
    removed: '🔴 삭제',
  }[kind] ?? '⚪ 변경';
}

function getComparisonFieldName(row, comparisonContext = {}) {
  const parameterTarget = parseParameterTarget(row?.target);
  if (parameterTarget) {
    return parameterTarget.split('.').slice(1).join('.') || parameterTarget;
  }

  const target = stripMarkdownFormatting(row?.target);
  const referencedSchemaTarget = parseReferencedSchemaTarget(target);
  if (referencedSchemaTarget?.propertyName) {
    return referencedSchemaTarget.propertyName;
  }
  if (referencedSchemaTarget?.schemaName) {
    return getSchemaDisplayName(referencedSchemaTarget.schemaName);
  }

  const knownSchemaTarget = matchKnownSchemaTarget(target, comparisonContext);
  if (knownSchemaTarget?.propertyName) {
    return knownSchemaTarget.propertyName;
  }
  if (knownSchemaTarget?.schemaName) {
    return getSchemaDisplayName(knownSchemaTarget.schemaName);
  }

  const normalizedTarget = stripSchemaTargetMetadata(
    target.replace(/^schema\./, ''),
  );
  const parts = normalizedTarget.split('.');
  return parts.at(-1) || 'value';
}

export {
  formatComparisonKind,
  getComparisonFieldName,
  getComparisonRowKind,
  inferParameterLocation,
  localizeComparisonCategory,
};
