import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { writeProjectOutputs } from '../src/generator/write-project-output.mjs';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(TEST_DIR, 'fixtures');

const EXPECTED_MANIFEST = {
  generatedAt: '<generatedAt>',
  sourcePath: 'openapi/_internal/source/openapi.json',
  generatedSchemaPath: 'openapi/review/generated/schema.ts',
  projectRulesPath: 'openapi/config/project-rules.jsonc',
  projectRulesAnalysisPath: 'openapi/review/project-rules/analysis.md',
  projectRulesAnalysisJsonPath: 'openapi/review/project-rules/analysis.json',
  projectGeneratedSrcDir: 'openapi/project/src/openapi-generated',
  totalEndpoints: 2,
  generatedEndpoints: 2,
  skippedEndpoints: 0,
  skippedOperations: [],
  applicationReview: {
    runtimeWrapper: {
      importPath: '../../test-support/fetch-api',
      importSymbol: 'fetchAPI',
      importKind: 'named',
      adapterStyle: 'url-config',
      callShape: 'fetchAPI(url, { method, params, data, headers })',
      assumptions: [
        'The imported helper returns the response body typed as T.',
        'If the project helper returns AxiosResponse<T> or a response envelope, adapt the wrapper before copying generated API files.',
        'Request params, data, headers, and method must match the existing frontend client contract.',
      ],
    },
    endpoints: [
      {
        method: 'GET',
        path: '/health/status',
        functionName: 'getHealthStatus',
        generatedFiles: {
          dto: 'openapi/project/src/openapi-generated/default/get-health-status.dto.ts',
          api: 'openapi/project/src/openapi-generated/default/get-health-status.api.ts',
        },
        requestDto: null,
        responseDto: 'GetHealthStatusResponseDto',
        request: {
          dtoShape: 'none',
          mediaType: null,
          bodyRequired: false,
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          body: {
            schema: null,
            shape: 'none',
            fields: [],
          },
        },
        response: {
          status: '200',
          mediaType: 'application/json',
          body: {
            schema: 'HealthStatus',
            shape: 'HealthStatus',
            fields: [
              {
                name: 'status',
                required: true,
                type: 'string',
              },
              {
                name: 'message',
                required: false,
                type: 'string | null',
              },
            ],
          },
        },
      },
      {
        method: 'PATCH',
        path: '/profiles/{id}',
        functionName: 'updateProfile',
        generatedFiles: {
          dto: 'openapi/project/src/openapi-generated/Profiles/update-profile.dto.ts',
          api: 'openapi/project/src/openapi-generated/Profiles/update-profile.api.ts',
        },
        requestDto: 'UpdateProfileRequestDto',
        responseDto: 'UpdateProfileResponseDto',
        request: {
          dtoShape: 'flat',
          mediaType: 'application/json',
          bodyRequired: true,
          pathParams: [
            {
              name: 'id',
              required: true,
              type: 'string',
            },
          ],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          body: {
            schema: 'UpdateProfileRequest',
            shape: 'UpdateProfileRequest',
            fields: [
              {
                name: 'nickname',
                required: true,
                type: 'string',
              },
              {
                name: 'bio',
                required: false,
                type: 'string | null',
              },
            ],
          },
        },
        response: {
          status: '200',
          mediaType: 'application/json',
          body: {
            schema: 'Profile',
            shape: 'Profile',
            fields: [
              {
                name: 'id',
                required: true,
                type: 'string',
              },
              {
                name: 'nickname',
                required: true,
                type: 'string',
              },
              {
                name: 'bio',
                required: false,
                type: 'string | null',
              },
            ],
          },
        },
      },
    ],
  },
  files: [
    {
      kind: 'schema',
      generated: 'openapi/project/src/openapi-generated/schema.ts',
    },
    {
      kind: 'dto',
      generated: 'openapi/project/src/openapi-generated/default/get-health-status.dto.ts',
      summary: 'tag=default endpoint=get-health-status',
    },
    {
      kind: 'api',
      generated: 'openapi/project/src/openapi-generated/default/get-health-status.api.ts',
      summary: 'tag=default endpoint=get-health-status',
    },
    {
      kind: 'dto',
      generated: 'openapi/project/src/openapi-generated/Profiles/update-profile.dto.ts',
      summary: 'tag=Profiles endpoint=update-profile',
    },
    {
      kind: 'api',
      generated: 'openapi/project/src/openapi-generated/Profiles/update-profile.api.ts',
      summary: 'tag=Profiles endpoint=update-profile',
    },
  ],
};

const EXPECTED_GENERATED_FILES = {
  'Profiles/update-profile.api.ts': [
    "import { fetchAPI } from '../../test-support/fetch-api';",
    "import type { UpdateProfileRequestDto, UpdateProfileResponseDto } from './update-profile.dto';",
    '',
    '/**',
    ' * Update profile',
    ' */',
    'export const updateProfile = async (requestDto: UpdateProfileRequestDto): Promise<UpdateProfileResponseDto> => {',
    '  const { id, ...data } = requestDto;',
    '  const response = await fetchAPI<UpdateProfileResponseDto>(`/profiles/${encodeURIComponent(String(id))}`, {',
    '    method: "PATCH",',
    '    data,',
    '  });',
    '  return response;',
    '};',
    '',
  ].join('\n'),
  'Profiles/update-profile.dto.ts': [
    '/**',
    ' * Update profile',
    ' */',
    'export interface UpdateProfileRequestDto {',
    '  id: string;',
    '  nickname: string;',
    '  bio?: string | null;',
    '}',
    '',
    '/**',
    ' * OK',
    ' */',
    'export interface UpdateProfileResponseDto {',
    '  id: string;',
    '  nickname: string;',
    '  bio?: string | null;',
    '}',
    '',
  ].join('\n'),
  'default/get-health-status.api.ts': [
    "import { fetchAPI } from '../../test-support/fetch-api';",
    "import type { GetHealthStatusResponseDto } from './get-health-status.dto';",
    '',
    '/**',
    ' * Read health status',
    ' */',
    'export const getHealthStatus = async (): Promise<GetHealthStatusResponseDto> => {',
    '  const response = await fetchAPI<GetHealthStatusResponseDto>("/health/status", {',
    '    method: "GET",',
    '  });',
    '  return response;',
    '};',
    '',
  ].join('\n'),
  'default/get-health-status.dto.ts': [
    '/**',
    ' * OK',
    ' */',
    'export interface GetHealthStatusResponseDto {',
    '  status: string;',
    '  message?: string | null;',
    '}',
    '',
  ].join('\n'),
  'schema.ts': 'export interface paths {}\n',
};

const EXPECTED_SUMMARY = [
  '# Project Candidate Summary',
  '',
  '- Generated at: <generatedAt>',
  '- Source OpenAPI: openapi/_internal/source/openapi.json',
  '- Project rules: openapi/config/project-rules.jsonc',
  '- Project rules analysis: openapi/review/project-rules/analysis.md',
  '- Project rules analysis JSON: openapi/review/project-rules/analysis.json',
  '- Review schema: openapi/review/generated/schema.ts',
  '- Total endpoints: 2',
  '- Generated endpoints: 2',
  '- Skipped endpoints: 0',
  '',
  '## Generated Files',
  '',
  '- [schema] `openapi/project/src/openapi-generated/schema.ts`',
  '- [dto] `openapi/project/src/openapi-generated/default/get-health-status.dto.ts` (tag=default endpoint=get-health-status)',
  '- [api] `openapi/project/src/openapi-generated/default/get-health-status.api.ts` (tag=default endpoint=get-health-status)',
  '- [dto] `openapi/project/src/openapi-generated/Profiles/update-profile.dto.ts` (tag=Profiles endpoint=update-profile)',
  '- [api] `openapi/project/src/openapi-generated/Profiles/update-profile.api.ts` (tag=Profiles endpoint=update-profile)',
  '',
  '## Application Review',
  '',
  'Use this section before copying generated candidates into the app.',
  'Do not copy generated API files as-is. Re-check the project rules analysis and the real feature code before applying candidates.',
  'Adapt URL constants, existing DTO reuse, export style, error handling, response unwrapping, and query/cache conventions to match the app.',
  '',
  '### Runtime Wrapper',
  '',
  "- Import used by generated APIs: `import { fetchAPI } from '../../test-support/fetch-api'`",
  '- Call shape: `fetchAPI(url, { method, params, data, headers })`',
  '- Check: The imported helper returns the response body typed as T.',
  '- Check: If the project helper returns AxiosResponse<T> or a response envelope, adapt the wrapper before copying generated API files.',
  '- Check: Request params, data, headers, and method must match the existing frontend client contract.',
  '',
  '### Endpoint Contracts',
  '',
  '- `GET /health/status` -> `getHealthStatus`',
  '  - Files: `openapi/project/src/openapi-generated/default/get-health-status.dto.ts`, `openapi/project/src/openapi-generated/default/get-health-status.api.ts`',
  '  - Request: no request DTO',
  '  - Response: `200` `application/json` -> `GetHealthStatusResponseDto`; body `HealthStatus`; fields: `status: string`, `message?: string | null`',
  '- `PATCH /profiles/{id}` -> `updateProfile`',
  '  - Files: `openapi/project/src/openapi-generated/Profiles/update-profile.dto.ts`, `openapi/project/src/openapi-generated/Profiles/update-profile.api.ts`',
  '  - Request: `UpdateProfileRequestDto` (flat); media `application/json`; body required',
  '  - Request params: path: `id: string`',
  '  - Request body: `UpdateProfileRequest`; fields: `nickname: string`, `bio?: string | null`',
  '  - Response: `200` `application/json` -> `UpdateProfileResponseDto`; body `Profile`; fields: `id: string`, `nickname: string`, `bio?: string | null`',
  '',
].join('\n');

async function readFixtureJson(fileName) {
  const source = await fs.readFile(path.join(FIXTURES_DIR, fileName), 'utf8');
  return JSON.parse(source);
}

async function withTempDir(callback) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-snapshot-'));
  try {
    return await callback(workspace);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

async function collectFiles(rootDir, currentDir = rootDir) {
  const files = {};
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(rootDir, fullPath));
      continue;
    }

    if (entry.isFile()) {
      files[path.relative(rootDir, fullPath).replaceAll(path.sep, '/')] =
        await fs.readFile(fullPath, 'utf8');
    }
  }

  return Object.fromEntries(
    Object.entries(files).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizeGeneratedAt(value) {
  return value.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g,
    '<generatedAt>',
  );
}

test(
  'project output for oas31 fixture matches the golden generated file snapshot',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas31.json');

    await withTempDir(async (workspace) => {
      const generatedDir = path.join(workspace, 'openapi/project/src/openapi-generated');
      const summaryPath = path.join(workspace, 'openapi/project/summary.md');
      const manifest = await writeProjectOutputs({
        rootDir: workspace,
        spec,
        schemaSourcePath: path.join(workspace, 'openapi/_internal/source/openapi.json'),
        schemaContents: 'export interface paths {}\n',
        projectGeneratedSrcDir: generatedDir,
        projectManifestPath: path.join(workspace, 'openapi/project/manifest.json'),
        projectSummaryPath: summaryPath,
        projectRulesPath: 'openapi/config/project-rules.jsonc',
        generatedSchemaPath: 'openapi/review/generated/schema.ts',
        apiRules: {
          fetchApiImportPath: '../../test-support/fetch-api',
          fetchApiSymbol: 'fetchAPI',
          adapterStyle: 'url-config',
          tagFileCase: 'title',
        },
        layoutRules: {
          schemaFileName: 'schema.ts',
        },
      });

      assert.deepEqual(
        {
          ...manifest,
          generatedAt: '<generatedAt>',
        },
        EXPECTED_MANIFEST,
      );
      assert.deepEqual(await collectFiles(generatedDir), EXPECTED_GENERATED_FILES);
      assert.equal(
        normalizeGeneratedAt(await fs.readFile(summaryPath, 'utf8')),
        EXPECTED_SUMMARY,
      );
    });
  },
);
