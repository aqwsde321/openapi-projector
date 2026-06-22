import {
  buildSchemaUsageMap,
  mergeSchemaUsageMaps,
} from './schema-usage/index.mjs';
import { detectSchemaRenames } from './schema-renames/index.mjs';

function buildComparisonContext({ previousSnapshot, nextSnapshot } = {}) {
  const schemaRenames = detectSchemaRenames(previousSnapshot, nextSnapshot);

  return {
    previousSnapshot,
    nextSnapshot,
    schemaRenames,
    renamedSchemaNames: new Set([
      ...schemaRenames.keys(),
      ...schemaRenames.values(),
    ]),
    schemaUsageByName: mergeSchemaUsageMaps(
      buildSchemaUsageMap(previousSnapshot),
      buildSchemaUsageMap(nextSnapshot),
    ),
  };
}

export { buildComparisonContext };
