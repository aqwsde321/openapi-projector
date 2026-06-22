import { buildComparisonTableRows } from '../comparison/rows.mjs';
import { buildEndpointPreview } from '../endpoint-preview.mjs';
import {
  buildSwaggerOperationUrl,
  resolveSwaggerUiBaseUrl,
} from './swagger-links.mjs';

function withEndpointPreviews(
  changeSummary,
  previousEntries,
  nextEntries,
  projectConfig = {},
  projectConfigOverrides = projectConfig,
) {
  if (changeSummary.baseline) {
    return changeSummary;
  }

  const previousMap = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const nextMap = new Map(nextEntries.map((entry) => [entry.id, entry]));
  const swaggerUiBaseUrl = resolveSwaggerUiBaseUrl(
    projectConfig,
    projectConfigOverrides,
  );
  const withSwaggerLink = (item) => {
    const entry = nextMap.get(item.id) ?? previousMap.get(item.id);
    const swaggerUrl = buildSwaggerOperationUrl(entry, swaggerUiBaseUrl);
    return {
      ...item,
      ...(swaggerUrl ? { swaggerUrl } : {}),
    };
  };
  const withContractPreview = (item) => {
    const previousEntry = previousMap.get(item.id);
    const nextEntry = nextMap.get(item.id);
    const endpointPreview = buildEndpointPreview(
      previousEntry,
      nextEntry,
    );
    const comparisonContext = {
      previousSnapshot: previousEntry?.contractSnapshot,
      nextSnapshot: nextEntry?.contractSnapshot,
    };
    return {
      ...withSwaggerLink(item),
      comparisonTableRows: buildComparisonTableRows(
        item.comparisonRows ?? [],
        comparisonContext,
      ),
      ...(endpointPreview ? { endpointPreview } : {}),
    };
  };

  return {
    ...changeSummary,
    added: changeSummary.added.map(withSwaggerLink),
    removed: changeSummary.removed.map((item) => ({ ...item, removed: true })),
    contractChanged: changeSummary.contractChanged.map(withContractPreview),
    docChanged: changeSummary.docChanged.map(withSwaggerLink),
  };
}

export { withEndpointPreviews };
