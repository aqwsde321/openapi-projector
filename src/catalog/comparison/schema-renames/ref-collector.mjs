import { schemaRefName } from '#src/openapi/refs.mjs';
import { isPlainObject } from '../../diff-utils/value-types.mjs';
import { addSchemaRename } from './map.mjs';

function collectSchemaRefRenames(previousValue, nextValue, schemaRenames) {
  let changed = false;

  if (!previousValue || !nextValue) {
    return false;
  }

  if (
    isPlainObject(previousValue) &&
    isPlainObject(nextValue) &&
    typeof previousValue.$ref === 'string' &&
    typeof nextValue.$ref === 'string' &&
    previousValue.$ref !== nextValue.$ref
  ) {
    changed = addSchemaRename(
      schemaRenames,
      schemaRefName(previousValue.$ref),
      schemaRefName(nextValue.$ref),
    ) || changed;
  }

  if (Array.isArray(previousValue) && Array.isArray(nextValue)) {
    const length = Math.min(previousValue.length, nextValue.length);
    for (let index = 0; index < length; index += 1) {
      changed = collectSchemaRefRenames(
        previousValue[index],
        nextValue[index],
        schemaRenames,
      ) || changed;
    }
    return changed;
  }

  if (isPlainObject(previousValue) && isPlainObject(nextValue)) {
    const keys = new Set([...Object.keys(previousValue), ...Object.keys(nextValue)]);
    for (const key of keys) {
      changed = collectSchemaRefRenames(
        previousValue[key],
        nextValue[key],
        schemaRenames,
      ) || changed;
    }
  }

  return changed;
}

export { collectSchemaRefRenames };
