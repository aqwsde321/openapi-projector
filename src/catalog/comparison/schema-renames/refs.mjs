import {
  mergeSchemaRenames,
} from './map.mjs';
import { normalizeRenamedSchemaRefs } from './normalizer.mjs';
import { collectSchemaRefRenames } from './ref-collector.mjs';

function detectOperationSchemaRefRenames(previousOperation, nextOperation) {
  const schemaRenames = new Map();
  collectSchemaRefRenames(previousOperation, nextOperation, schemaRenames);
  return schemaRenames;
}

function expandSchemaRenamesFromSchemaRefChanges(schemaRenames, previousSchemas, nextSchemas) {
  let changed = true;

  while (changed) {
    changed = false;

    for (const schemaName of Object.keys(previousSchemas ?? {})) {
      if (Object.hasOwn(nextSchemas ?? {}, schemaName)) {
        changed = collectSchemaRefRenames(
          previousSchemas[schemaName],
          nextSchemas[schemaName],
          schemaRenames,
        ) || changed;
      }
    }

    for (const [previousName, nextName] of schemaRenames) {
      if (previousSchemas?.[previousName] && nextSchemas?.[nextName]) {
        changed = collectSchemaRefRenames(
          previousSchemas[previousName],
          nextSchemas[nextName],
          schemaRenames,
        ) || changed;
      }
    }
  }
}

export {
  detectOperationSchemaRefRenames,
  expandSchemaRenamesFromSchemaRefChanges,
  mergeSchemaRenames,
  normalizeRenamedSchemaRefs,
};
