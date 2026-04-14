import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { applyCommand } from '../src/commands/apply.mjs';
import { generateCommand } from '../src/commands/generate.mjs';
import { projectCommand } from '../src/commands/project.mjs';
import { rulesCommand } from '../src/commands/rules.mjs';

const execFileAsync = promisify(execFile);
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..');
const FIXTURES_DIR = path.join(TEST_DIR, 'fixtures');
const TSC_CLI = path.join(REPO_ROOT, 'node_modules', 'typescript', 'lib', 'tsc.js');

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readFixtureJson(fileName) {
  const source = await fs.readFile(path.join(FIXTURES_DIR, fileName), 'utf8');
  return JSON.parse(source);
}

async function setupWorkspace({
  spec,
  rules = null,
  createRulesFile = true,
  extraFiles = [],
}) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-tool-'));
  const projectConfig = {
    sourceUrl: '',
    sourcePath: 'openapi/_internal/source/openapi.json',
    catalogJsonPath: 'openapi/review/catalog/endpoints.json',
    catalogMarkdownPath: 'openapi/review/catalog/endpoints.md',
    docsDir: 'openapi/review/docs',
    generatedSchemaPath: 'openapi/review/generated/schema.ts',
    projectRulesAnalysisPath: 'openapi/review/project-rules/analysis.md',
    projectRulesPath: 'openapi/config/project-rules.jsonc',
    projectGeneratedSrcDir: 'openapi/project/src/openapi-generated',
    applyTargetSrcDir: 'src/openapi-generated',
  };

  await writeJsonFile(
    path.join(workspace, 'openapi/_internal/source/openapi.json'),
    spec,
  );
  await writeJsonFile(
    path.join(workspace, 'openapi/config/project.jsonc'),
    projectConfig,
  );

  if (createRulesFile) {
    await writeJsonFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      rules ?? {
        api: {
          fetchApiImportPath: '../../test-support/fetch-api',
          fetchApiSymbol: 'fetchAPI',
          axiosConfigImportPath: '../../test-support/http',
          axiosConfigTypeName: 'AxiosRequestConfig',
          adapterStyle: 'url-config',
          wrapperGrouping: 'tag',
          tagFileCase: 'title',
        },
        layout: {
          schemaFileName: 'schema.ts',
        },
      },
    );
  }

  for (const extraFile of extraFiles) {
    await fs.mkdir(path.dirname(path.join(workspace, extraFile.path)), {
      recursive: true,
    });
    await fs.writeFile(path.join(workspace, extraFile.path), extraFile.content, 'utf8');
  }

  return workspace;
}

async function withWorkspace(options, callback) {
  const workspace = await setupWorkspace(options);
  try {
    return await callback(workspace);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

async function runInWorkspace(workspace, callback) {
  const previousCwd = process.cwd();
  process.chdir(workspace);
  try {
    return await callback();
  } finally {
    process.chdir(previousCwd);
  }
}

async function assertExists(filePath) {
  await fs.access(filePath);
}

test(
  'generate creates review docs and schema.ts for OpenAPI 3.0',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => generateCommand.run());

      const schemaPath = path.join(workspace, 'openapi/review/generated/schema.ts');
      const docsDir = path.join(workspace, 'openapi/review/docs');
      const docFiles = await fs.readdir(docsDir);
      const schemaSource = await fs.readFile(schemaPath, 'utf8');
      const endpointDoc = await fs.readFile(
        path.join(docsDir, 'get-users-by-id.md'),
        'utf8',
      );

      assert.match(schemaSource, /export interface paths/);
      assert.equal(docFiles.length, 2);
      assert.match(endpointDoc, /OperationId: `getUserById`/);
    });
  },
);

test(
  'project creates schema and tag wrappers, then apply copies them',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas31.json');
    const extraFiles = [
      {
        path: 'openapi/project/src/test-support/http.ts',
        content: `export type AxiosRequestConfig = {\n  headers?: Record<string, string>;\n  params?: unknown;\n  data?: unknown;\n  method?: string;\n};\n`,
      },
      {
        path: 'openapi/project/src/test-support/fetch-api.ts',
        content: `import type { AxiosRequestConfig } from './http';\n\nexport async function fetchAPI<T>(_url: string, _config: AxiosRequestConfig): Promise<T> {\n  return undefined as T;\n}\n`,
      },
      {
        path: 'openapi/project/src/tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'ESNext',
              moduleResolution: 'Bundler',
              strict: true,
              noEmit: true,
              lib: ['ES2022', 'DOM'],
            },
            include: ['openapi-generated/**/*.ts', 'test-support/**/*.ts'],
          },
          null,
          2,
        ),
      },
    ];

    await withWorkspace({ spec, extraFiles }, async (workspace) => {
      await runInWorkspace(workspace, () => generateCommand.run());
      await runInWorkspace(workspace, () => projectCommand.run());

      const generatedRoot = path.join(workspace, 'openapi/project/src/openapi-generated');
      const defaultDtoPath = path.join(generatedRoot, 'default/get-health-status.dto.ts');
      const profilesDtoPath = path.join(generatedRoot, 'profiles/update-profile.dto.ts');
      const defaultApiPath = path.join(generatedRoot, 'default/get-health-status.api.ts');
      const profilesApiPath = path.join(generatedRoot, 'profiles/update-profile.api.ts');
      const defaultIndexPath = path.join(generatedRoot, 'default/index.ts');
      const profilesIndexPath = path.join(generatedRoot, 'profiles/index.ts');
      const adapterPath = path.join(generatedRoot, '_internal/fetch-api-adapter.ts');

      await assertExists(path.join(generatedRoot, 'schema.ts'));
      await assertExists(defaultDtoPath);
      await assertExists(profilesDtoPath);
      await assertExists(defaultApiPath);
      await assertExists(profilesApiPath);
      await assertExists(defaultIndexPath);
      await assertExists(profilesIndexPath);
      await assertExists(adapterPath);
      await assertExists(path.join(generatedRoot, '_internal/type-helpers.ts'));
      await assertExists(path.join(generatedRoot, 'index.ts'));

      const defaultApiSource = await fs.readFile(defaultApiPath, 'utf8');
      const defaultDtoSource = await fs.readFile(defaultDtoPath, 'utf8');
      const profilesApiSource = await fs.readFile(profilesApiPath, 'utf8');
      const adapterSource = await fs.readFile(adapterPath, 'utf8');
      assert.match(defaultApiSource, /const getHealthStatus = async/);
      assert.match(defaultApiSource, /from '\.\/get-health-status\.dto'/);
      assert.match(defaultApiSource, /from '\.\.\/_internal\/fetch-api-adapter'/);
      assert.match(defaultDtoSource, /export type GetHealthStatusResponseDto =/);
      assert.match(profilesApiSource, /const updateProfile = async/);
      assert.match(profilesApiSource, /from '\.\/update-profile\.dto'/);
      assert.match(adapterSource, /runtimeFetchAPI<T>\(url, config\)/);

      await execFileAsync(process.execPath, [
        TSC_CLI,
        '--noEmit',
        '-p',
        path.join(workspace, 'openapi/project/src/tsconfig.json'),
      ]);

      await runInWorkspace(workspace, () => applyCommand.run());

      await assertExists(path.join(workspace, 'src/openapi-generated/schema.ts'));
      await assertExists(path.join(workspace, 'src/openapi-generated/default/get-health-status.dto.ts'));
      await assertExists(path.join(workspace, 'src/openapi-generated/profiles/update-profile.dto.ts'));
      await assertExists(path.join(workspace, 'src/openapi-generated/default/get-health-status.api.ts'));
      await assertExists(path.join(workspace, 'src/openapi-generated/profiles/update-profile.api.ts'));
      await assertExists(
        path.join(workspace, 'src/openapi-generated/_internal/fetch-api-adapter.ts'),
      );
    });
  },
);

test(
  'rules falls back to src and creates minimal scaffold',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const extraFiles = [
      {
        path: 'src/features/user/api.ts',
        content: `import { fetchAPI } from '@/shared/http';\nimport type { AxiosRequestConfig } from '@/shared/http-types';\n\nexport async function loadUser(config?: AxiosRequestConfig) {\n  return fetchAPI('/users', config ?? {});\n}\n`,
      },
    ];

    await withWorkspace(
      { spec, createRulesFile: false, extraFiles },
      async (workspace) => {
        await runInWorkspace(workspace, () => rulesCommand.run());

        const analysisSource = await fs.readFile(
          path.join(workspace, 'openapi/review/project-rules/analysis.md'),
          'utf8',
        );
        const rulesSource = await fs.readFile(
          path.join(workspace, 'openapi/config/project-rules.jsonc'),
          'utf8',
        );

        assert.match(analysisSource, /Analysis root: `src`/);
        assert.match(rulesSource, /"fetchApiImportPath": "@\/shared\/http"/);
        assert.match(rulesSource, /"axiosConfigImportPath": "@\/shared\/http-types"/);
        assert.match(rulesSource, /"tagFileCase": "title"/);
        assert.doesNotMatch(rulesSource, /apiUrlsImportPath/);
      },
    );
  },
);

test(
  'project can use raw tag titles as folder names',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/banner'] = {
      get: {
        tags: ['199 - [BOS]원문 노출 API'],
        operationId: 'getBanner',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'number',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const extraFiles = [
      {
        path: 'openapi/project/src/test-support/http.ts',
        content: `export type AxiosRequestConfig = {\n  headers?: Record<string, string>;\n  params?: unknown;\n  data?: unknown;\n  method?: string;\n};\n`,
      },
      {
        path: 'openapi/project/src/test-support/fetch-api.ts',
        content: `import type { AxiosRequestConfig } from './http';\n\nexport async function fetchAPI<T>(_url: string, _config: AxiosRequestConfig): Promise<T> {\n  return undefined as T;\n}\n`,
      },
      {
        path: 'openapi/project/src/tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'ESNext',
              moduleResolution: 'Bundler',
              strict: true,
              noEmit: true,
              lib: ['ES2022', 'DOM'],
            },
            include: ['openapi-generated/**/*.ts', 'test-support/**/*.ts'],
          },
          null,
          2,
        ),
      },
    ];

    await withWorkspace(
      {
        spec,
        extraFiles,
        rules: {
          api: {
            fetchApiImportPath: '../../test-support/fetch-api',
            fetchApiSymbol: 'fetchAPI',
            axiosConfigImportPath: '../../test-support/http',
            axiosConfigTypeName: 'AxiosRequestConfig',
            adapterStyle: 'url-config',
            wrapperGrouping: 'tag',
            tagFileCase: 'title',
          },
          layout: {
            schemaFileName: 'schema.ts',
          },
        },
      },
      async (workspace) => {
        await runInWorkspace(workspace, () => generateCommand.run());
        await runInWorkspace(workspace, () => projectCommand.run());

        const tagDir = path.join(
          workspace,
          'openapi/project/src/openapi-generated/199 - [BOS]원문 노출 API',
        );
        const rootIndexSource = await fs.readFile(
          path.join(workspace, 'openapi/project/src/openapi-generated/index.ts'),
          'utf8',
        );

        await assertExists(path.join(tagDir, 'get-banner.dto.ts'));
        await assertExists(path.join(tagDir, 'get-banner.api.ts'));
        assert.match(rootIndexSource, /export \* from "\.\/199 - \[BOS\]원문 노출 API";/);

        await execFileAsync(process.execPath, [
          TSC_CLI,
          '--noEmit',
          '-p',
          path.join(workspace, 'openapi/project/src/tsconfig.json'),
        ]);
      },
    );
  },
);

test(
  'rules auto-migrates legacy kebab tagFileCase to title',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/banner'] = {
      get: {
        tags: ['199 - [BOS]원문 노출 API'],
        operationId: 'getBanner',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'number',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace(
      {
        spec,
        rules: {
          api: {
            fetchApiImportPath: '../../test-support/fetch-api',
            fetchApiSymbol: 'fetchAPI',
            axiosConfigImportPath: '../../test-support/http',
            axiosConfigTypeName: 'AxiosRequestConfig',
            adapterStyle: 'url-config',
            wrapperGrouping: 'tag',
            tagFileCase: 'kebab',
          },
          layout: {
            schemaFileName: 'schema.ts',
          },
        },
        extraFiles: [
          {
            path: 'openapi/project/src/test-support/http.ts',
            content: `export type AxiosRequestConfig = {\n  headers?: Record<string, string>;\n  params?: unknown;\n  data?: unknown;\n  method?: string;\n};\n`,
          },
          {
            path: 'openapi/project/src/test-support/fetch-api.ts',
            content: `import type { AxiosRequestConfig } from './http';\n\nexport async function fetchAPI<T>(_url: string, _config: AxiosRequestConfig): Promise<T> {\n  return undefined as T;\n}\n`,
          },
        ],
      },
      async (workspace) => {
        await runInWorkspace(workspace, () => rulesCommand.run());

        const migratedRulesSource = await fs.readFile(
          path.join(workspace, 'openapi/config/project-rules.jsonc'),
          'utf8',
        );
        assert.match(migratedRulesSource, /"tagFileCase": "title"/);
        assert.doesNotMatch(migratedRulesSource, /"tagFileCase": "kebab"/);

        await runInWorkspace(workspace, () => generateCommand.run());
        await runInWorkspace(workspace, () => projectCommand.run());

        await assertExists(
          path.join(
            workspace,
            'openapi/project/src/openapi-generated/199 - [BOS]원문 노출 API/get-banner.dto.ts',
          ),
        );
      },
    );
  },
);

test(
  'project can generate request-object adapter style',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace(
      {
        spec,
        rules: {
          api: {
            fetchApiImportPath: '../../test-support/request-client',
            fetchApiSymbol: 'request',
            axiosConfigImportPath: '../../test-support/request-client',
            axiosConfigTypeName: 'RequestOptions',
            adapterStyle: 'request-object',
            wrapperGrouping: 'tag',
            tagFileCase: 'kebab',
          },
          layout: {
            schemaFileName: 'schema.ts',
          },
        },
        extraFiles: [
          {
            path: 'openapi/project/src/test-support/request-client.ts',
            content: `export type RequestOptions = {\n  method?: string;\n  params?: unknown;\n  data?: unknown;\n  headers?: Record<string, string>;\n  url?: string;\n};\n\nexport async function request<T>(_options: RequestOptions): Promise<T> {\n  return undefined as T;\n}\n`,
          },
          {
            path: 'openapi/project/src/tsconfig.json',
            content: JSON.stringify(
              {
                compilerOptions: {
                  target: 'ES2022',
                  module: 'ESNext',
                  moduleResolution: 'Bundler',
                  strict: true,
                  noEmit: true,
                  lib: ['ES2022', 'DOM'],
                },
                include: ['openapi-generated/**/*.ts', 'test-support/**/*.ts'],
              },
              null,
              2,
            ),
          },
        ],
      },
      async (workspace) => {
        await runInWorkspace(workspace, () => generateCommand.run());
        await runInWorkspace(workspace, () => projectCommand.run());

        const adapterSource = await fs.readFile(
          path.join(
            workspace,
            'openapi/project/src/openapi-generated/_internal/fetch-api-adapter.ts',
          ),
          'utf8',
        );

        assert.match(adapterSource, /runtimeFetchAPI<T>\(\{ url, \.\.\.config \}\)/);
        const userApiSource = await fs.readFile(
          path.join(workspace, 'openapi/project/src/openapi-generated/users/get-user-by-id.api.ts'),
          'utf8',
        );
        assert.match(userApiSource, /from '\.\/get-user-by-id\.dto'/);

        await execFileAsync(process.execPath, [
          TSC_CLI,
          '--noEmit',
          '-p',
          path.join(workspace, 'openapi/project/src/tsconfig.json'),
        ]);
      },
    );
  },
);

test(
  'project accepts wildcard json-like response media type',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/__dev/error-codes'] = {
      get: {
        tags: ['Dev'],
        operationId: 'getDevErrorCodes',
        responses: {
          200: {
            description: 'OK',
            content: {
              '*/*': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => generateCommand.run());
      await runInWorkspace(workspace, () => projectCommand.run());

      const devApiSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Dev/get-dev-error-codes.api.ts',
        ),
        'utf8',
      );

      assert.match(devApiSource, /const getDevErrorCodes = async/);
      assert.doesNotMatch(devApiSource, /void/);
    });
  },
);

test(
  'project expands nested component schemas inside dto files',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.components ??= {};
    spec.components.schemas ??= {};
    spec.components.schemas.NestedLeaf = {
      type: 'object',
      properties: {
        value: {
          type: 'string',
        },
      },
    };
    spec.components.schemas.NestedWrapper = {
      type: 'object',
      properties: {
        item: {
          $ref: '#/components/schemas/NestedLeaf',
        },
      },
    };
    spec.paths['/nested'] = {
      get: {
        tags: ['Nested'],
        operationId: 'getNested',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/NestedWrapper',
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => generateCommand.run());
      await runInWorkspace(workspace, () => projectCommand.run());

      const nestedDtoSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Nested/get-nested.dto.ts',
        ),
        'utf8',
      );

      assert.match(nestedDtoSource, /export interface GetNestedNestedWrapper \{/);
      assert.match(nestedDtoSource, /item\?: GetNestedNestedLeaf;/);
      assert.match(nestedDtoSource, /export interface GetNestedNestedLeaf \{/);
      assert.match(nestedDtoSource, /value\?: string;/);
      assert.match(nestedDtoSource, /export type GetNestedResponseDto = GetNestedNestedWrapper;/);
    });
  },
);

test(
  'project serializes cookie parameters into request headers',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/sessions'] = {
      get: {
        tags: ['Sessions'],
        operationId: 'getSession',
        parameters: [
          {
            name: 'sessionId',
            in: 'cookie',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => generateCommand.run());
      await runInWorkspace(workspace, () => projectCommand.run());

      const sessionApiSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Sessions/get-session.api.ts',
        ),
        'utf8',
      );
      const helperSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/_internal/type-helpers.ts',
        ),
        'utf8',
      );

      assert.match(sessionApiSource, /\(cookies: GetSessionCookieParamsDto, config\?: AxiosRequestConfig\)/);
      assert.match(sessionApiSource, /mergeRequestHeaders/);
      assert.match(helperSource, /export type CookieParams<Operation>/);
      assert.match(helperSource, /export function buildCookieHeader/);
      const sessionDtoSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Sessions/get-session.dto.ts',
        ),
        'utf8',
      );
      assert.match(sessionDtoSource, /export interface GetSessionCookieParamsDto \{/);
    });
  },
);

test(
  'project generates multipart request body wrappers',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/uploads'] = {
      post: {
        tags: ['Uploads'],
        operationId: 'uploadFile',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    };

    const extraFiles = [
      {
        path: 'openapi/project/src/test-support/http.ts',
        content: `export type AxiosRequestConfig = {\n  headers?: Record<string, string>;\n  params?: unknown;\n  data?: unknown;\n  method?: string;\n};\n`,
      },
      {
        path: 'openapi/project/src/test-support/fetch-api.ts',
        content: `import type { AxiosRequestConfig } from './http';\n\nexport async function fetchAPI<T>(_url: string, _config: AxiosRequestConfig): Promise<T> {\n  return undefined as T;\n}\n`,
      },
      {
        path: 'openapi/project/src/tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'ESNext',
              moduleResolution: 'Bundler',
              strict: true,
              noEmit: true,
              lib: ['ES2022', 'DOM'],
            },
            include: ['openapi-generated/**/*.ts', 'test-support/**/*.ts'],
          },
          null,
          2,
        ),
      },
    ];

    await withWorkspace({ spec, extraFiles }, async (workspace) => {
      await runInWorkspace(workspace, () => generateCommand.run());
      await runInWorkspace(workspace, () => projectCommand.run());

      const uploadApiSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Uploads/upload-file.api.ts',
        ),
        'utf8',
      );
      const helperSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/_internal/type-helpers.ts',
        ),
        'utf8',
      );
      const uploadDtoSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Uploads/upload-file.dto.ts',
        ),
        'utf8',
      );

      assert.match(uploadApiSource, /const uploadFile = async/);
      assert.match(uploadApiSource, /\(data: UploadFileRequestDto, config\?: AxiosRequestConfig\)/);
      assert.match(uploadApiSource, /data: data,/);
      assert.match(uploadApiSource, /from '\.\/upload-file\.dto'/);
      assert.match(helperSource, /export type MultipartRequestBody<Operation>/);
      assert.match(uploadDtoSource, /export interface UploadFileRequestDto \{/);
      assert.match(uploadDtoSource, /file\?: File;/);

      await execFileAsync(process.execPath, [
        TSC_CLI,
        '--noEmit',
        '-p',
        path.join(workspace, 'openapi/project/src/tsconfig.json'),
      ]);
    });
  },
);

test(
  'project fails clearly for non-json success responses',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/reports/export'] = {
      get: {
        tags: ['Reports'],
        operationId: 'exportReport',
        responses: {
          200: {
            description: 'OK',
            content: {
              'text/csv': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => generateCommand.run());

      await assert.rejects(
        () => runInWorkspace(workspace, () => projectCommand.run()),
        /response media type text\/csv/,
      );
    });
  },
);
