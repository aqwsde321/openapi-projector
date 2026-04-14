import path from 'node:path';

import {
  buildEndpointCatalog,
  loadProjectConfig,
  readJson,
  renderEndpointCatalogMarkdown,
  writeJson,
  writeText,
} from '../core/openapi-utils.mjs';

const CATALOG_FORMAT_VERSION = 2;

const catalogCommand = {
  name: 'catalog',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);

    const sourcePath = path.resolve(rootDir, projectConfig.sourcePath);
    const catalogJsonPath = path.resolve(rootDir, projectConfig.catalogJsonPath);
    const catalogMarkdownPath = path.resolve(rootDir, projectConfig.catalogMarkdownPath);
    const reviewRoot = path.resolve(path.dirname(catalogMarkdownPath), '..');
    const changesDir = path.join(reviewRoot, 'changes');
    const changesJsonPath = path.join(changesDir, 'summary.json');
    const changesMarkdownPath = path.join(changesDir, 'summary.md');
    const historyDir = path.join(changesDir, 'history');

    const spec = await readJson(sourcePath);
    const previousCatalog = await readJsonIfExists(catalogJsonPath);
    const catalogEntries = buildEndpointCatalog(spec);
    const changeSummary = buildChangeSummary(
      previousCatalog?.endpoints ?? null,
      catalogEntries,
      previousCatalog?.version ?? null,
    );

    await writeJson(catalogJsonPath, {
      version: CATALOG_FORMAT_VERSION,
      endpoints: catalogEntries,
    });
    await writeText(catalogMarkdownPath, renderEndpointCatalogMarkdown(catalogEntries));
    await writeJson(changesJsonPath, changeSummary);
    await writeText(changesMarkdownPath, renderChangeMarkdown(changeSummary));

    if (hasRecordedChanges(changeSummary)) {
      const historyFileName = buildHistoryFileName(changeSummary.generatedAt);
      await writeJson(path.join(historyDir, `${historyFileName}.json`), changeSummary);
      await writeText(
        path.join(historyDir, `${historyFileName}.md`),
        renderChangeMarkdown(changeSummary),
      );
    }

    console.log(
      `Generated ${catalogEntries.length} endpoint catalog item(s) into ${catalogJsonPath}`,
    );
    console.log(
      `Catalog changes: +${changeSummary.added.length} / -${changeSummary.removed.length} / ~contract ${changeSummary.contractChanged.length} / ~doc ${changeSummary.docChanged.length}`,
    );
  },
};

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function buildChangeSummary(previousEntries, nextEntries, previousVersion) {
  const now = new Date().toISOString();

  if (
    previousVersion !== CATALOG_FORMAT_VERSION ||
    !previousEntries ||
    previousEntries.length === 0 ||
    previousEntries.every(
      (entry) => !entry.rawFingerprint || !entry.contractFingerprint,
    )
  ) {
    return {
      generatedAt: now,
      baseline: true,
      total: nextEntries.length,
      added: [],
      removed: [],
      contractChanged: [],
      docChanged: [],
    };
  }

  const previousMap = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const nextMap = new Map(nextEntries.map((entry) => [entry.id, entry]));

  const added = [];
  const removed = [];
  const contractChanged = [];
  const docChanged = [];

  for (const entry of nextEntries) {
    const previous = previousMap.get(entry.id);

    if (!previous) {
      added.push(toChangeItem(entry));
      continue;
    }

    if (previous.contractFingerprint !== entry.contractFingerprint) {
      contractChanged.push(toChangeItem(entry));
      continue;
    }

    if (previous.rawFingerprint !== entry.rawFingerprint) {
      docChanged.push(toChangeItem(entry));
    }
  }

  for (const entry of previousEntries) {
    if (!nextMap.has(entry.id)) {
      removed.push(toChangeItem(entry));
    }
  }

  return {
    generatedAt: now,
    baseline: false,
    total: nextEntries.length,
    added,
    removed,
    contractChanged,
    docChanged,
  };
}

function toChangeItem(entry) {
  return {
    id: entry.id,
    method: entry.method,
    path: entry.path,
    summary: entry.summary,
  };
}

function renderChangeMarkdown(changeSummary) {
  const lines = [
    '# Change Summary',
    '',
    `- Generated at: ${changeSummary.generatedAt}`,
    `- Current total endpoints: ${changeSummary.total}`,
  ];

  if (changeSummary.baseline) {
    lines.push('- Baseline: 이전 catalog 가 없어서 이번 결과를 기준선으로 저장했습니다.', '');
    return lines.join('\n');
  }

  lines.push(`- Added: ${changeSummary.added.length}`);
  lines.push(`- Removed: ${changeSummary.removed.length}`);
  lines.push(`- Contract Changed: ${changeSummary.contractChanged.length}`);
  lines.push(`- Doc Changed: ${changeSummary.docChanged.length}`);
  lines.push('');

  appendSection(lines, 'Added', changeSummary.added);
  appendSection(lines, 'Removed', changeSummary.removed);
  appendSection(lines, 'Contract Changed', changeSummary.contractChanged);
  appendSection(lines, 'Doc Changed', changeSummary.docChanged);

  return lines.join('\n');
}

function hasRecordedChanges(changeSummary) {
  return (
    !changeSummary.baseline &&
    (changeSummary.added.length > 0 ||
      changeSummary.removed.length > 0 ||
      changeSummary.contractChanged.length > 0 ||
      changeSummary.docChanged.length > 0)
  );
}

function buildHistoryFileName(isoTimestamp) {
  const date = new Date(isoTimestamp);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}-${millis}`;
}

function appendSection(lines, title, items) {
  lines.push(`## ${title}`, '');

  if (items.length === 0) {
    lines.push('- 없음', '');
    return;
  }

  for (const item of items) {
    lines.push(
      `- \`${item.id}\` [${item.method.toUpperCase()}] \`${item.path}\`${item.summary ? ` - ${item.summary}` : ''}`,
    );
  }

  lines.push('');
}

export { catalogCommand };
