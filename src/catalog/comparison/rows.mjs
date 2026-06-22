import {
  buildComparisonContext,
} from './context.mjs';
import { buildRenamedSchemaComparisonDetails } from './schema-renames/index.mjs';
import {
  appendParameterObjectRows,
  appendSchemaPropertyObjectRows,
  appendSchemaRequiredRows,
} from './row-generation/object-rows.mjs';
import {
  buildComparisonDisplayRows,
  buildComparisonTableRows,
} from './row-rendering/renderer.mjs';
import { toGenericComparisonRow } from './row-generation/generic-rows.mjs';

function buildComparisonRows(details, context = {}) {
  const rows = [];
  const consumedIndexes = new Set();
  const comparisonContext = buildComparisonContext(context);

  appendParameterObjectRows(rows, details, consumedIndexes);
  appendSchemaRequiredRows(rows, details, consumedIndexes, comparisonContext);
  appendSchemaPropertyObjectRows(rows, details, consumedIndexes, comparisonContext);

  details.forEach((detail, index) => {
    if (consumedIndexes.has(index)) {
      return;
    }

    const genericRow = toGenericComparisonRow(detail, comparisonContext);
    if (genericRow) {
      rows.push(genericRow);
    }
  });

  appendRenamedSchemaRows(rows, comparisonContext);

  return rows;
}

function appendRenamedSchemaRows(rows, comparisonContext) {
  const renamedDetails = buildRenamedSchemaComparisonDetails(comparisonContext);
  const renamedConsumedIndexes = new Set();
  const renamedComparisonContext = {
    ...comparisonContext,
    includeRenamedSchemaDetails: true,
  };

  appendSchemaRequiredRows(
    rows,
    renamedDetails,
    renamedConsumedIndexes,
    renamedComparisonContext,
  );
  appendSchemaPropertyObjectRows(
    rows,
    renamedDetails,
    renamedConsumedIndexes,
    renamedComparisonContext,
  );

  renamedDetails.forEach((detail, index) => {
    if (renamedConsumedIndexes.has(index)) {
      return;
    }

    const genericRow = toGenericComparisonRow(detail, renamedComparisonContext);
    if (genericRow) {
      rows.push(genericRow);
    }
  });
}

export {
  buildComparisonContext,
  buildComparisonDisplayRows,
  buildComparisonRows,
  buildComparisonTableRows,
};
