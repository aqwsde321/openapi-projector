import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { rulesCommand } from '../src/commands/rules.mjs';
import { readJson } from '../src/core/openapi-utils.mjs';
import { analyzeProject } from '../src/project-analyzer/index.mjs';

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeTextFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}

async function withTempProject(callback) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-analyzer-'));
  try {
    return await callback(workspace);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

async function writeProjectConfig(workspace) {
  await writeJsonFile(path.join(workspace, 'openapi/config/project.jsonc'), {
    sourceUrl: '',
    sourcePath: 'openapi/_internal/source/openapi.json',
    catalogJsonPath: 'openapi/review/catalog/endpoints.json',
    catalogMarkdownPath: 'openapi/review/catalog/endpoints.md',
    docsDir: 'openapi/review/docs',
    generatedSchemaPath: 'openapi/review/generated/schema.ts',
    projectRulesAnalysisPath: 'openapi/review/project-rules/analysis.md',
    projectRulesAnalysisJsonPath: 'openapi/review/project-rules/analysis.json',
    projectRulesPath: 'openapi/config/project-rules.jsonc',
    projectGeneratedSrcDir: 'openapi/project/src/openapi-generated',
  });
}

function defaultProjectRulesTemplate() {
  return `{
  // MVP v2 project-rules template 입니다.
  "api": {
    "fetchApiImportPath": "@/shared/api",
    "fetchApiSymbol": "fetchAPI",
    "fetchApiImportKind": "named",
    "adapterStyle": "url-config",
    // "tag" creates tag folders. "flat" writes endpoint files directly under the generated root.
    "wrapperGrouping": "tag",
    "tagFileCase": "title"
  },
  "layout": {
    "schemaFileName": "schema.ts"
  }
}
`;
}

function legacyProjectRulesTemplate() {
  return `{
  // MVP v2 project-rules template 입니다.
  "api": {
    "fetchApiImportPath": "@/shared/api",
    "fetchApiSymbol": "fetchAPI",
    "adapterStyle": "url-config",
    // "tag" creates tag folders. "flat" writes endpoint files directly under the generated root.
    "wrapperGrouping": "tag",
    "tagFileCase": "title"
  },
  "layout": {
    "schemaFileName": "schema.ts"
  }
}
`;
}

test('analyzeProject detects helpers, call style, API layer, and naming evidence', async () => {
  await withTempProject(async (workspace) => {
    await writeJsonFile(path.join(workspace, 'package.json'), {
      dependencies: {
        axios: '^1.0.0',
      },
    });
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import { fetchAPI as callApi } from '@/shared/http';",
        '',
        'export interface UserResponse {',
        '  id: string;',
        '}',
        '',
        'export async function fetchUser(): Promise<UserResponse> {',
        "  return callApi('/users', { method: 'GET' });",
        '}',
        '',
      ].join('\n'),
    );
    await writeTextFile(
      path.join(workspace, 'src/features/orders/api.ts'),
      [
        "import { request } from '@/shared/request';",
        '',
        'export type CreateOrderPayload = { id: string };',
        '',
        'export const createOrder = () => request({ url: \'/orders\', method: \'POST\' });',
        'export const updateOrder = () => request({ url: \'/orders/1\', method: \'PATCH\' });',
        '',
      ].join('\n'),
    );

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.equal(analysis.generatedAt, '2026-04-28T00:00:00.000Z');
    assert.equal(analysis.files.scanned, 2);
    assert.deepEqual(analysis.files.roots, ['src']);
    assert.equal(analysis.files.analysisRoot, 'src');
    assert.deepEqual(analysis.files.sections, [
      {
        section: 'src/features',
        count: 2,
      },
    ]);
    assert.equal(analysis.httpClient.value, 'axios');
    assert.ok(analysis.httpClient.confidence > 0.5);
    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@/shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assert.ok(analysis.apiHelper.confidence > 0.7);
    assert.ok(
      analysis.apiHelper.evidence.some((item) =>
        item.reason.includes('imports API helper request from @/shared/request'),
      ),
    );
    assert.deepEqual(analysis.legacy.fetchApiImportStats, [
      {
        importPath: '@/shared/http',
        count: 1,
      },
    ]);
    assert.deepEqual(analysis.apiLayer.value.baseDirs, ['src/features/*/api']);
    assert.equal(analysis.apiLayer.value.style, 'function');
    assert.deepEqual(analysis.naming.value.functionPrefixes, ['create', 'fetch', 'update']);
    assert.deepEqual(analysis.naming.value.dtoSuffixes, ['Payload', 'Response']);
  });
});

test('analyzeProject ignores unrelated imported function calls when selecting helper', async () => {
  await withTempProject(async (workspace) => {
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import { useQuery } from '@tanstack/react-query';",
        "import { clsx } from 'clsx';",
        "import { request } from '@/shared/request';",
        '',
        'export const buildClassName = () => {',
        "  clsx('one');",
        "  clsx('two');",
        "  clsx('three');",
        "  clsx('four');",
        "  return clsx('five');",
        '};',
        '',
        'export const useUsers = () =>',
        '  useQuery({',
        "    queryKey: ['users'],",
        "    queryFn: () => request({ url: '/users', method: 'GET' }),",
        '  });',
        '',
      ].join('\n'),
    );

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@/shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assert.ok(
      analysis.apiHelper.evidence.every((item) => !item.reason.includes('clsx')),
    );
  });
});

test('analyzeProject derives call style from the selected helper only', async () => {
  await withTempProject(async (workspace) => {
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        "export const createUser = () => apiClient.post('/users');",
        '',
      ].join('\n'),
    );
    await writeTextFile(
      path.join(workspace, 'src/features/orders/api.ts'),
      [
        "import { request } from '@/shared/request';",
        '',
        "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
        '',
      ].join('\n'),
    );

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'apiClient',
      importPath: '@/shared/api-client',
      importKind: 'default',
      callStyle: 'unknown',
    });
    assert.ok(
      analysis.warnings.some((warning) => warning.code === 'unknown-api-helper-call-style'),
    );
  });
});

test('analyzeProject warns when selected helper mixes supported and member call styles', async () => {
  await withTempProject(async (workspace) => {
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient('/users', { method: 'GET' });",
        "export const loadUser = () => apiClient.get('/users/1');",
        '',
      ].join('\n'),
    );

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'apiClient',
      importPath: '@/shared/api-client',
      importKind: 'default',
      callStyle: 'url-config',
    });
    assert.equal(analysis.apiHelper.hasUnknownCallStyle, true);
    assert.deepEqual(analysis.apiHelper.callStyles, [
      {
        value: 'unknown',
        count: 1,
      },
      {
        value: 'url-config',
        count: 1,
      },
    ]);
    assert.ok(
      analysis.warnings.some((warning) => warning.code === 'unknown-api-helper-call-style'),
    );
  });
});

test('analyzeProject normalizes relative helper imports with the most specific path alias', async () => {
  await withTempProject(async (workspace) => {
    await writeJsonFile(path.join(workspace, 'tsconfig.json'), {
      files: [],
      references: [
        {
          path: './tsconfig.app.json',
        },
      ],
    });
    await writeJsonFile(path.join(workspace, 'tsconfig.app.json'), {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '@shared/*': ['src/shared/*'],
        },
      },
    });
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import { request } from '../../shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.deepEqual(analysis.pathAliases, {
      configPath: 'tsconfig.app.json',
      mappings: [
        {
          aliasPattern: '@shared/*',
          aliasPrefix: '@shared/',
          targetPattern: 'src/shared/*',
          targetPrefix: 'src/shared/',
        },
        {
          aliasPattern: '@/*',
          aliasPrefix: '@/',
          targetPattern: 'src/*',
          targetPrefix: 'src/',
        },
      ],
    });
    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assert.ok(
      analysis.apiHelper.evidence.some((item) =>
        item.reason.includes('normalized from ../../shared/request'),
      ),
    );
  });
});

test('rules scaffolds import path, symbol, and kind from the same helper candidate', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import { fetchAPI } from '@/shared/http';",
        '',
        "export const fetchUser = () => fetchAPI('/users', { method: 'GET' });",
        '',
      ].join('\n'),
    );
    await writeTextFile(
      path.join(workspace, 'src/features/orders/api.ts'),
      [
        "import { request } from '@/shared/request';",
        '',
        "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
        "export const updateOrder = () => request({ url: '/orders/1', method: 'PATCH' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.match(rulesSource, /"fetchApiSymbol": "request"/);
    assert.match(rulesSource, /"fetchApiImportKind": "named"/);
    assert.match(rulesSource, /"adapterStyle": "request-object"/);
    assert.doesNotMatch(rulesSource, /"fetchApiImportPath": "@\/shared\/http"/);
  });
});

test('rules does not mix local helper symbols with imported fallback paths', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import { fetchAPI } from '@/shared/http';",
        '',
        'function request(url, config) {',
        '  return Promise.resolve({ url, config });',
        '}',
        '',
        "export const loadUsers = () => request('/users', { method: 'GET' });",
        "export const loadUser = () => request('/users/1', { method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const analysis = JSON.parse(
      await fs.readFile(
        path.join(workspace, 'openapi/review/project-rules/analysis.json'),
        'utf8',
      ),
    );
    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.equal(analysis.apiHelper.value.importPath, '<local>');
    assert.equal(analysis.apiHelper.value.symbol, 'request');
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/http"/);
    assert.match(rulesSource, /"fetchApiSymbol": "fetchAPI"/);
    assert.doesNotMatch(rulesSource, /"fetchApiSymbol": "request"/);
  });
});

test('analyzeProject scans all src sections even when src/entities exists', async () => {
  await withTempProject(async (workspace) => {
    await writeTextFile(
      path.join(workspace, 'src/entities/user/model.ts'),
      'export interface UserResponse { id: string }\n',
    );
    await writeTextFile(
      path.join(workspace, 'src/shared/api/request.ts'),
      [
        "export const request = (options: { url: string; method: string }) => options;",
        '',
      ].join('\n'),
    );
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    const analysis = await analyzeProject(workspace, {
      generatedAt: '2026-04-28T00:00:00.000Z',
    });

    assert.equal(analysis.files.scanned, 3);
    assert.deepEqual(analysis.files.roots, ['src']);
    assert.deepEqual(analysis.files.sections, [
      {
        section: 'src/entities',
        count: 1,
      },
      {
        section: 'src/features',
        count: 1,
      },
      {
        section: 'src/shared',
        count: 1,
      },
    ]);
    assert.equal(analysis.apiHelper.value.importPath, '@/shared/request');
  });
});

test('rules scaffolds default import helper kind and leaves review unconfirmed', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient('/users', { method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const analysis = JSON.parse(
      await fs.readFile(
        path.join(workspace, 'openapi/review/project-rules/analysis.json'),
        'utf8',
      ),
    );
    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'apiClient',
      importPath: '@/shared/api-client',
      importKind: 'default',
      callStyle: 'url-config',
    });
    assert.match(rulesSource, /"rulesReviewed": false/);
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/api-client"/);
    assert.match(rulesSource, /"fetchApiSymbol": "apiClient"/);
    assert.match(rulesSource, /"fetchApiImportKind": "default"/);
  });
});

test('rules records a review note when helper call style is unknown', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      path.join(workspace, 'src/features/users/api.ts'),
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const analysisMarkdown = await fs.readFile(
      path.join(workspace, 'openapi/review/project-rules/analysis.md'),
      'utf8',
    );
    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.match(analysisMarkdown, /unknown-api-helper-call-style/);
    assert.match(rulesSource, /adapterStyle was defaulted to url-config/);
    assert.match(rulesSource, /"rulesReviewed": false/);
  });
});

test('rules refreshes automatic scaffold even when generated review notes exist', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const apiFilePath = path.join(workspace, 'src/features/users/api.ts');
    await writeTextFile(
      apiFilePath,
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    let rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );
    assert.match(rulesSource, /adapterStyle was defaulted to url-config/);
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/api-client"/);

    await writeTextFile(
      apiFilePath,
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.match(rulesSource, /"fetchApiSymbol": "request"/);
    assert.match(rulesSource, /"adapterStyle": "request-object"/);
    assert.doesNotMatch(rulesSource, /adapterStyle was defaulted to url-config/);
  });
});

test('rules refreshes generated warning scaffold even when previous analysis JSON is missing', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const apiFilePath = path.join(workspace, 'src/features/users/api.ts');
    const analysisJsonPath = path.join(workspace, 'openapi/review/project-rules/analysis.json');
    await writeTextFile(
      apiFilePath,
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });
    await fs.rm(analysisJsonPath, { force: true });

    await writeTextFile(
      apiFilePath,
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.match(rulesSource, /"fetchApiSymbol": "request"/);
    assert.match(rulesSource, /"adapterStyle": "request-object"/);
    assert.doesNotMatch(rulesSource, /api-client/);
    assert.doesNotMatch(rulesSource, /adapterStyle was defaulted to url-config/);
  });
});

test('rules refreshes signed scaffold without warning notes when previous analysis JSON is missing', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const apiFilePath = path.join(workspace, 'src/features/users/api.ts');
    const analysisJsonPath = path.join(workspace, 'openapi/review/project-rules/analysis.json');
    await writeTextFile(
      apiFilePath,
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });
    await fs.rm(analysisJsonPath, { force: true });

    await writeTextFile(
      apiFilePath,
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient('/users', { method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/api-client"/);
    assert.match(rulesSource, /"fetchApiSymbol": "apiClient"/);
    assert.match(rulesSource, /"adapterStyle": "url-config"/);
    assert.doesNotMatch(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
  });
});

test('rules refreshes signed scaffold when previous analysis JSON is stale', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const apiFilePath = path.join(workspace, 'src/features/users/api.ts');
    const analysisJsonPath = path.join(workspace, 'openapi/review/project-rules/analysis.json');
    await writeTextFile(
      apiFilePath,
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient('/users', { method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const staleAnalysis = await readJson(analysisJsonPath);
    await writeJsonFile(analysisJsonPath, {
      ...staleAnalysis,
      apiHelper: {
        ...staleAnalysis.apiHelper,
        value: {
          symbol: 'staleRequest',
          importPath: '@/stale/request',
          importKind: 'named',
          callStyle: 'request-object',
        },
      },
      warnings: [],
      legacy: {
        fetchApiImportStats: [],
      },
    });

    await writeTextFile(
      apiFilePath,
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.match(rulesSource, /"fetchApiSymbol": "request"/);
    assert.match(rulesSource, /"adapterStyle": "request-object"/);
    assert.doesNotMatch(rulesSource, /"fetchApiImportPath": "@\/shared\/api-client"/);
    assert.doesNotMatch(rulesSource, /"fetchApiImportPath": "@\/stale\/request"/);
  });
});

test('rules preserves legacy generated warning scaffold without signature', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const apiFilePath = path.join(workspace, 'src/features/users/api.ts');
    const analysisJsonPath = path.join(workspace, 'openapi/review/project-rules/analysis.json');
    const rulesPath = path.join(workspace, 'openapi/config/project-rules.jsonc');
    await writeTextFile(
      apiFilePath,
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const signedRulesSource = await fs.readFile(rulesPath, 'utf8');
    await writeTextFile(
      rulesPath,
      signedRulesSource.replace(/\n    "scaffoldSignature": "[^"]+",/, ''),
    );
    await fs.rm(analysisJsonPath, { force: true });

    await writeTextFile(
      apiFilePath,
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(rulesPath, 'utf8');
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/api-client"/);
    assert.match(rulesSource, /"fetchApiSymbol": "apiClient"/);
    assert.match(rulesSource, /adapterStyle was defaulted to url-config/);
    assert.doesNotMatch(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.doesNotMatch(rulesSource, /"fetchApiSymbol": "request"/);
  });
});

test('rules preserves manual edits on legacy warning scaffold without signature', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const apiFilePath = path.join(workspace, 'src/features/users/api.ts');
    const analysisJsonPath = path.join(workspace, 'openapi/review/project-rules/analysis.json');
    const rulesPath = path.join(workspace, 'openapi/config/project-rules.jsonc');
    await writeTextFile(
      apiFilePath,
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const signedRules = await readJson(rulesPath);
    delete signedRules.review.scaffoldSignature;
    await writeJsonFile(rulesPath, {
      ...signedRules,
      api: {
        ...signedRules.api,
        fetchApiImportPath: '@/manual/api',
        fetchApiSymbol: 'manualRequest',
      },
    });
    await fs.rm(analysisJsonPath, { force: true });

    await writeTextFile(
      apiFilePath,
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(rulesPath, 'utf8');
    assert.match(rulesSource, /"fetchApiImportPath": "@\/manual\/api"/);
    assert.match(rulesSource, /"fetchApiSymbol": "manualRequest"/);
    assert.doesNotMatch(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.doesNotMatch(rulesSource, /"fetchApiSymbol": "request"/);
  });
});

test('rules preserves manual API edits when generated warning scaffold signature no longer matches', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const apiFilePath = path.join(workspace, 'src/features/users/api.ts');
    const analysisJsonPath = path.join(workspace, 'openapi/review/project-rules/analysis.json');
    const rulesPath = path.join(workspace, 'openapi/config/project-rules.jsonc');
    await writeTextFile(
      apiFilePath,
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient.get('/users');",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const generatedRules = await readJson(rulesPath);
    assert.equal(typeof generatedRules.review.scaffoldSignature, 'string');
    await fs.rm(analysisJsonPath, { force: true });
    await writeJsonFile(rulesPath, {
      ...generatedRules,
      api: {
        ...generatedRules.api,
        fetchApiImportPath: '@/manual/api',
        fetchApiSymbol: 'manualRequest',
      },
    });

    await writeTextFile(
      apiFilePath,
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(rulesPath, 'utf8');
    assert.match(rulesSource, /"fetchApiImportPath": "@\/manual\/api"/);
    assert.match(rulesSource, /"fetchApiSymbol": "manualRequest"/);
    assert.doesNotMatch(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.doesNotMatch(rulesSource, /"fetchApiSymbol": "request"/);
  });
});

test('rules preserves unreviewed manual edits instead of treating them as scaffold', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    const apiFilePath = path.join(workspace, 'src/features/users/api.ts');
    const rulesPath = path.join(workspace, 'openapi/config/project-rules.jsonc');
    await writeTextFile(
      apiFilePath,
      [
        "import apiClient from '@/shared/api-client';",
        '',
        "export const loadUsers = () => apiClient('/users', { method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    await writeJsonFile(rulesPath, {
      review: {
        rulesReviewed: false,
        notes: ['manual edits are pending review'],
      },
      api: {
        fetchApiImportPath: '@/manual/api',
        fetchApiSymbol: 'manualRequest',
        fetchApiImportKind: 'named',
        adapterStyle: 'request-object',
        wrapperGrouping: 'tag',
        tagFileCase: 'kebab',
      },
      layout: {
        schemaFileName: 'schema.ts',
        apiDirName: 'client',
      },
    });

    await writeTextFile(
      apiFilePath,
      [
        "import { request } from '@/shared/request';",
        '',
        "export const loadUsers = () => request({ url: '/users', method: 'GET' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(rulesPath, 'utf8');
    assert.match(rulesSource, /"fetchApiImportPath": "@\/manual\/api"/);
    assert.match(rulesSource, /"fetchApiSymbol": "manualRequest"/);
    assert.match(rulesSource, /"adapterStyle": "request-object"/);
    assert.match(rulesSource, /"tagFileCase": "kebab"/);
    assert.match(rulesSource, /manual edits are pending review/);
    assert.doesNotMatch(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
  });
});

test('rules writes analysis JSON and scaffolds custom request helper defaults', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      path.join(workspace, 'src/features/orders/api.ts'),
      [
        "import { request } from '@/shared/request';",
        '',
        'export const createOrder = () => request({ url: \'/orders\', method: \'POST\' });',
        'export const updateOrder = () => request({ url: \'/orders/1\', method: \'PATCH\' });',
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const analysis = JSON.parse(
      await fs.readFile(
        path.join(workspace, 'openapi/review/project-rules/analysis.json'),
        'utf8',
      ),
    );
    const analysisMarkdown = await fs.readFile(
      path.join(workspace, 'openapi/review/project-rules/analysis.md'),
      'utf8',
    );
    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.equal(analysis.files.scanned, 1);
    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@/shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assert.match(analysisMarkdown, /Analysis JSON: `openapi\/review\/project-rules\/analysis\.json`/);
    assert.match(analysisMarkdown, /## API helper candidate/);
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.match(rulesSource, /"fetchApiSymbol": "request"/);
    assert.match(rulesSource, /"fetchApiImportKind": "named"/);
    assert.match(rulesSource, /"adapterStyle": "request-object"/);
  });
});

test('rules refreshes untouched init template with analyzed helper defaults', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      defaultProjectRulesTemplate(),
    );
    await writeTextFile(
      path.join(workspace, 'src/features/orders/api.ts'),
      [
        "import { request } from '@/shared/request';",
        '',
        "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.match(rulesSource, /분석 문서: openapi\/review\/project-rules\/analysis\.md/);
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.match(rulesSource, /"fetchApiSymbol": "request"/);
    assert.match(rulesSource, /"fetchApiImportKind": "named"/);
    assert.match(rulesSource, /"adapterStyle": "request-object"/);
    assert.match(rulesSource, /"apiDirName": "apis"/);
    assert.doesNotMatch(rulesSource, /project-rules template/);
  });
});

test('rules refreshes legacy untouched scaffold without import kind or review gate', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      legacyProjectRulesTemplate(),
    );
    await writeTextFile(
      path.join(workspace, 'src/features/orders/api.ts'),
      [
        "import { request } from '@/shared/request';",
        '',
        "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.match(rulesSource, /"rulesReviewed": false/);
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.match(rulesSource, /"fetchApiSymbol": "request"/);
    assert.match(rulesSource, /"fetchApiImportKind": "named"/);
    assert.match(rulesSource, /"adapterStyle": "request-object"/);
    assert.match(rulesSource, /"apiDirName": "apis"/);
    assert.doesNotMatch(rulesSource, /project-rules template/);
  });
});

test('rules preserves customized project rules while writing analysis outputs', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeJsonFile(path.join(workspace, 'openapi/config/project-rules.jsonc'), {
      api: {
        fetchApiImportPath: '@/custom/api',
        fetchApiSymbol: 'customFetch',
        adapterStyle: 'url-config',
        wrapperGrouping: 'tag',
        tagFileCase: 'title',
      },
      layout: {
        schemaFileName: 'custom-schema.ts',
      },
    });
    await writeTextFile(
      path.join(workspace, 'src/features/orders/api.ts'),
      [
        "import { request } from '@/shared/request';",
        '',
        "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const analysis = JSON.parse(
      await fs.readFile(
        path.join(workspace, 'openapi/review/project-rules/analysis.json'),
        'utf8',
      ),
    );
    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@/shared/request',
      importKind: 'named',
      callStyle: 'request-object',
    });
    assert.match(rulesSource, /"fetchApiImportPath": "@\/custom\/api"/);
    assert.match(rulesSource, /"fetchApiSymbol": "customFetch"/);
    assert.match(rulesSource, /"schemaFileName": "custom-schema\.ts"/);
    assert.doesNotMatch(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
  });
});

test('rules scaffolds normalized alias import paths from relative helper imports', async () => {
  await withTempProject(async (workspace) => {
    await writeProjectConfig(workspace);
    await writeTextFile(
      path.join(workspace, 'tsconfig.json'),
      [
        '{',
        '  // JSONC path aliases are accepted.',
        '  "compilerOptions": {',
        '    "baseUrl": "src",',
        '    "paths": {',
        '      "@/*": ["*"],',
        '    },',
        '  },',
        '}',
        '',
      ].join('\n'),
    );
    await writeTextFile(
      path.join(workspace, 'src/features/orders/api.ts'),
      [
        "import { request } from '../../shared/request';",
        '',
        "export const createOrder = () => request({ url: '/orders', method: 'POST' });",
        '',
      ].join('\n'),
    );

    await rulesCommand.run({
      context: {
        targetRoot: workspace,
      },
    });

    const analysisMarkdown = await fs.readFile(
      path.join(workspace, 'openapi/review/project-rules/analysis.md'),
      'utf8',
    );
    const rulesSource = await fs.readFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      'utf8',
    );

    assert.match(analysisMarkdown, /## Path alias mappings/);
    assert.match(analysisMarkdown, /`@\/\*` -> `\*`/);
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.match(rulesSource, /"fetchApiSymbol": "request"/);
    assert.match(rulesSource, /"fetchApiImportKind": "named"/);
  });
});
