import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { runCli } from '../src/cli.mjs';
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

async function withToolLocalConfig(config, callback) {
  const localConfigPath = path.join(REPO_ROOT, '.openapi-tool.local.jsonc');
  let previous = null;
  let existed = false;

  try {
    previous = await fs.readFile(localConfigPath, 'utf8');
    existed = true;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }

  if (config === null) {
    await fs.rm(localConfigPath, { force: true });
  } else {
    await fs.writeFile(localConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  }

  try {
    return await callback(localConfigPath);
  } finally {
    if (existed) {
      await fs.writeFile(localConfigPath, previous, 'utf8');
    } else {
      await fs.rm(localConfigPath, { force: true });
    }
  }
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
  'cli init uses tool local config projectRoot and initDefaults',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-tool-cli-'));

    try {
      await withToolLocalConfig(
        {
          projectRoot: workspace,
          initDefaults: {
            sourceUrl: 'https://dev-api.example.com/v3/api-docs',
          },
        },
        async () => {
          await runCli(['init']);

          const projectConfigSource = await fs.readFile(
            path.join(workspace, 'openapi/config/project.jsonc'),
            'utf8',
          );

          assert.match(projectConfigSource, /"sourceUrl": "https:\/\/dev-api\.example\.com\/v3\/api-docs"/);
        },
      );
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli fails clearly when target project root is not configured',
  { concurrency: false },
  async () => {
    await withToolLocalConfig(null, async () => {
      await assert.rejects(
        () => runCli(['project']),
        /Target project root is not configured\./,
      );
    });
  },
);

test(
  'cli fails clearly when tool local config projectRoot is blank',
  { concurrency: false },
  async () => {
    await withToolLocalConfig(
      {
        projectRoot: '',
        initDefaults: {
          sourceUrl: '',
        },
      },
      async () => {
        await assert.rejects(
          () => runCli(['project']),
          /Target project root is not configured\./,
        );
      },
    );
  },
);

test(
  'project creates schema, tag wrappers, and manifest for manual handoff',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas31.json');
    const extraFiles = [
      {
        path: 'openapi/project/src/test-support/fetch-api.ts',
        content: `export type RequestConfig = {\n  headers?: Record<string, string>;\n  params?: unknown;\n  data?: unknown;\n  method?: string;\n};\n\nexport async function fetchAPI<T>(_url: string, _config: RequestConfig): Promise<T> {\n  return undefined as T;\n}\n`,
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
      const manifestPath = path.join(workspace, 'openapi/project/manifest.json');
      await assertExists(path.join(generatedRoot, 'schema.ts'));
      await assertExists(defaultDtoPath);
      await assertExists(profilesDtoPath);
      await assertExists(defaultApiPath);
      await assertExists(profilesApiPath);
      await assertExists(defaultIndexPath);
      await assertExists(profilesIndexPath);
      await assertExists(path.join(generatedRoot, 'index.ts'));
      await assertExists(manifestPath);

      const defaultApiSource = await fs.readFile(defaultApiPath, 'utf8');
      const defaultDtoSource = await fs.readFile(defaultDtoPath, 'utf8');
      const profilesApiSource = await fs.readFile(profilesApiPath, 'utf8');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      assert.match(defaultApiSource, /export const getHealthStatus = async/);
      assert.match(defaultApiSource, /from '\.\/get-health-status\.dto'/);
      assert.match(defaultApiSource, /from '\.\.\/\.\.\/test-support\/fetch-api'/);
      assert.match(defaultDtoSource, /export interface GetHealthStatusResponseDto \{/);
      assert.match(profilesApiSource, /export const updateProfile = async/);
      assert.match(profilesApiSource, /from '\.\/update-profile\.dto'/);
      assert.match(profilesApiSource, /method: "PATCH"/);
      assert.equal(manifest.projectGeneratedSrcDir, 'openapi/project/src/openapi-generated');
      assert.equal('suggestedTargetSrcDir' in manifest, false);
      assert.ok(manifest.files.every((entry) => !('target' in entry)));

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
        assert.match(rulesSource, /"tagFileCase": "title"/);
        assert.doesNotMatch(rulesSource, /apiUrlsImportPath/);
        assert.doesNotMatch(rulesSource, /axiosConfigImportPath/);
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
  'project can generate request-object runtime call style without internal adapter files',
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

        const userApiSource = await fs.readFile(
          path.join(workspace, 'openapi/project/src/openapi-generated/users/get-user-by-id.api.ts'),
          'utf8',
        );
        assert.doesNotMatch(userApiSource, /_internal\/fetch-api-adapter/);
        assert.match(userApiSource, /import \{ request as fetchAPI \} from '\.\.\/\.\.\/test-support\/request-client'/);
        assert.match(userApiSource, /await fetchAPI<GetUserByIdResponseDto>\(\{/);
        assert.match(userApiSource, /const \{ id \} = requestDto;/);
        assert.match(userApiSource, /url: `\/users\/\$\{id\}`/);
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
        level: {
          $ref: '#/components/schemas/UserAdminLevel',
        },
      },
    };
    spec.components.schemas.UserAdminLevel = {
      type: 'string',
      enum: ['USER', 'ADMIN'],
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

      assert.match(nestedDtoSource, /export interface NestedLeaf \{/);
      assert.match(nestedDtoSource, /item\?: NestedLeaf;/);
      assert.match(nestedDtoSource, /value\?: string;/);
      assert.match(nestedDtoSource, /level\?: UserAdminLevel;/);
      assert.match(nestedDtoSource, /export type UserAdminLevel = "USER" \| "ADMIN";/);
      assert.match(nestedDtoSource, /export interface GetNestedResponseDto \{/);
    });
  },
);

test(
  'project strips controller prefixes from operationId-based names',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/admin/corporate-members/{userId}'] = {
      get: {
        tags: ['Admin'],
        operationId: 'AdminCorporateController_getAdminCorporateMember',
        parameters: [
          {
            name: 'userId',
            in: 'path',
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
                  properties: {
                    row: {
                      type: 'string',
                    },
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

      const dtoSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Admin/get-admin-corporate-member.dto.ts',
        ),
        'utf8',
      );
      const apiSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Admin/get-admin-corporate-member.api.ts',
        ),
        'utf8',
      );

      assert.match(dtoSource, /export interface GetAdminCorporateMemberRequestDto \{/);
      assert.match(dtoSource, /export interface GetAdminCorporateMemberResponseDto \{/);
      assert.match(apiSource, /export const getAdminCorporateMember = async/);
      assert.match(apiSource, /const \{ userId \} = requestDto;/);
      assert.match(apiSource, /\/admin\/corporate-members\/\$\{userId\}/);
      assert.doesNotMatch(apiSource, /requestDto\["userId"\]/);
      assert.doesNotMatch(dtoSource, /AdminCorporateControllerGetAdminCorporateMember/);
      assert.doesNotMatch(apiSource, /adminCorporateControllerGetAdminCorporateMember/);
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
      assert.match(sessionApiSource, /export const getSession = async \(requestDto: GetSessionRequestDto\)/);
      assert.match(sessionApiSource, /cookieEntries.length > 0/);
      assert.match(sessionApiSource, /headers\.Cookie = cookieEntries\.join\('\; '\)/);
      const sessionDtoSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Sessions/get-session.dto.ts',
        ),
        'utf8',
      );
      assert.match(sessionDtoSource, /export interface GetSessionRequestDto \{/);
      assert.match(sessionDtoSource, /sessionId: string;/);
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
      const uploadDtoSource = await fs.readFile(
        path.join(
          workspace,
          'openapi/project/src/openapi-generated/Uploads/upload-file.dto.ts',
        ),
        'utf8',
      );

      assert.match(uploadApiSource, /export const uploadFile = async \(requestDto: UploadFileRequestDto\)/);
      assert.match(uploadApiSource, /data: requestDto,/);
      assert.match(uploadApiSource, /from '\.\/upload-file\.dto'/);
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
