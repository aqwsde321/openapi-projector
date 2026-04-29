import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertValidProjectConfig } from '../config/validation.mjs';

const HTTP_METHOD_ORDER = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
];

const HTTP_METHODS = new Set(HTTP_METHOD_ORDER);
const TOOL_ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_CONFIG_PATH = path.join(TOOL_ROOT_DIR, 'config', 'defaults.jsonc');
const TOOL_LOCAL_CONFIG_FILE_NAMES = [
  '.openapi-projector.local.jsonc',
  '.openapi-tool.local.jsonc',
];
const PROJECT_CONFIG_CANDIDATES = [
  'openapi.config.jsonc',
  'openapi/config/project.jsonc',
  'config/project.jsonc',
];

function isNonBlankString(value) {
  return typeof value === 'string' && value.trim();
}

async function ensureDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
}

async function cleanDir(targetDir, options = {}) {
  const { preserveRoot = true } = options;
  await ensureDir(targetDir);
  const entries = await fs.readdir(targetDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await cleanDir(fullPath, { preserveRoot: false });
      continue;
    }

    if (entry.name === '.gitkeep') {
      continue;
    }

    await fs.rm(fullPath, { force: true });
  }

  if (!preserveRoot) {
    try {
      const remainingEntries = await fs.readdir(targetDir);

      if (remainingEntries.length === 0) {
        await fs.rmdir(targetDir);
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

function stripJsonComments(rawText) {
  let result = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index];
    const nextChar = rawText[index + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        result += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        index += 1;
        continue;
      }

      if (char === '\n') {
        result += char;
      }
      continue;
    }

    if (inString) {
      result += char;

      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    result += char;
  }

  return result;
}

function stripJsonTrailingCommas(rawText) {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (inString) {
      result += char;

      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === ',') {
      let nextIndex = index + 1;
      while (/\s/.test(rawText[nextIndex] ?? '')) {
        nextIndex += 1;
      }

      if (rawText[nextIndex] === '}' || rawText[nextIndex] === ']') {
        continue;
      }
    }

    result += char;
  }

  return result;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(stripJsonTrailingCommas(stripJsonComments(raw)));
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function renderOpenapiGitignore() {
  return [
    '# openapi-projector generated artifacts',
    '_internal/',
    'review/',
    'project/',
    '',
  ].join('\n');
}

function replaceTopLevelJsoncValue(rawText, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`("${escapedKey}"\\s*:\\s*)([^\\n,]+)`, 'm');

  if (!pattern.test(rawText)) {
    return rawText;
  }

  return rawText.replace(pattern, `$1${JSON.stringify(value)}`);
}

function applyTopLevelJsoncOverrides(rawText, overrides) {
  let nextText = rawText;

  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value === undefined) {
      continue;
    }

    nextText = replaceTopLevelJsoncValue(nextText, key, value);
  }

  return nextText;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getByRef(spec, ref) {
  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((current, segment) => current?.[segment], spec);
}

function setByRef(target, ref, value) {
  const segments = ref.replace(/^#\//, '').split('/');
  let cursor = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    cursor[segment] ??= {};
    cursor = cursor[segment];
  }

  cursor[segments.at(-1)] = value;
}

function resolveOpenApiNode(spec, value) {
  if (!value || typeof value !== 'object' || !value.$ref) {
    return value ?? null;
  }

  return getByRef(spec, value.$ref) ?? null;
}

function collectRefs(value, refs = new Set()) {
  if (!value || typeof value !== 'object') {
    return refs;
  }

  if (typeof value.$ref === 'string') {
    refs.add(value.$ref);
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectRefs(item, refs));
    return refs;
  }

  Object.values(value).forEach((item) => collectRefs(item, refs));
  return refs;
}

function normalizeText(text) {
  if (!text) {
    return '';
  }

  return String(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(strong|b|em|i|code)>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toPascalCase(value) {
  const normalized = String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();

  if (!normalized) {
    return 'GeneratedType';
  }

  const result = normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return /^[0-9]/.test(result) ? `Type${result}` : result;
}

function toCamelCase(value) {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(value) {
  const normalized = String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return normalized || 'generated-file';
}

function isValidIdentifier(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

function quotePropertyName(name) {
  return isValidIdentifier(name) ? name : JSON.stringify(name);
}

function escapeComment(text) {
  return String(text).replace(/\*\//g, '*\\/');
}

function schemaRefName(ref) {
  return ref.split('/').at(-1);
}

function buildEndpointIdFromPath(method, endpointPath) {
  const segments = endpointPath
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        return `by-${segment.slice(1, -1)}`;
      }
      return segment;
    });

  return toKebabCase([method, ...segments].join('-'));
}

function createUniqueId(baseId, usedIds) {
  const normalizedBaseId = baseId || 'endpoint';
  let candidate = normalizedBaseId;
  let index = 2;

  while (usedIds.has(candidate)) {
    candidate = `${normalizedBaseId}-${index}`;
    index += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function buildEndpointCatalog(spec) {
  const entries = [];
  const usedIds = new Set();
  const paths = Object.keys(spec.paths ?? {}).sort((left, right) =>
    left.localeCompare(right),
  );

  for (const endpointPath of paths) {
    const pathItem = spec.paths?.[endpointPath] ?? {};

    for (const method of HTTP_METHOD_ORDER) {
      const operation = pathItem?.[method];

      if (!operation) {
        continue;
      }

      const baseId = buildEndpointIdFromPath(method, endpointPath);
      const resolvedSnapshot = buildResolvedEndpointSnapshot(
        spec,
        endpointPath,
        method,
        pathItem,
        operation,
      );
      const contractSnapshot = stripDocOnlyFields(resolvedSnapshot);
      const rawFingerprint = createHash('sha256')
        .update(stableStringify(resolvedSnapshot))
        .digest('hex');
      const contractFingerprint = createHash('sha256')
        .update(stableStringify(contractSnapshot))
        .digest('hex');

      entries.push({
        id: createUniqueId(baseId, usedIds),
        method,
        path: endpointPath,
        summary: normalizeText(operation.summary),
        description: normalizeText(operation.description),
        operationId: operation.operationId ?? null,
        tags: Array.isArray(operation.tags) ? operation.tags : [],
        rawFingerprint,
        contractFingerprint,
        contractSnapshot,
      });
    }
  }

  return entries;
}

function buildResolvedEndpointSnapshot(spec, endpointPath, method, pathItem, operation) {
  const parameters = getOperationParameters(spec, pathItem, operation);
  const resolvedRequestBody = resolveOpenApiNode(spec, operation.requestBody);
  const resolvedResponses = Object.fromEntries(
    Object.entries(operation.responses ?? {}).map(([statusCode, response]) => [
      statusCode,
      resolveOpenApiNode(spec, response),
    ]),
  );
  const schemaNames = collectComponentSchemaClosure(spec, {
    parameters,
    requestBody: resolvedRequestBody,
    responses: resolvedResponses,
  });
  const referencedSchemas = Object.fromEntries(
    schemaNames.map((name) => [name, spec.components?.schemas?.[name] ?? null]),
  );

  return {
    method,
    path: endpointPath,
    operation: {
      ...operation,
      parameters,
      requestBody: resolvedRequestBody,
      responses: resolvedResponses,
    },
    referencedSchemas,
  };
}

function collectComponentSchemaClosure(spec, value) {
  const schemaNames = new Set();
  const pendingRefs = [...collectRefs(value, new Set())];

  while (pendingRefs.length > 0) {
    const ref = pendingRefs.shift();
    if (!ref?.startsWith('#/components/schemas/')) {
      continue;
    }

    const name = schemaRefName(ref);
    if (!name || schemaNames.has(name) || !spec.components?.schemas?.[name]) {
      continue;
    }

    schemaNames.add(name);
    const schema = spec.components.schemas[name];
    for (const nestedRef of collectRefs(schema, new Set())) {
      pendingRefs.push(nestedRef);
    }
  }

  return Array.from(schemaNames).sort((left, right) => left.localeCompare(right));
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

function stripDocOnlyFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripDocOnlyFields(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const stripped = {};

  for (const [key, child] of Object.entries(value)) {
    if (
      key === 'summary' ||
      key === 'description' ||
      key === 'operationId' ||
      key === 'tags' ||
      key === 'externalDocs' ||
      key === 'example' ||
      key === 'examples' ||
      key === 'title' ||
      key === 'deprecated'
    ) {
      continue;
    }

    stripped[key] = stripDocOnlyFields(child);
  }

  return stripped;
}

function escapeMarkdownTableCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function renderEndpointCatalogMarkdown(entries) {
  const lines = [
    '# Endpoint Catalog',
    '',
    '| ID | Method | Path | Summary | Tags |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const entry of entries) {
    lines.push(
      `| \`${entry.id}\` | \`${entry.method.toUpperCase()}\` | \`${entry.path}\` | ${escapeMarkdownTableCell(entry.summary)} | ${escapeMarkdownTableCell(entry.tags.join(', '))} |`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

async function loadProjectConfig(rootDir) {
  const defaults = await readJson(DEFAULT_CONFIG_PATH);
  let projectConfigPath = null;

  for (const candidate of PROJECT_CONFIG_CANDIDATES) {
    const resolved = path.resolve(rootDir, candidate);
    try {
      await fs.access(resolved);
      projectConfigPath = resolved;
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  if (!projectConfigPath) {
    throw new Error(
      `Project config not found.\nRun npx --yes openapi-projector init first.\nSearched:\n- ${PROJECT_CONFIG_CANDIDATES.join('\n- ')}`,
    );
  }

  const projectConfig = {
    ...defaults,
    ...(await readJson(projectConfigPath)),
  };
  assertValidProjectConfig(projectConfig);

  return {
    defaultConfigPath: DEFAULT_CONFIG_PATH,
    projectConfigPath,
    projectConfig,
  };
}

async function findExistingProjectConfig(rootDir) {
  for (const candidate of PROJECT_CONFIG_CANDIDATES) {
    const resolved = path.resolve(rootDir, candidate);
    if (await pathExists(resolved)) {
      return {
        candidate,
        projectConfigPath: resolved,
      };
    }
  }

  return null;
}

async function initProject(rootDir, options = {}) {
  const { force = false, projectConfigOverrides = {} } = options;
  const projectConfigTargetPath = path.resolve(rootDir, 'openapi/config/project.jsonc');
  const projectRulesTemplatePath = path.join(TOOL_ROOT_DIR, 'templates', 'project-rules.jsonc');
  const projectConfigTemplatePath = path.join(TOOL_ROOT_DIR, 'templates', 'project.jsonc');
  const projectReadmeTemplatePath = path.join(TOOL_ROOT_DIR, 'templates', 'project-readme.md');
  const projectRulesPath = path.resolve(rootDir, 'openapi/config/project-rules.jsonc');
  const projectReadmePath = path.resolve(rootDir, 'openapi/README.md');
  const openapiGitignorePath = path.resolve(rootDir, 'openapi/.gitignore');
  const existingProjectConfig = await findExistingProjectConfig(rootDir);
  const projectConfigExisted = existingProjectConfig?.projectConfigPath === projectConfigTargetPath;

  if (existingProjectConfig && !projectConfigExisted) {
    throw new Error(
      [
        `Project config already exists: ${existingProjectConfig.projectConfigPath}`,
        `This config has priority over ${projectConfigTargetPath}.`,
        'Edit or remove the existing config before running init.',
      ].join('\n'),
    );
  }

  if (existingProjectConfig && !force) {
    throw new Error(
      `Project config already exists: ${projectConfigTargetPath}\nRe-run with --force to reinitialize bootstrap files.`,
    );
  }

  const [projectConfigTemplate, projectRulesTemplate, projectReadmeTemplate] = await Promise.all([
    fs.readFile(projectConfigTemplatePath, 'utf8'),
    fs.readFile(projectRulesTemplatePath, 'utf8'),
    fs.readFile(projectReadmeTemplatePath, 'utf8'),
  ]);

  const projectConfigContents =
    Object.keys(projectConfigOverrides).length > 0
      ? applyTopLevelJsoncOverrides(projectConfigTemplate, projectConfigOverrides)
      : projectConfigTemplate;

  await writeText(projectConfigTargetPath, projectConfigContents);

  const projectRulesExisted = await pathExists(projectRulesPath);
  if (force || !projectRulesExisted) {
    await writeText(projectRulesPath, projectRulesTemplate);
  }

  const openapiGitignoreExisted = await pathExists(openapiGitignorePath);
  if (force || !openapiGitignoreExisted) {
    await writeText(openapiGitignorePath, renderOpenapiGitignore());
  }

  await ensureDir(path.resolve(rootDir, 'openapi/review'));
  await ensureDir(path.resolve(rootDir, 'openapi/project'));
  await ensureDir(path.resolve(rootDir, 'openapi/_internal/source'));

  const projectReadmeExisted = await pathExists(projectReadmePath);
  if (force || !projectReadmeExisted) {
    await writeText(projectReadmePath, projectReadmeTemplate);
  }

  return {
    projectConfigTargetPath,
    projectConfigCreated: !projectConfigExisted,
    projectConfigOverwritten: force && projectConfigExisted,
    projectReadmePath,
    projectReadmeCreated: !projectReadmeExisted,
    projectReadmeOverwritten: force && projectReadmeExisted,
    openapiGitignorePath,
  };
}

function renderToolLocalConfig() {
  return `{
  // 이 파일은 실행한 프론트엔드 프로젝트 루트 기준 로컬 설정입니다.
  // 보통 projectRoot 는 현재 디렉터리를 뜻하는 "." 그대로 둡니다.
  "projectRoot": "."
}
`;
}

async function ensureGitignoreEntry(rootDir, entry) {
  const gitignorePath = path.resolve(rootDir, '.gitignore');
  let contents = '';

  try {
    contents = await fs.readFile(gitignorePath, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  const lines = contents.split(/\r?\n/);
  if (lines.includes(entry)) {
    return { gitignorePath, updated: false };
  }

  const prefix = contents && !contents.endsWith('\n') ? '\n' : '';
  const section = contents.includes('# openapi-projector')
    ? `${entry}\n`
    : `# openapi-projector\n${entry}\n`;
  await writeText(gitignorePath, `${contents}${prefix}${section}`);
  return { gitignorePath, updated: true };
}

async function initToolLocalConfig(rootDir) {
  const toolLocalConfigPath = path.resolve(rootDir, '.openapi-projector.local.jsonc');
  let created = false;

  if (!(await pathExists(toolLocalConfigPath))) {
    await writeText(toolLocalConfigPath, renderToolLocalConfig());
    created = true;
  }

  const gitignoreResult = await ensureGitignoreEntry(rootDir, '.openapi-projector.local.jsonc');

  return {
    toolLocalConfigPath,
    created,
    gitignorePath: gitignoreResult.gitignorePath,
    gitignoreUpdated: gitignoreResult.updated,
  };
}

async function loadProjectRules(rootDir, projectConfig) {
  const projectRulesPath = path.resolve(
    rootDir,
    projectConfig.projectRulesPath ?? 'openapi/config/project-rules.jsonc',
  );
  const projectRules = await readJson(projectRulesPath);

  return {
    projectRulesPath,
    projectRules,
  };
}

function buildToolLocalConfigCandidates(rootDir) {
  return TOOL_LOCAL_CONFIG_FILE_NAMES.map((fileName) => path.resolve(rootDir, fileName));
}

async function loadToolLocalConfig(rootDir = process.cwd()) {
  const toolLocalConfigCandidates = buildToolLocalConfigCandidates(rootDir);
  const foundConfigs = [];

  for (const candidatePath of toolLocalConfigCandidates) {
    try {
      const toolLocalConfig = await readJson(candidatePath);
      foundConfigs.push({
        toolLocalConfigPath: candidatePath,
        toolLocalConfig,
      });

      if (isNonBlankString(toolLocalConfig?.projectRoot)) {
        return {
          toolLocalConfigPath: candidatePath,
          toolLocalConfig,
          toolLocalConfigCandidates,
          toolLocalConfigs: foundConfigs,
        };
      }
    } catch (error) {
      if (error?.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  const selectedConfig = foundConfigs[0] ?? null;

  if (selectedConfig) {
    return {
      ...selectedConfig,
      toolLocalConfigCandidates,
      toolLocalConfigs: foundConfigs,
    };
  }

  return {
    toolLocalConfigPath: toolLocalConfigCandidates[0],
    toolLocalConfig: null,
    toolLocalConfigCandidates,
    toolLocalConfigs: [],
  };
}

function createTypeRenderer(refFormatter) {
  const hasUnionMember = (renderedType, memberName) =>
    renderedType
      .split('|')
      .map((part) => part.trim())
      .includes(memberName);
  const wrapCompositeArrayItem = (renderedType) =>
    renderedType.includes(' | ') || renderedType.includes(' & ')
      ? `(${renderedType})`
      : renderedType;
  const withNullable = (schema, renderedType) => {
    if (!schema?.nullable) {
      return renderedType;
    }

    return hasUnionMember(renderedType, 'null') ? renderedType : `${renderedType} | null`;
  };

  const renderType = (schema) => {
    if (!schema) {
      return 'unknown';
    }

    if (schema.$ref) {
      return withNullable(schema, refFormatter(schemaRefName(schema.$ref)));
    }

    if (schema.oneOf) {
      return withNullable(schema, schema.oneOf.map((item) => renderType(item)).join(' | '));
    }

    if (schema.anyOf) {
      return withNullable(schema, schema.anyOf.map((item) => renderType(item)).join(' | '));
    }

    if (schema.allOf) {
      return withNullable(schema, schema.allOf.map((item) => renderType(item)).join(' & '));
    }

    if (schema.enum) {
      const literals = schema.enum.map((item) => JSON.stringify(item));
      const union = literals.join(' | ');
      return withNullable(schema, union);
    }

    if (Array.isArray(schema.type)) {
      const renderedTypes = schema.type.map((typeName) => {
        if (typeName === 'null') {
          return 'null';
        }

        return renderType({
          ...schema,
          type: typeName,
          nullable: false,
        });
      });

      if (schema.nullable) {
        renderedTypes.push('null');
      }

      return Array.from(new Set(renderedTypes)).join(' | ');
    }

    if (schema.type === 'string' && schema.format === 'binary') {
      return withNullable(schema, 'File');
    }

    let result = 'unknown';

    switch (schema.type) {
      case 'string':
        result = 'string';
        break;
      case 'integer':
      case 'number':
        result = 'number';
        break;
      case 'boolean':
        result = 'boolean';
        break;
      case 'array':
        result = `${wrapCompositeArrayItem(renderType(schema.items))}[]`;
        break;
      case 'object':
        result = renderObject(schema);
        break;
      default:
        if (schema.properties || schema.additionalProperties) {
          result = renderObject(schema);
        } else {
          result = 'unknown';
        }
        break;
    }

    return withNullable(schema, result);
  };

  const renderObject = (schema) => {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const lines = ['{'];

    for (const [propName, propSchema] of Object.entries(properties)) {
      const optionalFlag = required.has(propName) ? '' : '?';
      lines.push(
        `  ${quotePropertyName(propName)}${optionalFlag}: ${renderType(propSchema)};`,
      );
    }

    if (schema.additionalProperties) {
      lines.push(
        `  [key: string]: ${renderType(schema.additionalProperties)};`,
      );
    }

    if (lines.length === 1) {
      lines.push('  [key: string]: unknown;');
    }

    lines.push('}');
    return lines.join('\n');
  };

  return { renderType };
}

function findPrimaryResponse(responses = {}) {
  const priorities = ['200', '201', '202', '204', '2XX'];

  for (const status of priorities) {
    if (responses[status]) {
      return [status, responses[status]];
    }
  }

  const explicitSuccessEntry = Object.entries(responses)
    .filter(([status]) => /^2\d\d$/.test(status))
    .sort(([left], [right]) => Number(left) - Number(right))[0];

  return explicitSuccessEntry ?? [null, null];
}

function normalizeMediaType(mediaType) {
  return typeof mediaType === 'string'
    ? mediaType.split(';', 1)[0].trim().toLowerCase()
    : '';
}

function isJsonLikeMediaType(mediaType) {
  const normalized = normalizeMediaType(mediaType);

  return (
    normalized === 'application/json' ||
    normalized === '*/*' ||
    normalized.endsWith('+json')
  );
}

function isMultipartMediaType(mediaType) {
  return normalizeMediaType(mediaType) === 'multipart/form-data';
}

function getMediaTypePriority(mediaType, options = {}) {
  const normalized = normalizeMediaType(mediaType);

  if (normalized === 'application/json') {
    return 0;
  }

  if (normalized.endsWith('+json')) {
    return 1;
  }

  if (normalized === '*/*') {
    return 2;
  }

  if (options.allowMultipart && normalized === 'multipart/form-data') {
    return 3;
  }

  return null;
}

function choosePreferredMediaType(mediaTypes, options = {}) {
  const candidates = mediaTypes
    .map((mediaType) => ({
      mediaType,
      normalized: normalizeMediaType(mediaType),
      priority: getMediaTypePriority(mediaType, options),
    }))
    .filter((candidate) => candidate.priority != null)
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        left.normalized.localeCompare(right.normalized) ||
        String(left.mediaType).localeCompare(String(right.mediaType)),
    );

  return candidates[0]?.mediaType ?? null;
}

function choosePreferredRequestMediaType(mediaTypes) {
  return choosePreferredMediaType(mediaTypes, { allowMultipart: true });
}

function choosePreferredResponseMediaType(mediaTypes) {
  return choosePreferredMediaType(mediaTypes);
}

function getContentSchema(content, preferredMediaType, chooseMediaType) {
  if (preferredMediaType && content[preferredMediaType]) {
    return content[preferredMediaType]?.schema ?? null;
  }

  const mediaTypes = Object.keys(content);
  const selectedMediaType = chooseMediaType(mediaTypes) ?? mediaTypes[0];
  return selectedMediaType ? content[selectedMediaType]?.schema ?? null : null;
}

function getResponseSchema(spec, response, preferredMediaType = null) {
  const resolvedResponse = response?.$ref ? getByRef(spec, response.$ref) : response;
  const content = resolvedResponse?.content ?? {};
  return getContentSchema(content, preferredMediaType, choosePreferredResponseMediaType);
}

function getRequestBodySchema(spec, requestBody, preferredMediaType = null) {
  const resolvedBody = requestBody?.$ref ? getByRef(spec, requestBody.$ref) : requestBody;
  const content = resolvedBody?.content ?? {};
  return getContentSchema(content, preferredMediaType, choosePreferredRequestMediaType);
}

function getRequestBodyMediaType(spec, requestBody) {
  const resolvedBody = requestBody?.$ref ? getByRef(spec, requestBody.$ref) : requestBody;
  const content = resolvedBody?.content ?? {};
  return choosePreferredRequestMediaType(Object.keys(content)) ?? Object.keys(content)[0] ?? null;
}

function getOperationParameters(spec, pathItem, operation) {
  const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])];

  return parameters.map((parameter) =>
    parameter.$ref ? getByRef(spec, parameter.$ref) : parameter,
  );
}

function collectSchemaRefsFromOperation(spec, pathItem, operation) {
  const refs = new Set();
  collectRefs(pathItem.parameters ?? [], refs);
  collectRefs(operation, refs);

  const requestSchema = getRequestBodySchema(spec, operation.requestBody);
  if (requestSchema) {
    collectRefs(requestSchema, refs);
  }

  for (const response of Object.values(operation.responses ?? {})) {
    const responseSchema = getResponseSchema(spec, response);
    if (responseSchema) {
      collectRefs(responseSchema, refs);
    }
  }

  return Array.from(refs)
    .map((ref) => schemaRefName(ref))
    .filter((name) => spec.components?.schemas?.[name]);
}

export {
  HTTP_METHODS,
  HTTP_METHOD_ORDER,
  buildEndpointCatalog,
  choosePreferredRequestMediaType,
  choosePreferredResponseMediaType,
  collectRefs,
  collectSchemaRefsFromOperation,
  cleanDir,
  createTypeRenderer,
  deepClone,
  ensureDir,
  escapeComment,
  findPrimaryResponse,
  getByRef,
  getOperationParameters,
  getRequestBodyMediaType,
  getRequestBodySchema,
  getResponseSchema,
  initProject,
  initToolLocalConfig,
  isJsonLikeMediaType,
  isMultipartMediaType,
  isValidIdentifier,
  loadProjectConfig,
  loadProjectRules,
  loadToolLocalConfig,
  normalizeText,
  quotePropertyName,
  readJson,
  renderEndpointCatalogMarkdown,
  schemaRefName,
  setByRef,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  writeJson,
  writeText,
};
