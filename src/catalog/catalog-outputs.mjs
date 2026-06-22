import fs from 'node:fs/promises';
import path from 'node:path';

import {
  CATALOG_FORMAT_VERSION,
  renderChangeMarkdown,
} from './changes/change-report.mjs';
import { renderEndpointCatalogMarkdown } from './endpoint-catalog-markdown.mjs';
import { writeJson, writeText } from '../io/files.mjs';
import { ensureOpenapiGitignore } from './catalog-gitignore.mjs';
import { writeCatalogHistoryOutputs } from './catalog-history-outputs.mjs';

async function removeLegacyChangeSummary(changesDir) {
  await Promise.all([
    fs.rm(path.join(changesDir, 'summary.md'), { force: true }),
    fs.rm(path.join(changesDir, 'summary.json'), { force: true }),
  ]);
}

async function writeCatalogOutputs({
  catalogEntries,
  catalogJsonPath,
  catalogMarkdownPath,
  changeSummary,
  changesIndexJsonPath,
  changesIndexMarkdownPath,
  historyDir,
  markdownChangeSummary,
  openapiRoot,
  rootDir,
}) {
  await writeJson(catalogJsonPath, {
    version: CATALOG_FORMAT_VERSION,
    endpoints: catalogEntries,
  });
  await writeText(catalogMarkdownPath, renderEndpointCatalogMarkdown(catalogEntries));
  await writeJson(changesIndexJsonPath, changeSummary);
  await writeText(
    changesIndexMarkdownPath,
    renderChangeMarkdown(markdownChangeSummary, {
      rootDir,
      markdownDir: openapiRoot,
      locationLinks: {
        history: 'openapi/review/changes/history',
        catalogBaseline: 'openapi/review/catalog/endpoints.json',
      },
    }),
  );

  await writeCatalogHistoryOutputs({
    changeSummary,
    historyDir,
    markdownChangeSummary,
    rootDir,
  });
}

export {
  ensureOpenapiGitignore,
  removeLegacyChangeSummary,
  writeCatalogOutputs,
};
