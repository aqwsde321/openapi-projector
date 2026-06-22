import { formatPreviewStyleSchemaDeclaration } from '../preview-style-schema-declaration.mjs';
import {
  getComparisonFieldName,
  inferParameterLocation,
} from './labels.mjs';
import {
  getSnapshotSchemaProperty,
  resolveComparisonSchemaTarget,
} from './schema-targets.mjs';
import { isResponseBodyOnlySchema } from '../schema-usage/targets.mjs';
import {
  findOperationParameter,
  getComparisonSnapshotForSide,
} from '../snapshots.mjs';

function formatSnapshotComparisonDeclaration(row, comparisonContext, side) {
  const snapshot = getComparisonSnapshotForSide(comparisonContext, side);

  if (!snapshot) {
    return null;
  }

  const parameterLocation = inferParameterLocation(row);
  const field = getComparisonFieldName(row, comparisonContext);
  if (parameterLocation) {
    const parameter = findOperationParameter(snapshot, parameterLocation, field);
    if (parameter?.schema) {
      return formatPreviewStyleSchemaDeclaration(
        field,
        parameter.schema,
        Boolean(parameter.required),
      );
    }
  }

  const schemaTarget = resolveComparisonSchemaTarget(
    row,
    comparisonContext,
    side,
  );
  const schemaProperty = getSnapshotSchemaProperty(snapshot, schemaTarget);
  if (schemaProperty) {
    return formatPreviewStyleSchemaDeclaration(
      schemaProperty.propertyName,
      schemaProperty.propertySchema,
      schemaProperty.required,
      {
        includeRequiredFlag: !isResponseBodyOnlySchema(
          schemaProperty.schemaName,
          comparisonContext,
        ),
      },
    );
  }

  return null;
}

export {
  findOperationParameter,
  formatSnapshotComparisonDeclaration,
  getComparisonSnapshotForSide,
  resolveComparisonSchemaTarget,
};
export { inferJavaTypeFromComparisonContext } from './java-type-inference.mjs';
