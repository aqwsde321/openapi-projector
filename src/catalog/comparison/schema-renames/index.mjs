import { diffValues } from '../../diff-utils/diff-values.mjs';
import { normalizeDiffValue } from '../../diff-utils/normalize.mjs';
import {
  detectOperationSchemaRefRenames,
  expandSchemaRenamesFromSchemaRefChanges,
  mergeSchemaRenames,
  normalizeRenamedSchemaRefs,
} from './refs.mjs';
import {
  detectEquivalentSchemaRenames,
  getSchemaDisplayName,
} from './signatures.mjs';

function detectSchemaRenames(previousSnapshot, nextSnapshot) {
  const previousSchemas = previousSnapshot?.referencedSchemas ?? {};
  const nextSchemas = nextSnapshot?.referencedSchemas ?? {};
  const schemaRenames = new Map();

  mergeSchemaRenames(
    schemaRenames,
    detectOperationSchemaRefRenames(previousSnapshot?.operation, nextSnapshot?.operation),
  );
  mergeSchemaRenames(
    schemaRenames,
    detectEquivalentSchemaRenames(previousSchemas, nextSchemas),
  );
  expandSchemaRenamesFromSchemaRefChanges(schemaRenames, previousSchemas, nextSchemas);

  return schemaRenames;
}

function buildRenamedSchemaComparisonDetails(comparisonContext) {
  const previousSchemas = comparisonContext?.previousSnapshot?.referencedSchemas ?? {};
  const nextSchemas = comparisonContext?.nextSnapshot?.referencedSchemas ?? {};
  const details = [];

  for (const [previousName, nextName] of comparisonContext?.schemaRenames ?? new Map()) {
    const previousSchema = previousSchemas?.[previousName];
    const nextSchema = nextSchemas?.[nextName];

    if (!previousSchema || !nextSchema) {
      continue;
    }

    details.push(
      ...diffValues(
        normalizeDiffValue(
          normalizeRenamedSchemaRefs(previousSchema, comparisonContext?.schemaRenames),
          ['referencedSchemas', nextName],
        ),
        normalizeDiffValue(nextSchema, ['referencedSchemas', nextName]),
        ['referencedSchemas', nextName],
      ),
    );
  }

  return details;
}

export {
  buildRenamedSchemaComparisonDetails,
  detectSchemaRenames,
  getSchemaDisplayName,
};
