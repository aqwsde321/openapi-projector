import path from 'node:path';

import {
  buildEndpointCatalog,
  loadProjectConfig,
  readJson,
  renderEndpointCatalogMarkdown,
  writeJson,
  writeText,
} from '../core/openapi-utils.mjs';
import { loadSupportedOpenApiSpec } from '../openapi/load-spec.mjs';

const CATALOG_FORMAT_VERSION = 2;
const MAX_CHANGE_DETAILS = 60;

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

    const spec = await loadSupportedOpenApiSpec(sourcePath);
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
      contractChanged.push(toContractChangeItem(previous, entry));
      continue;
    }

    if (previous.rawFingerprint !== entry.rawFingerprint) {
      docChanged.push(toDocChangeItem(previous, entry));
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

function toContractChangeItem(previousEntry, nextEntry) {
  const baseItem = toChangeItem(nextEntry);
  const hasSnapshots = previousEntry?.contractSnapshot && nextEntry?.contractSnapshot;

  if (!hasSnapshots) {
    return {
      ...baseItem,
      detailCount: 0,
      detailsTruncated: false,
      detailsUnavailable: true,
      details: [],
    };
  }

  const allDetails = diffContractSnapshots(
    previousEntry.contractSnapshot,
    nextEntry.contractSnapshot,
  );
  const details =
    allDetails.length > 0
      ? allDetails
      : [
          {
            kind: 'changed',
            path: 'contractFingerprint',
            previous: previousEntry.contractFingerprint,
            next: nextEntry.contractFingerprint,
          },
        ];

  return {
    ...baseItem,
    detailCount: details.length,
    detailsTruncated: details.length > MAX_CHANGE_DETAILS,
    details: details.slice(0, MAX_CHANGE_DETAILS),
    comparisonRows: buildComparisonRows(details.slice(0, MAX_CHANGE_DETAILS)),
  };
}

function toDocChangeItem(previousEntry, nextEntry) {
  const details = buildDocChangeDetails(previousEntry, nextEntry);

  return {
    ...toChangeItem(nextEntry),
    detailCount: details.length,
    detailsTruncated: false,
    details,
    comparisonRows: buildComparisonRows(details),
  };
}

function buildDocChangeDetails(previousEntry, nextEntry) {
  const details = [];

  appendFieldChange(details, 'summary', previousEntry.summary, nextEntry.summary);
  appendFieldChange(details, 'description', previousEntry.description, nextEntry.description);
  appendFieldChange(details, 'operationId', previousEntry.operationId, nextEntry.operationId);
  appendFieldChange(
    details,
    'tags',
    previousEntry.tags?.join(', ') ?? '',
    nextEntry.tags?.join(', ') ?? '',
  );

  if (details.length === 0) {
    details.push({
      kind: 'changed',
      path: 'documentation',
      previous: previousEntry.rawFingerprint,
      next: nextEntry.rawFingerprint,
    });
  }

  return details;
}

function appendFieldChange(details, pathName, previousValue, nextValue) {
  if (previousValue === nextValue) {
    return;
  }

  details.push({
    kind: 'changed',
    path: pathName,
    previous: previousValue ?? null,
    next: nextValue ?? null,
  });
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
    appendChangeItem(lines, item);
  }

  lines.push('');
}

function appendChangeItem(lines, item) {
  lines.push(
    `- \`${item.id}\` [${item.method.toUpperCase()}] \`${item.path}\`${item.summary ? ` - ${item.summary}` : ''}`,
  );

  if (item.detailsUnavailable) {
    lines.push(
      '  - 상세 변경 내용은 이전 catalog에 비교용 snapshot이 없어 표시할 수 없습니다. 이번 refresh 이후부터 기록됩니다.',
    );
    return;
  }

  for (const detail of item.details ?? []) {
    if ((item.comparisonRows ?? []).length === 0) {
      lines.push(`  - ${formatChangeDetail(detail)}`);
    }
  }

  if ((item.comparisonRows ?? []).length > 0) {
    lines.push('');
    appendComparisonTable(lines, item.comparisonRows);
  }

  if (item.detailsTruncated) {
    lines.push(`  - ... ${item.detailCount - (item.details?.length ?? 0)}개 변경 항목 생략`);
  }
}

function appendComparisonTable(lines, rows) {
  lines.push('| 구분 | 항목 | 이전 | 변경 |');
  lines.push('| --- | --- | --- | --- |');

  for (const row of rows) {
    lines.push(
      `| ${escapeMarkdownTableCell(row.category)} | ${escapeMarkdownTableCell(row.target)} | ${escapeMarkdownTableCell(row.previous)} | ${escapeMarkdownTableCell(row.next)} |`,
    );
  }

  lines.push('');
}

function buildComparisonRows(details) {
  const rows = [];
  const consumedIndexes = new Set();

  appendParameterObjectRows(rows, details, consumedIndexes);
  appendSchemaPropertyObjectRows(rows, details, consumedIndexes);

  details.forEach((detail, index) => {
    if (consumedIndexes.has(index)) {
      return;
    }

    rows.push(toGenericComparisonRow(detail));
  });

  return rows;
}

function appendParameterObjectRows(rows, details, consumedIndexes) {
  const groups = new Map();

  details.forEach((detail, index) => {
    const parsed = parseParameterDetailPath(detail.path);

    if (!parsed || (detail.kind !== 'added' && detail.kind !== 'removed')) {
      return;
    }

    const groupKey = `${detail.kind}:${parsed.parameterKey}`;
    const group = groups.get(groupKey) ?? {
      kind: detail.kind,
      location: parsed.location,
      name: parsed.name,
      indexes: [],
      values: new Map(),
    };

    group.indexes.push(index);
    group.values.set(parsed.fieldPath, detail.kind === 'added' ? detail.next : detail.previous);
    groups.set(groupKey, group);
  });

  for (const group of groups.values()) {
    if (!group.values.has('in') || !group.values.has('name')) {
      continue;
    }

    rows.push({
      category: `${toTitleCase(group.location)} Parameter`,
      target: formatInlineCode(group.name),
      previous: group.kind === 'added' ? '없음' : formatParameterSummary(group.values),
      next: group.kind === 'removed' ? '없음' : formatParameterSummary(group.values),
    });

    group.indexes.forEach((index) => consumedIndexes.add(index));
  }
}

function appendSchemaPropertyObjectRows(rows, details, consumedIndexes) {
  const groups = new Map();

  details.forEach((detail, index) => {
    const parsed = parseSchemaPropertyDetailPath(detail.path);

    if (!parsed || (detail.kind !== 'added' && detail.kind !== 'removed')) {
      return;
    }

    const groupKey = `${detail.kind}:${parsed.schemaName}.${parsed.propertyName}`;
    const group = groups.get(groupKey) ?? {
      kind: detail.kind,
      schemaName: parsed.schemaName,
      propertyName: parsed.propertyName,
      indexes: [],
      values: new Map(),
    };

    group.indexes.push(index);
    group.values.set(parsed.fieldPath, detail.kind === 'added' ? detail.next : detail.previous);
    groups.set(groupKey, group);
  });

  const referencedSchemaNames = new Set();
  for (const group of groups.values()) {
    for (const schemaName of getReferencedSchemaNames(group.values)) {
      referencedSchemaNames.add(schemaName);
    }
  }

  details.forEach((detail, index) => {
    const schemaName = parseReferencedSchemaName(detail.path);
    if (schemaName && referencedSchemaNames.has(schemaName)) {
      consumedIndexes.add(index);
    }
  });

  for (const group of groups.values()) {
    if (referencedSchemaNames.has(group.schemaName)) {
      continue;
    }

    if (!hasSchemaPropertyTypeEvidence(group.values)) {
      continue;
    }

    rows.push({
      category: 'Schema Property',
      target: formatInlineCode(`${group.schemaName}.${group.propertyName}`),
      previous: group.kind === 'added' ? '없음' : formatSchemaPropertySummary(group.values),
      next: group.kind === 'removed' ? '없음' : formatSchemaPropertySummary(group.values),
    });

    group.indexes.forEach((index) => consumedIndexes.add(index));
  }
}

function getReferencedSchemaNames(values) {
  const refs = [];

  if (values.has('$ref')) {
    refs.push(schemaRefName(values.get('$ref')));
  }

  if (values.has('items.$ref')) {
    refs.push(schemaRefName(values.get('items.$ref')));
  }

  return refs.filter(Boolean);
}

function parseReferencedSchemaName(detailPath) {
  const segments = parseFormattedPath(detailPath);
  return segments[0] === 'referencedSchemas' ? segments[1] : null;
}

function parseSchemaPropertyDetailPath(detailPath) {
  const segments = parseFormattedPath(detailPath);

  if (
    segments[0] !== 'referencedSchemas' ||
    !segments[1] ||
    segments[2] !== 'properties' ||
    !segments[3] ||
    segments.length < 5
  ) {
    return null;
  }

  return {
    schemaName: segments[1],
    propertyName: segments[3],
    fieldPath: segments.slice(4).join('.'),
  };
}

function parseFormattedPath(pathText) {
  const segments = [];
  let index = 0;

  while (index < pathText.length) {
    const char = pathText[index];

    if (char === '.') {
      index += 1;
      continue;
    }

    if (char === '[') {
      const endIndex = findPathBracketEnd(pathText, index);
      if (endIndex < 0) {
        return segments;
      }

      try {
        segments.push(JSON.parse(pathText.slice(index + 1, endIndex)));
      } catch {
        return segments;
      }

      index = endIndex + 1;
      continue;
    }

    let endIndex = index + 1;
    while (
      endIndex < pathText.length &&
      pathText[endIndex] !== '.' &&
      pathText[endIndex] !== '['
    ) {
      endIndex += 1;
    }

    segments.push(pathText.slice(index, endIndex));
    index = endIndex;
  }

  return segments;
}

function findPathBracketEnd(pathText, startIndex) {
  let inString = false;
  let escaped = false;

  for (let index = startIndex + 1; index < pathText.length; index += 1) {
    const char = pathText[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString && char === ']') {
      return index;
    }
  }

  return -1;
}

function parseParameterDetailPath(detailPath) {
  const match = detailPath.match(/^operation\.parameters\[(.+?)\]\.(.+)$/);

  if (!match) {
    return null;
  }

  let parameterKey;
  try {
    parameterKey = JSON.parse(match[1]);
  } catch {
    return null;
  }

  const separatorIndex = parameterKey.indexOf('.');
  if (separatorIndex < 0) {
    return null;
  }

  return {
    parameterKey,
    location: parameterKey.slice(0, separatorIndex),
    name: parameterKey.slice(separatorIndex + 1),
    fieldPath: match[2],
  };
}

function toGenericComparisonRow(detail) {
  return {
    category: classifyChangeDetail(detail.path),
    target: formatInlineCode(detail.path),
    previous: detail.kind === 'added' ? '없음' : formatDetailValue(detail.previous),
    next: detail.kind === 'removed' ? '없음' : formatDetailValue(detail.next),
  };
}

function classifyChangeDetail(detailPath) {
  if (detailPath.startsWith('operation.parameters')) {
    return 'Parameter';
  }

  if (detailPath.startsWith('operation.requestBody')) {
    return 'Request Body';
  }

  if (detailPath.startsWith('operation.responses')) {
    return 'Response';
  }

  if (detailPath.startsWith('referencedSchemas')) {
    return 'Schema';
  }

  if (['summary', 'description', 'operationId', 'tags', 'documentation'].includes(detailPath)) {
    return 'Documentation';
  }

  return 'Contract';
}

function formatParameterSummary(values) {
  const parts = [formatInlineCode(getParameterTypeLabel(values))];

  if (values.has('schema.format')) {
    parts.push(`format=${formatInlineCode(values.get('schema.format'))}`);
  }

  if (values.has('required')) {
    parts.push(values.get('required') ? 'required' : 'optional');
  }

  return parts.join(', ');
}

function getParameterTypeLabel(values) {
  if (values.has('schema.$ref')) {
    return schemaRefName(values.get('schema.$ref'));
  }

  if (values.has('schema.enum')) {
    return `enum(${values.get('schema.enum').map((item) => JSON.stringify(item)).join(', ')})`;
  }

  if (values.get('schema.type') === 'array') {
    if (values.has('schema.items.$ref')) {
      return `${schemaRefName(values.get('schema.items.$ref'))}[]`;
    }

    if (values.has('schema.items.type')) {
      return `${values.get('schema.items.type')}[]`;
    }
  }

  return values.get('schema.type') ?? 'unknown';
}

function hasSchemaPropertyTypeEvidence(values) {
  return (
    values.has('$ref') ||
    values.has('type') ||
    values.has('enum') ||
    values.has('items.$ref') ||
    values.has('items.type') ||
    values.has('oneOf') ||
    values.has('anyOf') ||
    values.has('allOf')
  );
}

function formatSchemaPropertySummary(values) {
  const parts = [formatInlineCode(getSchemaPropertyTypeLabel(values))];

  if (values.has('format')) {
    parts.push(`format=${formatInlineCode(values.get('format'))}`);
  }

  if (values.get('nullable') === true) {
    parts.push('nullable');
  }

  return parts.join(', ');
}

function getSchemaPropertyTypeLabel(values) {
  if (values.has('$ref')) {
    return schemaRefName(values.get('$ref'));
  }

  if (values.has('enum')) {
    return `enum(${values.get('enum').map((item) => JSON.stringify(item)).join(', ')})`;
  }

  if (values.get('type') === 'array') {
    if (values.has('items.$ref')) {
      return `${schemaRefName(values.get('items.$ref'))}[]`;
    }

    if (values.has('items.type')) {
      return `${values.get('items.type')}[]`;
    }
  }

  if (values.has('oneOf')) {
    return 'oneOf';
  }

  if (values.has('anyOf')) {
    return 'anyOf';
  }

  if (values.has('allOf')) {
    return 'allOf';
  }

  return values.get('type') ?? 'unknown';
}

function schemaRefName(ref) {
  return String(ref).split('/').at(-1);
}

function toTitleCase(value) {
  const text = String(value ?? '');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : 'Unknown';
}

function formatChangeDetail(detail) {
  const pathLabel = `\`${detail.path}\``;

  if (detail.kind === 'added') {
    return `${pathLabel}: 추가됨 ${formatDetailValue(detail.next)}`;
  }

  if (detail.kind === 'removed') {
    return `${pathLabel}: 제거됨 ${formatDetailValue(detail.previous)}`;
  }

  return `${pathLabel}: ${formatDetailValue(detail.previous)} -> ${formatDetailValue(detail.next)}`;
}

function formatDetailValue(value) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  const normalized = raw === undefined ? 'null' : raw;
  const compact = normalized.replace(/\s+/g, ' ');
  const truncated = compact.length > 140 ? `${compact.slice(0, 137)}...` : compact;
  return formatInlineCode(truncated);
}

function formatInlineCode(value) {
  return `\`${String(value).replace(/`/g, '\\`')}\``;
}

function escapeMarkdownTableCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function diffContractSnapshots(previousSnapshot, nextSnapshot) {
  return diffValues(
    normalizeDiffValue(previousSnapshot),
    normalizeDiffValue(nextSnapshot),
    [],
  );
}

function normalizeDiffValue(value) {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item) => isParameterLikeObject(item))) {
      return Object.fromEntries(
        value
          .map((item) => [`${item.in}.${item.name}`, normalizeDiffValue(item)])
          .sort(([left], [right]) => left.localeCompare(right)),
      );
    }

    if (value.every((item) => isScalarValue(item))) {
      return [...value].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );
    }

    return value.map((item) => normalizeDiffValue(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, normalizeDiffValue(value[key])]),
    );
  }

  return value;
}

function isParameterLikeObject(value) {
  return isPlainObject(value) && typeof value.name === 'string' && typeof value.in === 'string';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isScalarValue(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function diffValues(previousValue, nextValue, pathSegments) {
  if (stableStringify(previousValue) === stableStringify(nextValue)) {
    return [];
  }

  if (isPlainObject(previousValue) && isPlainObject(nextValue)) {
    const keys = new Set([...Object.keys(previousValue), ...Object.keys(nextValue)]);
    return [...keys]
      .sort((left, right) => left.localeCompare(right))
      .flatMap((key) => {
        const nextPath = [...pathSegments, key];
        const hasPrevious = Object.hasOwn(previousValue, key);
        const hasNext = Object.hasOwn(nextValue, key);

        if (!hasPrevious) {
          return collectLeafChanges('added', null, nextValue[key], nextPath);
        }

        if (!hasNext) {
          return collectLeafChanges('removed', previousValue[key], null, nextPath);
        }

        return diffValues(previousValue[key], nextValue[key], nextPath);
      });
  }

  return [
    {
      kind: 'changed',
      path: formatDiffPath(pathSegments),
      previous: previousValue,
      next: nextValue,
    },
  ];
}

function collectLeafChanges(kind, previousValue, nextValue, pathSegments) {
  const targetValue = kind === 'added' ? nextValue : previousValue;

  if (isPlainObject(targetValue)) {
    const entries = Object.entries(targetValue);
    if (entries.length === 0) {
      return [createLeafChange(kind, previousValue, nextValue, pathSegments)];
    }

    return entries.flatMap(([key, child]) =>
      collectLeafChanges(
        kind,
        kind === 'added' ? null : child,
        kind === 'added' ? child : null,
        [...pathSegments, key],
      ),
    );
  }

  return [createLeafChange(kind, previousValue, nextValue, pathSegments)];
}

function createLeafChange(kind, previousValue, nextValue, pathSegments) {
  return {
    kind,
    path: formatDiffPath(pathSegments),
    previous: previousValue,
    next: nextValue,
  };
}

function formatDiffPath(pathSegments) {
  if (pathSegments.length === 0) {
    return '(root)';
  }

  return pathSegments
    .map((segment, index) => {
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
        return index === 0 ? segment : `.${segment}`;
      }

      return `[${JSON.stringify(segment)}]`;
    })
    .join('');
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export { catalogCommand };
