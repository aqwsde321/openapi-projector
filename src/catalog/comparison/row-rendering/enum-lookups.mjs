import { getSchemaEnumValuesForTarget } from '../enum-values/index.mjs';
import {
  getComparisonFieldName,
  inferParameterLocation,
} from './labels.mjs';
import { resolveComparisonSchemaTarget } from './schema-targets.mjs';
import { findOperationParameter } from '../snapshots.mjs';

function getParameterEnumValues(row, comparisonContext, snapshot, target) {
  const parameterLocation = inferParameterLocation(row);
  if (!parameterLocation) {
    return null;
  }

  const field = getComparisonFieldName(row, comparisonContext);
  const parameter = findOperationParameter(snapshot, parameterLocation, field);
  const parameterEnums = getSchemaEnumValuesForTarget(parameter?.schema, target);

  return parameterEnums ? parameterEnums.map(String) : null;
}

function getSchemaPropertyEnumValues(
  row,
  comparisonContext,
  side,
  snapshot,
  target,
) {
  const schemaTarget = resolveComparisonSchemaTarget(row, comparisonContext, side);
  if (!schemaTarget?.schemaName || !schemaTarget?.propertyName) {
    return null;
  }

  const schema = snapshot?.referencedSchemas?.[schemaTarget.schemaName];
  const propertySchema = schema?.properties?.[schemaTarget.propertyName];
  const enumValues = getSchemaEnumValuesForTarget(propertySchema, target);

  return enumValues ? enumValues.map(String) : null;
}

export {
  getParameterEnumValues,
  getSchemaPropertyEnumValues,
};
