import { stripMarkdownFormatting } from '../../format/inline.mjs';
import { javaTypeFromSchema } from '../../schema-java-types.mjs';
import { parseReferencedSchemaTarget } from '../path-utils/index.mjs';
import {
  getComparisonFieldName,
  inferParameterLocation,
} from './labels.mjs';
import { getSnapshotSchemaProperty } from './schema-targets.mjs';
import { matchKnownSchemaTarget } from '../schema-usage/targets.mjs';
import {
  findOperationParameter,
  getComparisonSnapshots,
} from '../snapshots.mjs';

function inferJavaTypeFromComparisonContext(row, comparisonContext) {
  const parameterLocation = inferParameterLocation(row);
  const field = getComparisonFieldName(row);
  const snapshots = getComparisonSnapshots(comparisonContext);

  if (parameterLocation) {
    for (const snapshot of snapshots) {
      const parameter = findOperationParameter(
        snapshot,
        parameterLocation,
        field,
      );
      const type = javaTypeFromSchema(parameter?.schema);
      if (type) {
        return type;
      }
    }
  }

  const target = stripMarkdownFormatting(row?.target);
  const schemaTarget =
    parseReferencedSchemaTarget(target) ??
    matchKnownSchemaTarget(target, comparisonContext);
  const { schemaName, propertyName } = schemaTarget ?? {};

  if (!schemaName || !propertyName) {
    return null;
  }

  for (const snapshot of snapshots) {
    const schemaProperty = getSnapshotSchemaProperty(snapshot, {
      schemaName,
      propertyName,
    });
    const type = javaTypeFromSchema(schemaProperty?.propertySchema);
    if (type) {
      return type;
    }
  }

  return null;
}

export { inferJavaTypeFromComparisonContext };
