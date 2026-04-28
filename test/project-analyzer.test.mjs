import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { rulesCommand } from '../src/commands/rules.mjs';
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
    assert.equal(analysis.httpClient.value, 'axios');
    assert.ok(analysis.httpClient.confidence > 0.5);
    assert.deepEqual(analysis.apiHelper.value, {
      symbol: 'request',
      importPath: '@/shared/request',
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
      callStyle: 'request-object',
    });
    assert.match(analysisMarkdown, /Analysis JSON: `openapi\/review\/project-rules\/analysis\.json`/);
    assert.match(analysisMarkdown, /## API helper candidate/);
    assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/request"/);
    assert.match(rulesSource, /"fetchApiSymbol": "request"/);
    assert.match(rulesSource, /"adapterStyle": "request-object"/);
  });
});
