import { stripMarkdownFormatting } from '../../format/inline.mjs';
import { parseReferencedSchemaTarget } from '../path-utils/index.mjs';
import { matchKnownSchemaTarget } from '../schema-usage/targets.mjs';

function getSnapshotSchemaProperty(snapshot, schemaTarget) {
  const { schemaName, propertyName } = schemaTarget ?? {};

  if (!schemaName || !propertyName) {
    return null;
  }

  const schema = snapshot?.referencedSchemas?.[schemaName];
  const propertySchema = schema?.properties?.[propertyName];

  if (!propertySchema) {
    return null;
  }

  return {
    propertyName,
    propertySchema,
    required: new Set(schema?.required ?? []).has(propertyName),
    schemaName,
  };
}

function resolveComparisonSchemaTarget(row, comparisonContext, side) {
  const target = stripMarkdownFormatting(row?.target);
  const parsedTarget =
    parseReferencedSchemaTarget(target) ??
    matchKnownSchemaTarget(target, comparisonContext);

  if (!parsedTarget?.schemaName) {
    return parsedTarget;
  }

  const snapshot = side === 'previous'
    ? comparisonContext?.previousSnapshot
    : comparisonContext?.nextSnapshot;
  if (snapshot?.referencedSchemas?.[parsedTarget.schemaName]) {
    return parsedTarget;
  }

  if (side === 'next') {
    const nextSchemaName = comparisonContext?.schemaRenames?.get(
      parsedTarget.schemaName,
    );
    if (nextSchemaName && snapshot?.referencedSchemas?.[nextSchemaName]) {
      return {
        ...parsedTarget,
        schemaName: nextSchemaName,
      };
    }
  }

  if (side === 'previous') {
    for (const [previousName, nextName] of comparisonContext?.schemaRenames ??
      new Map()) {
      if (
        nextName === parsedTarget.schemaName &&
        snapshot?.referencedSchemas?.[previousName]
      ) {
        return {
          ...parsedTarget,
          schemaName: previousName,
        };
      }
    }
  }

  return parsedTarget;
}

export {
  getSnapshotSchemaProperty,
  resolveComparisonSchemaTarget,
};
