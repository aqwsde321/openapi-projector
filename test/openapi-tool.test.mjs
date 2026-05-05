import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { runCli } from '../src/cli.mjs';
import { formatFailure, formatSuccess } from '../src/cli-format.mjs';
import { catalogCommand } from '../src/commands/catalog.mjs';
import { doctorCommand } from '../src/commands/doctor.mjs';
import { generateCommand } from '../src/commands/generate.mjs';
import { initCommand } from '../src/commands/init.mjs';
import { projectCommand } from '../src/commands/project.mjs';
import { rulesCommand } from '../src/commands/rules.mjs';
import { createTypeRenderer, readJson } from '../src/core/openapi-utils.mjs';

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

async function setProjectSourceUrl(workspace, sourceUrl) {
  const projectConfigPath = path.join(workspace, 'openapi/config/project.jsonc');
  const source = await fs.readFile(projectConfigPath, 'utf8');
  await fs.writeFile(
    projectConfigPath,
    source.replace(
      '"sourceUrl": "http://localhost:8080/v3/api-docs"',
      `"sourceUrl": ${JSON.stringify(sourceUrl)}`,
    ),
    'utf8',
  );
}

async function setupWorkspace({
  spec,
  rules = null,
  createRulesFile = true,
  extraFiles = [],
  projectConfigOverrides = {},
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
    ...projectConfigOverrides,
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
    const projectRules = rules ?? {
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
    };

    await writeJsonFile(
      path.join(workspace, 'openapi/config/project-rules.jsonc'),
      {
        ...projectRules,
        review: {
          rulesReviewed: true,
          notes: [],
          ...(projectRules.review ?? {}),
        },
        api: {
          fetchApiImportKind: 'named',
          ...(projectRules.api ?? {}),
        },
        layout: {
          schemaFileName: 'schema.ts',
          ...(projectRules.layout ?? {}),
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

async function captureConsoleLog(callback) {
  const originalLog = console.log;
  const lines = [];
  console.log = (...args) => {
    lines.push(args.join(' '));
  };

  try {
    const result = await callback();
    return {
      result,
      output: lines.join('\n'),
    };
  } finally {
    console.log = originalLog;
  }
}

function createWritableCapture({ forceColor = false, isTTY = false } = {}) {
  let output = '';
  const writable = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });

  if (isTTY) {
    Object.defineProperty(writable, 'isTTY', {
      configurable: true,
      value: true,
    });
  }

  if (forceColor) {
    Object.defineProperty(writable, 'forceColor', {
      configurable: true,
      value: true,
    });
  }

  return {
    output: () => output,
    writable,
  };
}

async function* delayedLines(lines) {
  for (const line of lines) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    yield line;
  }
}

async function assertExists(filePath) {
  await fs.access(filePath);
}

function createSimpleSpec(summary = 'Ping') {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Simple API',
      version: '1.0.0',
    },
    paths: {
      '/ping': {
        get: {
          summary,
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: {
                        type: 'boolean',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function createOpenApiFetchResponse({
  body = createSimpleSpec(),
  status = 200,
  statusText = 'OK',
  headers = { 'content-type': 'application/json' },
} = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: {
      get(name) {
        return normalizedHeaders.get(String(name).toLowerCase()) ?? null;
      },
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
  };
}

function createOpenApiFetchMock(handler = () => createOpenApiFetchResponse()) {
  const calls = [];
  const fetchMock = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return handler(String(url), options);
  };
  fetchMock.calls = calls;
  return fetchMock;
}

async function withToolLocalConfigs(configs, callback) {
  const configPaths = {
    projector: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
    legacy: path.join(REPO_ROOT, '.openapi-tool.local.jsonc'),
  };
  const previousEntries = new Map();

  for (const [key, localConfigPath] of Object.entries(configPaths)) {
    try {
      previousEntries.set(key, {
        existed: true,
        source: await fs.readFile(localConfigPath, 'utf8'),
      });
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
      previousEntries.set(key, { existed: false, source: null });
    }

    const config = configs[key] ?? null;
    if (config === null) {
      await fs.rm(localConfigPath, { force: true });
    } else if (typeof config === 'string') {
      await fs.writeFile(localConfigPath, config, 'utf8');
    } else {
      await fs.writeFile(localConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    }
  }

  try {
    return await callback(configPaths);
  } finally {
    for (const [key, localConfigPath] of Object.entries(configPaths)) {
      const previous = previousEntries.get(key);
      if (previous.existed) {
        await fs.writeFile(localConfigPath, previous.source, 'utf8');
      } else {
        await fs.rm(localConfigPath, { force: true });
      }
    }
  }
}

async function withToolLocalConfig(config, callback) {
  return withToolLocalConfigs({ legacy: config }, (paths) => callback(paths.legacy));
}

test('readJson supports JSONC comments and trailing commas', async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-jsonc-'));
  const filePath = path.join(workspace, 'config.jsonc');

  try {
    await fs.writeFile(
      filePath,
      [
        '{',
        '  // trailing commas are valid JSONC in config files',
        '  "sourceUrl": "https://api.example.com/openapi.json",',
        '  "paths": [',
        '    "openapi/config/project.jsonc",',
        '  ],',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );

    assert.deepEqual(await readJson(filePath), {
      sourceUrl: 'https://api.example.com/openapi.json',
      paths: ['openapi/config/project.jsonc'],
    });
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test('type renderer preserves OpenAPI 3.1 nullable union types', () => {
  const renderer = createTypeRenderer((name) => name);

  assert.equal(
    renderer.renderType({
      type: ['string', 'null'],
    }),
    'string | null',
  );
  assert.equal(
    renderer.renderType({
      type: 'array',
      items: {
        type: ['string', 'null'],
      },
    }),
    '(string | null)[]',
  );
});

test('cli status formatter uses colored marks when color is enabled', () => {
  const colorStream = { forceColor: true };

  assert.equal(formatSuccess('done', colorStream), '\x1b[32m✓\x1b[0m done');
  assert.equal(formatFailure('failed', colorStream), '\x1b[31mx\x1b[0m failed');
  assert.equal(formatSuccess('done', {}), '✓ done');
  assert.equal(formatFailure('failed', {}), 'x failed');
});

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
  'generate rejects malformed OpenAPI root shape before writing outputs',
  { concurrency: false },
  async () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Malformed API',
        version: '1.0.0',
      },
      paths: [],
    };

    await withWorkspace({ spec }, async (workspace) => {
      await assert.rejects(
        () => runInWorkspace(workspace, () => generateCommand.run()),
        /OpenAPI source is invalid: paths must be an object\./,
      );

      await assert.rejects(
        () => fs.access(path.join(workspace, 'openapi/review/generated/schema.ts')),
        /ENOENT/,
      );
    });
  },
);

test(
  'catalog rejects unsupported OpenAPI versions before writing outputs',
  { concurrency: false },
  async () => {
    const spec = {
      swagger: '2.0',
      info: {
        title: 'Swagger API',
        version: '1.0.0',
      },
      paths: {},
    };

    await withWorkspace({ spec }, async (workspace) => {
      await assert.rejects(
        () => runInWorkspace(workspace, () => catalogCommand.run()),
        /Swagger\/OpenAPI 2\.0 is not supported in MVP v2\./,
      );

      await assert.rejects(
        () => fs.access(path.join(workspace, 'openapi/review/catalog/endpoints.json')),
        /ENOENT/,
      );
    });
  },
);

test(
  'catalog records Slack-friendly contract comparison rows in change history',
  { concurrency: false },
  async () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Change Detail API',
        version: '1.0.0',
      },
      paths: {
        '/users/{id}': {
          get: {
            tags: ['Users'],
            summary: 'Get user',
            parameters: [
              {
                name: 'id',
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
                headers: {
                  'X-User': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                  'X-Meta': {
                    schema: {
                      $ref: '#/components/schemas/ResponseHeader',
                    },
                  },
                  'X-Changed': {
                    schema: {
                      $ref: '#/components/schemas/ChangedHeader',
                    },
                  },
                },
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              email: {
                type: 'string',
              },
            },
          },
          File: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
            },
          },
          ResponseHeader: {
            type: 'object',
            required: ['value'],
            properties: {
              value: {
                type: 'string',
              },
            },
          },
          ChangedHeader: {
            type: 'object',
            required: ['token'],
            properties: {
              token: {
                type: 'string',
              },
              expiresAt: {
                type: 'string',
              },
            },
          },
        },
      },
    };

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => catalogCommand.run());

      const nextSpec = structuredClone(spec);
      nextSpec.paths['/users/{id}'].get.parameters.push({
        name: 'active',
        in: 'query',
        required: true,
        schema: {
          type: 'boolean',
        },
      });
      nextSpec.components.schemas.User.required = ['email'];
      nextSpec.components.schemas.User.properties.email.type = 'integer';
      nextSpec.components.schemas.User.properties.attachments = {
        type: 'array',
        items: {
          $ref: '#/components/schemas/File',
        },
      };
      delete nextSpec.components.schemas.ResponseHeader.required;
      nextSpec.components.schemas.ResponseHeader.properties.value.type = 'integer';
      nextSpec.components.schemas.ChangedHeader.required.push('expiresAt');

      await writeJsonFile(
        path.join(workspace, 'openapi/_internal/source/openapi.json'),
        nextSpec,
      );
      await fs.mkdir(path.join(workspace, 'openapi/review/changes'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(workspace, 'openapi/review/changes/summary.md'),
        '# stale summary\n',
        'utf8',
      );
      await fs.writeFile(
        path.join(workspace, 'openapi/review/changes/summary.json'),
        '{"stale":true}\n',
        'utf8',
      );

      await runInWorkspace(workspace, () => catalogCommand.run());

      const historyDir = path.join(workspace, 'openapi/review/changes/history');
      const historyFiles = await fs.readdir(historyDir);
      const historyMarkdownFiles = historyFiles.filter((fileName) =>
        fileName.endsWith('.md'),
      );
      const historyJsonFiles = historyFiles.filter((fileName) =>
        fileName.endsWith('.json'),
      );

      assert.equal(historyMarkdownFiles.length, 1);
      assert.equal(historyJsonFiles.length, 1);

      const historySource = await fs.readFile(
        path.join(historyDir, historyMarkdownFiles[0]),
        'utf8',
      );
      const topLevelChangesSource = await fs.readFile(
        path.join(workspace, 'openapi/changes.md'),
        'utf8',
      );
      const topLevelChangesJson = await readJson(path.join(workspace, 'openapi/changes.json'));
      const openapiGitignoreSource = await fs.readFile(
        path.join(workspace, 'openapi/.gitignore'),
        'utf8',
      );
      await assert.rejects(
        () => fs.access(path.join(workspace, 'openapi/review/changes/summary.md')),
        /ENOENT/,
      );
      await assert.rejects(
        () => fs.access(path.join(workspace, 'openapi/review/changes/summary.json')),
        /ENOENT/,
      );
      const historyJson = await readJson(path.join(historyDir, historyJsonFiles[0]));
      const detailPaths = historyJson.contractChanged[0].details.map(
        (detail) => detail.path,
      );

      assert.equal(historyJson.contractChanged.length, 1);
      assert.equal(topLevelChangesJson.contractChanged.length, 1);
      assert.match(openapiGitignoreSource, /changes\.md/);
      assert.match(openapiGitignoreSource, /changes\.json/);
      assert.equal(historyJson.contractChanged[0].detailsUnavailable, undefined);
      assert.deepEqual(historyJson.contractChanged[0].projectFiles, {
        dto: 'openapi/project/src/openapi-generated/Users/get-users-by-id.dto.ts',
        api: 'openapi/project/src/openapi-generated/Users/get-users-by-id.api.ts',
      });
      assert.ok(
        detailPaths.includes('operation.parameters["query.active"].schema.type'),
      );
      assert.ok(
        detailPaths.includes('referencedSchemas.User.properties.email.type'),
      );
      assert.ok(detailPaths.includes('referencedSchemas.User.required'));
      assert.ok(
        detailPaths.includes('referencedSchemas.ResponseHeader.properties.value.type'),
      );
      assert.ok(detailPaths.includes('referencedSchemas.ChangedHeader.required'));
      const comparisonRows = historyJson.contractChanged[0].comparisonRows;
      const comparisonDisplayRows = historyJson.contractChanged[0].comparisonDisplayRows;
      assert.deepEqual(historyJson.contractChanged[0].comparisonRows[0], {
        category: 'Query Parameter',
        target: '`active`',
        previous: '없음',
        next: '`boolean`, required',
      });
      assert.deepEqual(comparisonRows.find((row) => row.target === '`User.email.required`'), {
        category: 'Response Body/Header Field',
        target: '`User.email.required`',
        previous: 'optional',
        next: 'required',
      });
      assert.deepEqual(comparisonRows.find((row) => row.target === '`User.attachments`'), {
        category: 'Response Body/Header Field',
        target: '`User.attachments`',
        previous: '없음',
        next: '`File[]`',
      });
      assert.deepEqual(
        comparisonRows.find((row) => row.target === '`ResponseHeader.value.type`'),
        {
          category: 'Response Header Field',
          target: '`ResponseHeader.value.type`',
          previous: '`string`',
          next: '`integer`',
        },
      );
      assert.deepEqual(
        comparisonRows.find((row) => row.target === '`ResponseHeader.value.required`'),
        {
          category: 'Response Header Field',
          target: '`ResponseHeader.value.required`',
          previous: 'required',
          next: 'optional',
        },
      );
      assert.deepEqual(
        comparisonRows.find((row) => row.target === '`ChangedHeader.expiresAt.required`'),
        {
          category: 'Response Header Field',
          target: '`ChangedHeader.expiresAt.required`',
          previous: 'optional',
          next: 'required',
        },
      );
      assert.deepEqual(comparisonDisplayRows.find((row) => row.declaration === 'Boolean active; // required'), {
        change: '🟢 추가',
        location: '요청 Query 파라미터',
        declaration: 'Boolean active; // required',
      });
      assert.deepEqual(
        comparisonDisplayRows.find((row) => row.declaration === 'Integer value; // required → optional'),
        {
          change: '🟡 변경',
          location: '응답 Header 필드',
          declaration: 'Integer value; // required → optional',
        },
      );
      assert.match(historySource, /🧩 Contract Changed: 1/);
      assert.match(
        topLevelChangesSource,
        /\[DTO\]\(<project\/src\/openapi-generated\/Users\/get-users-by-id\.dto\.ts>\)/,
      );
      assert.match(
        topLevelChangesSource,
        /\[API\]\(<project\/src\/openapi-generated\/Users\/get-users-by-id\.api\.ts>\)/,
      );
      assert.match(
        topLevelChangesSource,
        /History: \[openapi\/review\/changes\/history\]\(<review\/changes\/history>\)/,
      );
      assert.match(
        topLevelChangesSource,
        /Comparison baseline: \[openapi\/review\/catalog\/endpoints\.json\]\(<review\/catalog\/endpoints\.json>\)/,
      );
      assert.match(
        historySource,
        /\[DTO\]\(<\.\.\/\.\.\/\.\.\/project\/src\/openapi-generated\/Users\/get-users-by-id\.dto\.ts>\)/,
      );
      assert.match(
        historySource,
        /\[API\]\(<\.\.\/\.\.\/\.\.\/project\/src\/openapi-generated\/Users\/get-users-by-id\.api\.ts>\)/,
      );
      assert.match(
        historySource,
        /- 🟢 추가 \| 요청 Query 파라미터 \| Boolean active; \/\/ required/,
      );
      assert.match(
        historySource,
        /- 🟢 추가 \| 응답 Body\/Header 필드 \| List<File> attachments;/,
      );
      assert.match(
        historySource,
        /- 🟡 변경 \| 응답 Body\/Header 필드 \| Integer email; \/\/ optional → required/,
      );
      assert.match(
        historySource,
        /- 🟡 변경 \| 응답 Body\/Header 필드 \| Integer email; \/\/ string → integer/,
      );
      assert.match(
        historySource,
        /- 🟡 변경 \| 응답 Header 필드 \| Integer value; \/\/ string → integer/,
      );
      assert.match(
        historySource,
        /- 🟡 변경 \| 응답 Header 필드 \| Integer value; \/\/ required → optional/,
      );
      assert.match(
        historySource,
        /- 🟡 변경 \| 응답 Header 필드 \| String expiresAt; \/\/ optional → required/,
      );
    });
  },
);

test(
  'catalog renders first added query parameter as a Slack-friendly comparison row',
  { concurrency: false },
  async () => {
    const spec = createSimpleSpec('Get inquiry detail');

    await withWorkspace({ spec }, async (workspace) => {
      await runInWorkspace(workspace, () => catalogCommand.run());

      const nextSpec = structuredClone(spec);
      nextSpec.paths['/ping'].get.parameters = [
        {
          name: 'abbb',
          in: 'query',
          required: true,
          schema: {
            type: 'integer',
            format: 'int32',
          },
        },
      ];

      await writeJsonFile(
        path.join(workspace, 'openapi/_internal/source/openapi.json'),
        nextSpec,
      );

      await runInWorkspace(workspace, () => catalogCommand.run());

      const topLevelChangesSource = await fs.readFile(
        path.join(workspace, 'openapi/changes.md'),
        'utf8',
      );
      const topLevelChangesJson = await readJson(
        path.join(workspace, 'openapi/changes.json'),
      );

      assert.match(
        topLevelChangesSource,
        /- 🟢 추가 \| 요청 Query 파라미터 \| Integer abbb; \/\/ required/,
      );
      assert.doesNotMatch(topLevelChangesSource, /operation\.parameters` \| `\[\]`/);
      assert.doesNotMatch(topLevelChangesSource, /Compatibility Check/);
      assert.equal(topLevelChangesJson.externalDiff, undefined);
    });
  },
);

test(
  'cli init uses projector local config before legacy config',
  { concurrency: false },
  async () => {
    const projectorWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-cli-'));
    const legacyWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-tool-cli-'));

    try {
      await withToolLocalConfigs(
        {
          projector: {
            projectRoot: projectorWorkspace,
            initDefaults: {
              sourceUrl: 'https://projector.example.com/v3/api-docs',
            },
          },
          legacy: {
            projectRoot: legacyWorkspace,
            initDefaults: {
              sourceUrl: 'https://legacy.example.com/v3/api-docs',
            },
          },
        },
        async () => {
          await runCli(['init']);

          const projectConfigSource = await fs.readFile(
            path.join(projectorWorkspace, 'openapi/config/project.jsonc'),
            'utf8',
          );

          assert.match(projectConfigSource, /"sourceUrl": "https:\/\/projector\.example\.com\/v3\/api-docs"/);
          await assert.rejects(
            () => fs.access(path.join(legacyWorkspace, 'openapi/config/project.jsonc')),
            /ENOENT/,
          );
        },
      );
    } finally {
      await fs.rm(projectorWorkspace, { recursive: true, force: true });
      await fs.rm(legacyWorkspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init uses current working directory and creates local config',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-cwd-'));

    try {
      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['init'])),
      );

      const localConfigSource = await fs.readFile(
        path.join(workspace, '.openapi-projector.local.jsonc'),
        'utf8',
      );
      const projectConfigSource = await fs.readFile(
        path.join(workspace, 'openapi/config/project.jsonc'),
        'utf8',
      );
      const projectReadmeSource = await fs.readFile(
        path.join(workspace, 'openapi/README.md'),
        'utf8',
      );
      const gitignoreSource = await fs.readFile(path.join(workspace, '.gitignore'), 'utf8');

      assert.match(localConfigSource, /"projectRoot": "\."/);
      assert.doesNotMatch(localConfigSource, /"sourceUrl"/);
      assert.match(projectConfigSource, /"sourceUrl": "http:\/\/localhost:8080\/v3\/api-docs"/);
      assert.match(
        projectConfigSource,
        /"projectRulesAnalysisJsonPath": "openapi\/review\/project-rules\/analysis\.json"/,
      );
      assert.match(projectReadmeSource, /# openapi-projector Workspace Guide/);
      assert.doesNotMatch(projectReadmeSource, /## 명령 실행 기준/);
      assert.doesNotMatch(projectReadmeSource, /최신 CLI 기능 강제 사용/);
      assert.doesNotMatch(projectReadmeSource, /openapi-projector@<version>/);
      assert.doesNotMatch(projectReadmeSource, /전역 설치 사용/);
      assert.doesNotMatch(projectReadmeSource, /명령 실행 방식/);
      assert.match(projectReadmeSource, /## 빠른 시작/);
      assert.match(projectReadmeSource, /<details>/);
      assert.doesNotMatch(projectReadmeSource, /<summary>AI에게 붙여넣을 프롬프트<\/summary>/);
      assert.match(projectReadmeSource, /<summary>AI Agents: Detailed Workflow<\/summary>/);
      assert.match(projectReadmeSource, /## For AI Agents: Detailed Workflow/);
      assert.doesNotMatch(projectReadmeSource, /### 2\. 선택 설치: oasdiff/);
      assert.match(projectReadmeSource, /### Step 2\. AI에게 맡기거나 직접 진행/);
      assert.match(projectReadmeSource, /#### Option A\. AI에게 맡기기/);
      assert.match(projectReadmeSource, /#### Option B\. 직접 진행하기/);
      assert.doesNotMatch(projectReadmeSource, /oasdiff/);
      assert.doesNotMatch(projectReadmeSource, /Compatibility Check/);
      assert.doesNotMatch(projectReadmeSource, /brew install oasdiff/);
      assert.match(projectReadmeSource, /openapi\/changes\.md/);
      assert.match(projectReadmeSource, /openapi\/changes\.json/);
      assert.match(projectReadmeSource, /openapi\/review\/changes\/history\//);
      assert.match(projectReadmeSource, /openapi\/review\/project-rules\/analysis\.json/);
      assert.match(projectReadmeSource, /Contract Changed/);
      assert.match(projectReadmeSource, /npx --yes openapi-projector rules/);
      assert.match(projectReadmeSource, /rg "fetchAPI\|apiClient\|request\|axios\|ky\|httpClient" src/);
      assert.match(projectReadmeSource, /openapi\/config\/project-rules\.jsonc/);
      assert.match(projectReadmeSource, /npx --yes openapi-projector prepare/);
      assert.match(projectReadmeSource, /## Swagger 변경 비교/);
      assert.match(projectReadmeSource, /DTO\/API 후보 생성이 필요하지 않고 Swagger 변경점만 확인할 때는 `refresh`를 단독으로 실행합니다/);
      assert.match(projectReadmeSource, /## 생성되는 파일/);
      assert.doesNotMatch(projectReadmeSource, /### 6\. Git 관리/);
      assert.match(projectReadmeSource, /기본값은 `http:\/\/localhost:8080\/v3\/api-docs`입니다/);
      assert.match(projectReadmeSource, /대화형 `init`에서 URL 검증이 VPN, 인증, 백엔드 미기동 때문에 실패했다면/);
      assert.doesNotMatch(projectReadmeSource, /<summary>CI\/스크립트에서 프롬프트 없이 실행하기<\/summary>/);
      assert.doesNotMatch(projectReadmeSource, /npx --yes openapi-projector init --source-url/);
      assert.match(
        projectReadmeSource,
        /이 문서는 `init` 이후 생성된 작업 안내서입니다/,
      );
      assert.match(projectReadmeSource, /먼저 볼 파일/);
      assert.match(projectReadmeSource, /실제 프로젝트 규칙과 맞으면/);
      assert.match(projectReadmeSource, /아래 명령은 프론트엔드 프로젝트 루트에서 실행해/);
      assert.match(projectReadmeSource, /사람이 npx --yes openapi-projector prepare를 미리 실행했다면/);
      assert.match(projectReadmeSource, /default `sourceUrl` is `http:\/\/localhost:8080\/v3\/api-docs`/i);
      assert.match(projectReadmeSource, /### 2\. Recommended Prepare Flow/);
      assert.match(projectReadmeSource, /`prepare`: runs `refresh -> rules -> project`/);
      assert.match(projectReadmeSource, /Command-by-command fallback/);
      assert.doesNotMatch(projectReadmeSource, /prefer the step-by-step flow over `prepare`/i);
      assert.match(projectReadmeSource, /`prepare`는 아래 흐름을 한 번에 실행합니다/);
      assert.match(projectReadmeSource, /`refresh`: Swagger\/OpenAPI를 내려받고 이전 버전과 비교해 `openapi\/changes\.md`를 만듭니다/);
      assert.match(projectReadmeSource, /`rules`: 현재 프론트엔드 프로젝트의 API 호출 규칙과 React Query 사용 여부를 분석해 `openapi\/config\/project-rules\.jsonc`를 만듭니다/);
      assert.match(projectReadmeSource, /`project`: 검토된 규칙으로 DTO\/API 후보와 선택적 React Query hook 후보를 생성합니다/);
      assert.match(projectReadmeSource, /hooks\.enabled가 true로 자동 제안/);
      assert.match(projectReadmeSource, /처음 실행하면 `rules` 검토 단계에서 멈추는 것이 정상입니다/);
      assert.match(projectReadmeSource, /`review\.rulesReviewed`를 `true`로 바꿉니다/);
      assert.match(projectReadmeSource, /`openapi\/review\/project-rules\/analysis\.md`와/);
      assert.match(projectReadmeSource, /prepare가 rules 검토 단계에서 멈췄다면/);
      assert.match(projectReadmeSource, /API wrapper까지 필요하면 위 프롬프트 그대로 쓰면 됩니다/);
      assert.match(output, /--- sourceUrl config ---/);
      assert.match(output, /sourceUrl: http:\/\/localhost:8080\/v3\/api-docs/);
      assert.match(output, /edit sourceUrl later: .*openapi[\\/]config[\\/]project\.jsonc \(field: sourceUrl\)/);
      assert.match(output, /open: file:.*openapi\/config\/project\.jsonc/);
      assert.match(output, /------------------------/);
      assert.match(output, /next: run doctor --check-url/);
      assert.match(gitignoreSource, /\.openapi-projector\.local\.jsonc/);

      const openapiGitignoreSource = await fs.readFile(
        path.join(workspace, 'openapi/.gitignore'),
        'utf8',
      );
      assert.match(openapiGitignoreSource, /changes\.md/);
      assert.match(openapiGitignoreSource, /changes\.json/);
      assert.match(openapiGitignoreSource, /_internal\//);
      assert.match(openapiGitignoreSource, /review\//);
      assert.match(openapiGitignoreSource, /project\//);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init keeps default sourceUrl when interactive prompt is blank',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prompt-default-'));
    const promptOutput = createWritableCapture();
    const fetchMock = createOpenApiFetchMock();

    try {
      const { output } = await captureConsoleLog(() =>
        initCommand.run({
          argv: [],
          context: {
            interactive: true,
            fetch: fetchMock,
            stdin: Readable.from(['\n']),
            stdout: promptOutput.writable,
            targetRoot: workspace,
          },
        }),
      );

      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, 'http://localhost:8080/v3/api-docs');
      assert.match(promptOutput.output(), /OpenAPI JSON URL \[http:\/\/localhost:8080\/v3\/api-docs\]:/);
      assert.match(promptOutput.output(), /Checking OpenAPI JSON URL/);
      assert.match(promptOutput.output(), /✓ GET http:\/\/localhost:8080\/v3\/api-docs - OpenAPI 3\.0\.3/);
      assert.deepEqual(fetchMock.calls.map((call) => call.url), [
        'http://localhost:8080/v3/api-docs',
      ]);
      assert.match(output, /--- sourceUrl config ---/);
      assert.match(output, /sourceUrl: http:\/\/localhost:8080\/v3\/api-docs/);
      assert.match(output, /edit sourceUrl later: .*openapi[\\/]config[\\/]project\.jsonc \(field: sourceUrl\)/);
      assert.match(output, /open: file:.*openapi\/config\/project\.jsonc/);
      assert.match(output, /------------------------/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init prompts for sourceUrl in interactive terminals',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prompt-'));
    const sourceUrl = 'https://prompt.example.com/v3/api-docs';
    const promptOutput = createWritableCapture();
    const fetchMock = createOpenApiFetchMock();

    try {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: fetchMock,
          stdin: Readable.from([`${sourceUrl}\n`]),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, sourceUrl);
      assert.match(promptOutput.output(), /Default sourceUrl: http:\/\/localhost:8080\/v3\/api-docs/);
      assert.match(promptOutput.output(), /OpenAPI JSON URL \[http:\/\/localhost:8080\/v3\/api-docs\]:/);
      assert.match(promptOutput.output(), /✓ GET https:\/\/prompt\.example\.com\/v3\/api-docs - OpenAPI 3\.0\.3/);
      assert.deepEqual(fetchMock.calls.map((call) => call.url), [sourceUrl]);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init discovers a common OpenAPI path when prompted sourceUrl fails',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prompt-discover-'));
    const promptOutput = createWritableCapture();
    const fetchMock = createOpenApiFetchMock((url) => {
      if (url === 'http://localhost:8080/api-docs') {
        return createOpenApiFetchResponse();
      }

      return createOpenApiFetchResponse({ status: 404, statusText: 'Not Found', body: 'not found' });
    });

    try {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: fetchMock,
          stdin: Readable.from(['http://localhost:8080/v3/api-docs\n']),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, 'http://localhost:8080/api-docs');
      assert.deepEqual(fetchMock.calls.map((call) => call.url), [
        'http://localhost:8080/v3/api-docs',
        'http://localhost:8080/api-docs',
      ]);
      assert.match(promptOutput.output(), /x GET http:\/\/localhost:8080\/v3\/api-docs - HTTP 404 Not Found/);
      assert.match(promptOutput.output(), /Trying common OpenAPI paths from http:\/\/localhost:8080/);
      assert.match(promptOutput.output(), /✓ GET http:\/\/localhost:8080\/api-docs - OpenAPI 3\.0\.3/);
      assert.match(promptOutput.output(), /Using discovered sourceUrl: http:\/\/localhost:8080\/api-docs/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init discovers a context-path OpenAPI URL from a Swagger UI URL',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prompt-context-'));
    const promptOutput = createWritableCapture();
    const swaggerUiUrl = 'https://api.example.com/app/swagger-ui/index.html#/';
    const discoveredUrl = 'https://api.example.com/app/v3/api-docs';
    const fetchMock = createOpenApiFetchMock((url) => {
      if (url === swaggerUiUrl) {
        return createOpenApiFetchResponse({
          body: '<!doctype html><html></html>',
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url === discoveredUrl) {
        return createOpenApiFetchResponse();
      }

      return createOpenApiFetchResponse({ status: 404, statusText: 'Not Found', body: 'not found' });
    });

    try {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: fetchMock,
          stdin: Readable.from([`${swaggerUiUrl}\n`]),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, discoveredUrl);
      assert.deepEqual(fetchMock.calls.map((call) => call.url), [
        swaggerUiUrl,
        discoveredUrl,
      ]);
      assert.match(promptOutput.output(), /x GET https:\/\/api\.example\.com\/app\/swagger-ui\/index\.html#\/ - response is not JSON/);
      assert.match(promptOutput.output(), /✓ GET https:\/\/api\.example\.com\/app\/v3\/api-docs - OpenAPI 3\.0\.3/);
      assert.match(promptOutput.output(), /Using discovered sourceUrl: https:\/\/api\.example\.com\/app\/v3\/api-docs/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init skip saves the best JSON candidate when discovered paths require auth',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prompt-auth-skip-'));
    const promptOutput = createWritableCapture();
    const swaggerUiUrl = 'https://private.example.com/swagger-ui/index.html#/';
    const bestCandidateUrl = 'https://private.example.com/v3/api-docs';
    const fetchMock = createOpenApiFetchMock((url) => {
      if (url === swaggerUiUrl) {
        return createOpenApiFetchResponse({
          body: '<!doctype html><html></html>',
          headers: { 'content-type': 'text/html' },
        });
      }

      return createOpenApiFetchResponse({
        status: 401,
        statusText: 'Unauthorized',
        body: 'auth required',
      });
    });

    try {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: fetchMock,
          stdin: Readable.from(delayedLines([
            `${swaggerUiUrl}\n`,
            'skip\n',
          ])),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, bestCandidateUrl);
      assert.match(promptOutput.output(), /Best OpenAPI JSON URL candidate so far: https:\/\/private\.example\.com\/v3\/api-docs/);
      assert.match(promptOutput.output(), /Skipping reachability check\. Saving sourceUrl anyway: https:\/\/private\.example\.com\/v3\/api-docs/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init accepts a discovered JSON path when GET validation times out but HEAD confirms JSON',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prompt-head-'));
    const promptOutput = createWritableCapture();
    const swaggerUiUrl = 'https://dev-api.example.com/swagger-ui/index.html#/';
    const discoveredUrl = 'https://dev-api.example.com/v3/api-docs';
    const fetchMock = createOpenApiFetchMock((url, options) => {
      const method = options.method ?? 'GET';

      if (url === swaggerUiUrl) {
        return createOpenApiFetchResponse({
          body: '<!doctype html><html></html>',
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url === discoveredUrl && method === 'GET') {
        const error = new Error('request timed out');
        error.name = 'TimeoutError';
        throw error;
      }

      if (url === discoveredUrl && method === 'HEAD') {
        return createOpenApiFetchResponse({
          body: '',
          headers: { 'content-type': 'application/json' },
        });
      }

      return createOpenApiFetchResponse({
        status: 401,
        statusText: 'Unauthorized',
        body: 'auth required',
      });
    });

    try {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: fetchMock,
          stdin: Readable.from(delayedLines([`${swaggerUiUrl}\n`])),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, discoveredUrl);
      assert.deepEqual(
        fetchMock.calls.map((call) => `${call.options.method ?? 'GET'} ${call.url}`),
        [
          `GET ${swaggerUiUrl}`,
          `GET ${discoveredUrl}`,
          `HEAD ${discoveredUrl}`,
        ],
      );
      assert.match(promptOutput.output(), /x GET https:\/\/dev-api\.example\.com\/swagger-ui\/index\.html#\/ - response is not JSON/);
      assert.match(promptOutput.output(), /x GET https:\/\/dev-api\.example\.com\/v3\/api-docs - request timed out after 5000ms/);
      assert.match(promptOutput.output(), /✓ HEAD https:\/\/dev-api\.example\.com\/v3\/api-docs - JSON endpoint reachable \(GET validation timed out\)/);
      assert.match(promptOutput.output(), /Using discovered sourceUrl: https:\/\/dev-api\.example\.com\/v3\/api-docs/);
      assert.doesNotMatch(promptOutput.output(), /Could not find a reachable OpenAPI JSON URL/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init asks again when prompted sourceUrl checks fail',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prompt-retry-'));
    const promptOutput = createWritableCapture();
    const fetchMock = createOpenApiFetchMock((url) => {
      if (url === 'https://good.example.com/openapi.json') {
        return createOpenApiFetchResponse();
      }

      return createOpenApiFetchResponse({ status: 404, statusText: 'Not Found', body: 'not found' });
    });

    try {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: fetchMock,
          stdin: Readable.from(delayedLines([
            'https://bad.example.com/openapi.json\n',
            'https://good.example.com/openapi.json\n',
          ])),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, 'https://good.example.com/openapi.json');
      assert.match(promptOutput.output(), /Could not find a reachable OpenAPI JSON URL/);
      assert.match(promptOutput.output(), /x GET https:\/\/bad\.example\.com\/openapi\.json - HTTP 404 Not Found/);
      assert.match(promptOutput.output(), /✓ GET https:\/\/good\.example\.com\/openapi\.json - OpenAPI 3\.0\.3/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init can save an unreachable prompted sourceUrl when the user types skip',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prompt-skip-'));
    const promptOutput = createWritableCapture();
    const sourceUrl = 'https://private.example.com/openapi.json';
    const fetchMock = createOpenApiFetchMock(() =>
      createOpenApiFetchResponse({ status: 401, statusText: 'Unauthorized', body: 'auth required' }),
    );

    try {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: fetchMock,
          stdin: Readable.from(delayedLines([
            `${sourceUrl}\n`,
            'skip\n',
          ])),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, sourceUrl);
      assert.match(promptOutput.output(), /x GET https:\/\/private\.example\.com\/openapi\.json - HTTP 401 Unauthorized/);
      assert.match(promptOutput.output(), /type "skip" to save this URL anyway/);
      assert.match(promptOutput.output(), /Skipping reachability check\. Saving sourceUrl anyway: https:\/\/private\.example\.com\/openapi\.json/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init colors sourceUrl checks in interactive terminals',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prompt-color-'));
    const promptOutput = createWritableCapture({ forceColor: true, isTTY: true });

    try {
      await initCommand.run({
        argv: [],
        context: {
          interactive: true,
          fetch: createOpenApiFetchMock(),
          stdin: Readable.from(['https://color.example.com/openapi.json\n']),
          stdout: promptOutput.writable,
          targetRoot: workspace,
        },
      });

      assert.match(promptOutput.output(), /\x1b\[32m✓\x1b\[0m GET https:\/\/color\.example\.com\/openapi\.json - OpenAPI 3\.0\.3/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init applies --source-url override to project config and output',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-source-url-'));
    const sourceUrl = 'https://api.example.com/v3/api-docs';

    try {
      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['init', '--source-url', sourceUrl])),
      );

      const projectConfigSource = await fs.readFile(
        path.join(workspace, 'openapi/config/project.jsonc'),
        'utf8',
      );
      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, sourceUrl);
      assert.match(projectConfigSource, /"sourceUrl": "https:\/\/api\.example\.com\/v3\/api-docs"/);
      assert.doesNotMatch(projectConfigSource, /"sourceUrl": "http:\/\/localhost:8080\/v3\/api-docs"/);
      assert.match(output, /sourceUrl: https:\/\/api\.example\.com\/v3\/api-docs/);
      assert.match(output, /edit sourceUrl later: .*openapi[\\/]config[\\/]project\.jsonc \(field: sourceUrl\)/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init refuses to create lower-priority config when root config already exists',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-root-config-'));

    try {
      await writeJsonFile(path.join(workspace, 'openapi.config.jsonc'), {
        sourceUrl: 'https://old.example.com/v3/api-docs',
        sourcePath: 'openapi/_internal/source/openapi.json',
      });

      await assert.rejects(
        () => runInWorkspace(workspace, () =>
          runCli(['init', '--source-url', 'https://new.example.com/v3/api-docs']),
        ),
        /Project config already exists: .*openapi\.config\.jsonc\nThis config has priority over .*openapi\/config\/project\.jsonc/,
      );
      await assert.rejects(
        () => runInWorkspace(workspace, () =>
          runCli(['init', '--force', '--source-url', 'https://new.example.com/v3/api-docs']),
        ),
        /Project config already exists: .*openapi\.config\.jsonc\nThis config has priority over .*openapi\/config\/project\.jsonc/,
      );
      await assert.rejects(
        () => fs.access(path.join(workspace, 'openapi/config/project.jsonc')),
        /ENOENT/,
      );
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init allows creating target config when only lower-priority config exists',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-lower-config-'));
    const sourceUrl = 'https://new.example.com/v3/api-docs';

    try {
      await writeJsonFile(path.join(workspace, 'config/project.jsonc'), {
        sourceUrl: 'https://old.example.com/v3/api-docs',
        sourcePath: 'openapi/_internal/source/openapi.json',
      });

      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['init', '--source-url', sourceUrl])),
      );

      const projectConfig = await readJson(
        path.join(workspace, 'openapi/config/project.jsonc'),
      );

      assert.equal(projectConfig.sourceUrl, sourceUrl);
      assert.match(output, /sourceUrl: https:\/\/new\.example\.com\/v3\/api-docs/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init without force fails on target config when lower-priority config also exists',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), 'openapi-projector-mixed-config-no-force-'),
    );
    const targetConfigPath = path.join(workspace, 'openapi/config/project.jsonc');
    const lowerPriorityConfigPath = path.join(workspace, 'config/project.jsonc');
    const targetConfigSourceBefore = `{
  // target config should remain byte-for-byte on init failure
  "sourceUrl": "https://target.example.com/v3/api-docs",
  "sourcePath": "openapi/_internal/source/openapi.json",
  "outputs": {
    "reviewDir": "custom/review",
  },
}
`;
    const lowerPriorityConfigSourceBefore = `{
  // lower-priority config should also remain untouched
  "sourceUrl": "https://lower.example.com/v3/api-docs",
  "sourcePath": "custom/lower/openapi.json",
  "outputs": {
    "reviewDir": "lower/review",
  },
}
`;
    const targetConfigBefore = {
      sourceUrl: 'https://target.example.com/v3/api-docs',
      sourcePath: 'openapi/_internal/source/openapi.json',
      outputs: {
        reviewDir: 'custom/review',
      },
    };
    const lowerPriorityConfigBefore = {
      sourceUrl: 'https://lower.example.com/v3/api-docs',
      sourcePath: 'custom/lower/openapi.json',
      outputs: {
        reviewDir: 'lower/review',
      },
    };

    try {
      await fs.mkdir(path.dirname(targetConfigPath), { recursive: true });
      await fs.mkdir(path.dirname(lowerPriorityConfigPath), { recursive: true });
      await fs.writeFile(targetConfigPath, targetConfigSourceBefore, 'utf8');
      await fs.writeFile(lowerPriorityConfigPath, lowerPriorityConfigSourceBefore, 'utf8');

      await assert.rejects(
        () => runInWorkspace(workspace, () =>
          runCli(['init', '--source-url', 'https://new.example.com/v3/api-docs']),
        ),
        /Project config already exists: .*openapi\/config\/project\.jsonc\nRe-run with --force/,
      );

      const targetConfig = await readJson(targetConfigPath);
      const lowerPriorityConfig = await readJson(lowerPriorityConfigPath);
      const targetConfigSource = await fs.readFile(targetConfigPath, 'utf8');
      const lowerPriorityConfigSource = await fs.readFile(lowerPriorityConfigPath, 'utf8');

      assert.deepEqual(targetConfig, targetConfigBefore);
      assert.deepEqual(lowerPriorityConfig, lowerPriorityConfigBefore);
      assert.equal(targetConfigSource, targetConfigSourceBefore);
      assert.equal(lowerPriorityConfigSource, lowerPriorityConfigSourceBefore);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init force keeps target config preferred when lower-priority config also exists',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-mixed-config-'));
    const targetConfigPath = path.join(workspace, 'openapi/config/project.jsonc');
    const lowerPriorityConfigPath = path.join(workspace, 'config/project.jsonc');
    const sourceUrl = 'https://new.example.com/v3/api-docs';

    try {
      await writeJsonFile(targetConfigPath, {
        sourceUrl: 'https://target.example.com/v3/api-docs',
        sourcePath: 'openapi/_internal/source/openapi.json',
      });
      await writeJsonFile(lowerPriorityConfigPath, {
        sourceUrl: 'https://lower.example.com/v3/api-docs',
        sourcePath: 'openapi/_internal/source/openapi.json',
      });

      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () =>
          runCli(['init', '--force', '--source-url', sourceUrl]),
        ),
      );

      const targetConfig = await readJson(targetConfigPath);
      const lowerPriorityConfig = await readJson(lowerPriorityConfigPath);

      assert.equal(targetConfig.sourceUrl, sourceUrl);
      assert.equal(lowerPriorityConfig.sourceUrl, 'https://lower.example.com/v3/api-docs');
      assert.match(output, /sourceUrl: https:\/\/new\.example\.com\/v3\/api-docs/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli help keeps first-time setup focused on a single init command',
  { concurrency: false },
  async () => {
    const { output } = await captureConsoleLog(() => runCli(['help']));

    assert.match(output, /npx --yes openapi-projector init/);
    assert.match(output, /interactive terminals can confirm, validate, or retry the default sourceUrl/);
    assert.match(output, /CI\/scripts can pass --source-url explicitly or use --no-input/);
    assert.match(output, /upgrade-docs\s+기존 설정은 보존하고 openapi\/README\.md 안내 문서만 최신화/);
    assert.doesNotMatch(output, /npx --yes openapi-projector init --source-url/);
  },
);

test(
  'cli init fails without force when project config already exists',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-rerun-'));
    const projectConfigPath = path.join(workspace, 'openapi/config/project.jsonc');

    try {
      await writeJsonFile(projectConfigPath, {
        sourceUrl: 'https://existing.example.com/v3/api-docs',
        sourcePath: 'openapi/_internal/source/openapi.json',
      });

      await assert.rejects(
        () => runInWorkspace(workspace, () => runCli(['init'])),
        /Project config already exists: .*openapi\/config\/project\.jsonc\nRe-run with --force/,
      );

      const projectConfigSource = await fs.readFile(projectConfigPath, 'utf8');

      assert.match(projectConfigSource, /"sourceUrl": "https:\/\/existing\.example\.com\/v3\/api-docs"/);
      await assert.rejects(
        () => fs.access(path.join(workspace, '.openapi-projector.local.jsonc')),
        /ENOENT/,
      );
      await assert.rejects(
        () => fs.access(path.join(workspace, 'openapi/README.md')),
        /ENOENT/,
      );
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init force reinitializes existing bootstrap files',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-force-'));
    const projectConfigPath = path.join(workspace, 'openapi/config/project.jsonc');
    const projectRulesPath = path.join(workspace, 'openapi/config/project-rules.jsonc');
    const projectReadmePath = path.join(workspace, 'openapi/README.md');
    const openapiGitignorePath = path.join(workspace, 'openapi/.gitignore');

    try {
      await writeJsonFile(projectConfigPath, {
        sourceUrl: 'https://existing.example.com/v3/api-docs',
        sourcePath: 'custom/openapi.json',
      });
      await fs.writeFile(projectRulesPath, '{ "custom": true }\n', 'utf8');
      await fs.writeFile(projectReadmePath, '# custom guide\n', 'utf8');
      await fs.writeFile(openapiGitignorePath, 'custom-cache.json\n', 'utf8');

      await runInWorkspace(workspace, () => runCli(['init', '--force']));

      const projectConfigSource = await fs.readFile(projectConfigPath, 'utf8');
      const projectRulesSource = await fs.readFile(projectRulesPath, 'utf8');
      const projectReadmeSource = await fs.readFile(projectReadmePath, 'utf8');
      const openapiGitignoreSource = await fs.readFile(openapiGitignorePath, 'utf8');

      assert.match(projectConfigSource, /"sourceUrl": "http:\/\/localhost:8080\/v3\/api-docs"/);
      assert.match(projectRulesSource, /"rulesReviewed": false/);
      assert.match(projectRulesSource, /"fetchApiImportPath": "@\/shared\/api"/);
      assert.match(projectRulesSource, /"fetchApiImportKind": "named"/);
      assert.match(projectReadmeSource, /# openapi-projector Workspace Guide/);
      assert.match(projectReadmeSource, /## 빠른 시작/);
      assert.match(projectReadmeSource, /<details>/);
      assert.doesNotMatch(projectReadmeSource, /<summary>AI에게 붙여넣을 프롬프트<\/summary>/);
      assert.match(projectReadmeSource, /<summary>AI Agents: Detailed Workflow<\/summary>/);
      assert.match(projectReadmeSource, /## For AI Agents: Detailed Workflow/);
      assert.equal(
        openapiGitignoreSource,
        '# openapi-projector generated artifacts\nchanges.md\nchanges.json\n_internal/\nreview/\nproject/\n',
      );
      await assertExists(path.join(workspace, 'openapi/README.md'));
      await assertExists(path.join(workspace, 'openapi/config/project-rules.jsonc'));
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli upgrade-docs updates generated README without touching config or rules',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-upgrade-docs-'));
    const projectConfigPath = path.join(workspace, 'openapi/config/project.jsonc');
    const projectRulesPath = path.join(workspace, 'openapi/config/project-rules.jsonc');
    const projectReadmePath = path.join(workspace, 'openapi/README.md');

    try {
      await writeJsonFile(projectConfigPath, {
        sourceUrl: 'https://existing.example.com/v3/api-docs',
        sourcePath: 'custom/openapi.json',
      });
      await fs.writeFile(projectRulesPath, '{ "custom": true }\n', 'utf8');
      await fs.writeFile(projectReadmePath, '# stale guide\n', 'utf8');

      const beforeProjectConfig = await fs.readFile(projectConfigPath, 'utf8');
      const beforeProjectRules = await fs.readFile(projectRulesPath, 'utf8');
      const { output } = await captureConsoleLog(() =>
        runInWorkspace(workspace, () => runCli(['upgrade-docs'])),
      );

      const afterProjectConfig = await fs.readFile(projectConfigPath, 'utf8');
      const afterProjectRules = await fs.readFile(projectRulesPath, 'utf8');
      const projectReadmeSource = await fs.readFile(projectReadmePath, 'utf8');

      assert.equal(afterProjectConfig, beforeProjectConfig);
      assert.equal(afterProjectRules, beforeProjectRules);
      assert.match(projectReadmeSource, /# openapi-projector Workspace Guide/);
      assert.match(projectReadmeSource, /Option A\. AI에게 맡기기/);
      assert.match(projectReadmeSource, /Option B\. 직접 진행하기/);
      assert.match(projectReadmeSource, /Swagger 변경 비교/);
      assert.doesNotMatch(projectReadmeSource, /### 6\. Git 관리/);
      assert.doesNotMatch(projectReadmeSource, /npx --yes openapi-projector@latest upgrade-docs/);
      assert.doesNotMatch(projectReadmeSource, /# stale guide/);
      assert.match(output, /^✓ Updated openapi generated docs in /m);
      assert.match(output, /project guide: .*openapi\/README\.md \(overwritten\)/);
      assert.match(output, /kept project config: .*openapi\/config\/project\.jsonc/);
      assert.match(output, /kept project rules, review history, and generated candidates unchanged/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli upgrade-docs fails before init',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-upgrade-docs-missing-'));
    const projectReadmePath = path.join(workspace, 'openapi/README.md');

    try {
      await fs.mkdir(path.dirname(projectReadmePath), { recursive: true });
      await fs.writeFile(projectReadmePath, '# unrelated guide\n', 'utf8');

      await assert.rejects(
        () => runInWorkspace(workspace, () => runCli(['upgrade-docs'])),
        /OpenAPI workspace not found\.\nRun npx --yes openapi-projector init before upgrading generated docs\./,
      );

      const projectReadmeSource = await fs.readFile(projectReadmePath, 'utf8');
      assert.equal(projectReadmeSource, '# unrelated guide\n');
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli executable prefixes refresh failures with failure mark',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-cli-failure-'));

    try {
      await writeJsonFile(path.join(workspace, 'openapi/config/project.jsonc'), {
        sourceUrl: 'data:application/json,not-json',
        sourcePath: 'openapi/_internal/source/openapi.json',
      });

      await assert.rejects(
        () =>
          execFileAsync(process.execPath, [
            path.join(REPO_ROOT, 'bin/openapi-tool.mjs'),
            '--project-root',
            workspace,
            'refresh',
          ]),
        (error) => {
          assert.equal(error.code, 1);
          assert.match(error.stdout, /^✓ Downloaded OpenAPI spec to /m);
          assert.match(
            error.stderr,
            /^x Only OpenAPI 3\.0\/3\.1 JSON is supported in MVP v2\./,
          );
          return true;
        },
      );
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli ignores invalid legacy local config when projector config has projectRoot',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-cli-'));

    try {
      await withToolLocalConfigs(
        {
          projector: {
            projectRoot: workspace,
            initDefaults: {
              sourceUrl: 'https://projector.example.com/v3/api-docs',
            },
          },
          legacy: '{ broken json',
        },
        async () => {
          await runCli(['init']);
          await assertExists(path.join(workspace, 'openapi/config/project.jsonc'));
        },
      );
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli init still supports legacy tool local config projectRoot and initDefaults',
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
  'cli falls back to legacy local config when projector config has blank projectRoot',
  { concurrency: false },
  async () => {
    const legacyWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-tool-cli-'));

    try {
      await withToolLocalConfigs(
        {
          projector: {
            projectRoot: '',
            initDefaults: {
              sourceUrl: 'https://projector.example.com/v3/api-docs',
            },
          },
          legacy: {
            projectRoot: legacyWorkspace,
            initDefaults: {
              sourceUrl: 'https://legacy.example.com/v3/api-docs',
            },
          },
        },
        async () => {
          await runCli(['init']);

          const projectConfigSource = await fs.readFile(
            path.join(legacyWorkspace, 'openapi/config/project.jsonc'),
            'utf8',
          );

          assert.match(projectConfigSource, /"sourceUrl": "https:\/\/legacy\.example\.com\/v3\/api-docs"/);
        },
      );
    } finally {
      await fs.rm(legacyWorkspace, { recursive: true, force: true });
    }
  },
);

test(
  'doctor reports missing local config and projectRoot without throwing',
  { concurrency: false },
  async () => {
    const result = await doctorCommand.run({
      context: {
        targetRoot: null,
        toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
        toolLocalConfig: null,
      },
    });

    assert.equal(result.ok, false);
  },
);

test(
  'doctor allows fresh target when initDefaults sourceUrl can seed prepare',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-doctor-'));
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(spec))}`;
    const previousExitCode = process.exitCode;

    try {
      process.exitCode = undefined;
      await withToolLocalConfigs(
        {
          projector: {
            projectRoot: workspace,
            initDefaults: {
              sourceUrl,
            },
          },
        },
        async () => {
          await runCli(['doctor']);
          assert.equal(process.exitCode, undefined);
        },
      );
    } finally {
      process.exitCode = previousExitCode;
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'doctor fails when existing project config is invalid JSON',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-doctor-'));
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(spec))}`;

    try {
      await fs.mkdir(path.join(workspace, 'openapi/config'), { recursive: true });
      await fs.writeFile(
        path.join(workspace, 'openapi/config/project.jsonc'),
        '{ broken json',
        'utf8',
      );

      const result = await doctorCommand.run({
        context: {
          targetRoot: workspace,
          toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
          toolLocalConfig: {
            initDefaults: {
              sourceUrl,
            },
          },
        },
      });

      assert.equal(result.ok, false);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'doctor fails when existing project config has unsafe generated paths',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-doctor-'));

    try {
      await writeJsonFile(path.join(workspace, 'openapi/config/project.jsonc'), {
        sourceUrl: 'https://api.example.com/v3/api-docs',
        sourcePath: '../openapi.json',
      });

      const result = await doctorCommand.run({
        context: {
          targetRoot: workspace,
          toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
          toolLocalConfig: null,
        },
      });

      assert.equal(result.ok, false);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'doctor fails when existing project config has blank sourceUrl',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace({ spec }, async (workspace) => {
      const result = await doctorCommand.run({
        context: {
          targetRoot: workspace,
          toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
          toolLocalConfig: null,
        },
      });

      assert.equal(result.ok, false);
    });
  },
);

test(
  'doctor fails when downloaded OpenAPI JSON has invalid root shape',
  { concurrency: false },
  async () => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Malformed API',
        version: '1.0.0',
      },
      paths: [],
    };
    const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(spec))}`;

    await withWorkspace({ spec }, async (workspace) => {
      const projectConfigPath = path.join(workspace, 'openapi/config/project.jsonc');
      const projectConfig = JSON.parse(await fs.readFile(projectConfigPath, 'utf8'));
      await writeJsonFile(projectConfigPath, {
        ...projectConfig,
        sourceUrl,
      });

      const result = await doctorCommand.run({
        context: {
          targetRoot: workspace,
          toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
          toolLocalConfig: null,
        },
      });

      assert.equal(result.ok, false);
    });
  },
);

test(
  'doctor fails readiness when project rules are valid but not reviewed',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(spec))}`;

    await withWorkspace(
      {
        spec,
        rules: {
          review: {
            rulesReviewed: false,
            notes: [],
          },
          api: {
            fetchApiImportPath: '../../test-support/fetch-api',
            fetchApiSymbol: 'fetchAPI',
            fetchApiImportKind: 'named',
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
        const projectConfigPath = path.join(workspace, 'openapi/config/project.jsonc');
        const projectConfig = JSON.parse(await fs.readFile(projectConfigPath, 'utf8'));
        await writeJsonFile(projectConfigPath, {
          ...projectConfig,
          sourceUrl,
        });

        const { result, output } = await captureConsoleLog(() =>
          doctorCommand.run({
            context: {
              targetRoot: workspace,
              toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
              toolLocalConfig: null,
            },
          }),
        );

        assert.equal(result.ok, false);
        assert.match(output, /Project rules are valid but not reviewed/);
        assert.match(output, /review\.rulesReviewed to true/);
        assert.match(output, /Result: fix failed checks before continuing/);
      },
    );
  },
);

test(
  'doctor fails when existing project rules file is invalid JSON',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(spec))}`;

    await withWorkspace({ spec }, async (workspace) => {
      await writeJsonFile(path.join(workspace, 'openapi/config/project.jsonc'), {
        sourceUrl,
        sourcePath: 'openapi/_internal/source/openapi.json',
        catalogJsonPath: 'openapi/review/catalog/endpoints.json',
        catalogMarkdownPath: 'openapi/review/catalog/endpoints.md',
        docsDir: 'openapi/review/docs',
        generatedSchemaPath: 'openapi/review/generated/schema.ts',
        projectRulesAnalysisPath: 'openapi/review/project-rules/analysis.md',
        projectRulesPath: 'openapi/config/project-rules.jsonc',
        projectGeneratedSrcDir: 'openapi/project/src/openapi-generated',
      });
      await fs.writeFile(
        path.join(workspace, 'openapi/config/project-rules.jsonc'),
        '{ broken json',
        'utf8',
      );

      const result = await doctorCommand.run({
        context: {
          targetRoot: workspace,
          toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
          toolLocalConfig: null,
        },
      });

      assert.equal(result.ok, false);
    });
  },
);

test(
  'doctor fails on fresh target when stale project rules file is invalid JSON',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-doctor-'));
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(spec))}`;

    try {
      await fs.mkdir(path.join(workspace, 'openapi/config'), { recursive: true });
      await fs.writeFile(
        path.join(workspace, 'openapi/config/project-rules.jsonc'),
        '{ broken json',
        'utf8',
      );

      const result = await doctorCommand.run({
        context: {
          targetRoot: workspace,
          toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
          toolLocalConfig: {
            initDefaults: {
              sourceUrl,
            },
          },
        },
      });

      assert.equal(result.ok, false);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'doctor fails readiness on fresh target when stale project rules are unreviewed',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-doctor-'));
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(spec))}`;

    try {
      await fs.mkdir(path.join(workspace, 'openapi/config'), { recursive: true });
      await writeJsonFile(path.join(workspace, 'openapi/config/project-rules.jsonc'), {
        review: {
          rulesReviewed: false,
          notes: [],
        },
        api: {
          fetchApiImportPath: '@/shared/api',
          fetchApiSymbol: 'fetchAPI',
          fetchApiImportKind: 'named',
          adapterStyle: 'url-config',
          wrapperGrouping: 'tag',
          tagFileCase: 'title',
        },
        layout: {
          schemaFileName: 'schema.ts',
        },
      });

      const { result, output } = await captureConsoleLog(() =>
        doctorCommand.run({
          context: {
            targetRoot: workspace,
            toolLocalConfigPath: path.join(REPO_ROOT, '.openapi-projector.local.jsonc'),
            toolLocalConfig: {
              initDefaults: {
                sourceUrl,
              },
            },
          },
        }),
      );

      assert.equal(result.ok, false);
      assert.match(output, /Existing project rules are valid but not reviewed/);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'prepare generates project candidate output from current working directory',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prepare-'));
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(spec))}`;

    try {
      await runInWorkspace(
        workspace,
        async () => {
          await runCli(['init']);
          await setProjectSourceUrl(workspace, sourceUrl);
          const projectRulesPath = path.join(workspace, 'openapi/config/project-rules.jsonc');
          const projectRules = await readJson(projectRulesPath);
          await writeJsonFile(projectRulesPath, {
            ...projectRules,
            review: {
              ...(projectRules.review ?? {}),
              rulesReviewed: true,
            },
          });
          const { output } = await captureConsoleLog(() => runCli(['prepare']));

          assert.match(output, /^✓ prepare: running in /m);
          assert.match(output, /^✓ init: skipped because project config already exists/m);
          assert.match(output, /^✓ refresh: Swagger\/OpenAPI를 내려받고 이전 버전과 비교해 openapi\/changes\.md를 만듭니다\./m);
          assert.match(output, /^✓ rules: 현재 프론트엔드 프로젝트의 API 호출 규칙을 분석해 openapi\/config\/project-rules\.jsonc를 만듭니다\./m);
          assert.match(output, /^✓ project: 검토된 규칙으로 DTO\/API 후보를 생성합니다\./m);
          assert.match(output, /^✓ prepare complete: openapi\/project\/summary\.md를 확인하세요\./m);

          await assertExists(path.join(workspace, 'openapi/config/project.jsonc'));
          await assertExists(path.join(workspace, 'openapi/review/generated/schema.ts'));
          await assertExists(path.join(workspace, 'openapi/config/project-rules.jsonc'));
          await assertExists(path.join(workspace, 'openapi/project/manifest.json'));
          await assertExists(path.join(workspace, 'openapi/project/summary.md'));
        },
      );
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'prepare stops before project until project rules are reviewed',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-prepare-review-'));
    const spec = await readFixtureJson('oas30.json');
    const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(spec))}`;

    try {
      await runInWorkspace(
        workspace,
        async () => {
          await runCli(['init']);
          await setProjectSourceUrl(workspace, sourceUrl);

          await assert.rejects(
            () => runCli(['prepare']),
            /Project rules have not been reviewed/,
          );
          await assert.rejects(
            () => runCli(['prepare', '--project']),
            /Project rules have not been reviewed/,
          );
          await assert.rejects(
            () => runCli(['prepare', '--yes']),
            /Project rules have not been reviewed/,
          );
          await assert.rejects(
            () => runCli(['prepare', '--force-project']),
            /Project rules have not been reviewed/,
          );

          await assertExists(path.join(workspace, 'openapi/review/project-rules/analysis.md'));
          await assert.rejects(
            () => fs.access(path.join(workspace, 'openapi/project/manifest.json')),
            /ENOENT/,
          );
        },
      );
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'prepare uses default localhost sourceUrl after init',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-missing-url-'));
    const spec = await readFixtureJson('oas30.json');
    const originalFetch = globalThis.fetch;
    const requestedUrls = [];

    try {
      globalThis.fetch = async (url) => {
        requestedUrls.push(String(url));
        return new Response(JSON.stringify(spec), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        });
      };

      await runInWorkspace(workspace, async () => {
        await runCli(['init']);
        await assert.rejects(
          () => runCli(['prepare']),
          /Project rules have not been reviewed\./,
        );
      });

      assert.deepEqual(requestedUrls, ['http://localhost:8080/v3/api-docs']);
    } finally {
      globalThis.fetch = originalFetch;
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'cli reports project config missing in current working directory',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-empty-'));

    try {
      await assert.rejects(
        () => runInWorkspace(workspace, () => runCli(['project'])),
        /Project config not found\./,
      );
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'project stops until project rules are reviewed',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace(
      {
        spec,
        rules: {
          review: {
            rulesReviewed: false,
            notes: [],
          },
          api: {
            fetchApiImportPath: '../../test-support/fetch-api',
            fetchApiSymbol: 'fetchAPI',
            fetchApiImportKind: 'named',
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
        await assert.rejects(
          () => runInWorkspace(workspace, () => projectCommand.run()),
          /Project rules have not been reviewed/,
        );

        await assert.rejects(
          () => fs.access(path.join(workspace, 'openapi/project/manifest.json')),
          /ENOENT/,
        );
      },
    );
  },
);

test(
  'project rejects reviewed rules without adapterStyle before cleaning generated output',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace(
      {
        spec,
        rules: {
          review: {
            rulesReviewed: true,
            notes: [],
          },
          api: {
            fetchApiImportPath: '../../test-support/fetch-api',
            fetchApiSymbol: 'fetchAPI',
            fetchApiImportKind: 'named',
            wrapperGrouping: 'tag',
            tagFileCase: 'title',
          },
          layout: {
            schemaFileName: 'schema.ts',
          },
        },
        extraFiles: [
          {
            path: 'openapi/project/src/openapi-generated/keep.ts',
            content: 'export const keep = true;\n',
          },
        ],
      },
      async (workspace) => {
        await assert.rejects(
          () => runInWorkspace(workspace, () => projectCommand.run()),
          /api\.adapterStyle: is required when review\.rulesReviewed is true/,
        );

        await assertExists(
          path.join(workspace, 'openapi/project/src/openapi-generated/keep.ts'),
        );
      },
    );
  },
);

test(
  'cli uses current working directory when local config projectRoot is blank',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-blank-local-'));

    try {
      await fs.writeFile(
        path.join(workspace, '.openapi-projector.local.jsonc'),
        JSON.stringify({ projectRoot: '', initDefaults: { sourceUrl: '' } }, null, 2),
        'utf8',
      );

      await runInWorkspace(workspace, async () => {
        await assert.rejects(
          () => runCli(['project']),
          /Project config not found\./,
        );
      });
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  },
);

test(
  'project creates tag wrapper candidates and manifest for manual handoff',
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
      const profilesDtoPath = path.join(generatedRoot, 'Profiles/update-profile.dto.ts');
      const defaultApiPath = path.join(generatedRoot, 'default/get-health-status.api.ts');
      const profilesApiPath = path.join(generatedRoot, 'Profiles/update-profile.api.ts');
      const manifestPath = path.join(workspace, 'openapi/project/manifest.json');
      await assertExists(path.join(generatedRoot, 'schema.ts'));
      await assertExists(defaultDtoPath);
      await assertExists(profilesDtoPath);
      await assertExists(defaultApiPath);
      await assertExists(profilesApiPath);
      await assert.rejects(() => fs.access(path.join(generatedRoot, 'default/index.ts')), /ENOENT/);
      await assert.rejects(() => fs.access(path.join(generatedRoot, 'Profiles/index.ts')), /ENOENT/);
      await assert.rejects(() => fs.access(path.join(generatedRoot, 'index.ts')), /ENOENT/);
      await assertExists(manifestPath);

      const defaultApiSource = await fs.readFile(defaultApiPath, 'utf8');
      const defaultDtoSource = await fs.readFile(defaultDtoPath, 'utf8');
      const profilesApiSource = await fs.readFile(profilesApiPath, 'utf8');
      const profilesDtoSource = await fs.readFile(profilesDtoPath, 'utf8');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      assert.match(defaultApiSource, /export const getHealthStatus = async/);
      assert.match(defaultApiSource, /from '\.\/get-health-status\.dto'/);
      assert.match(defaultApiSource, /from '\.\.\/\.\.\/test-support\/fetch-api'/);
      assert.match(defaultDtoSource, /export interface GetHealthStatusResponseDto \{/);
      assert.match(defaultDtoSource, /message\?: string \| null;/);
      assert.match(profilesApiSource, /export const updateProfile = async/);
      assert.match(profilesApiSource, /from '\.\/update-profile\.dto'/);
      assert.match(profilesApiSource, /method: "PATCH"/);
      assert.match(profilesApiSource, /`\/profiles\/\$\{encodeURIComponent\(String\(id\)\)\}`/);
      assert.match(profilesDtoSource, /bio\?: string \| null;/);
      assert.doesNotMatch(defaultDtoSource, /unknown/);
      assert.doesNotMatch(profilesDtoSource, /unknown/);
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
  'project rejects invalid project rules before cleaning generated output',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');

    await withWorkspace(
      {
        spec,
        rules: {
          api: {
            fetchApiImportPath: '../../test-support/fetch-api',
            fetchApiSymbol: 'fetch-api',
            adapterStyle: 'axios',
            wrapperGrouping: 'operation',
            tagFileCase: 'snake',
          },
          layout: {
            schemaFileName: '../schema.ts',
          },
        },
        extraFiles: [
          {
            path: 'openapi/project/src/openapi-generated/keep.ts',
            content: 'export const keep = true;\n',
          },
        ],
      },
      async (workspace) => {
        await assert.rejects(
          () => runInWorkspace(workspace, () => projectCommand.run()),
          /api\.fetchApiSymbol: must be a valid JavaScript identifier.*layout\.schemaFileName: must be a file name, not a path/,
        );

        await assertExists(
          path.join(workspace, 'openapi/project/src/openapi-generated/keep.ts'),
        );
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

        await assertExists(path.join(tagDir, 'get-banner.dto.ts'));
        await assertExists(path.join(tagDir, 'get-banner.api.ts'));
        await assert.rejects(
          () => fs.access(path.join(workspace, 'openapi/project/src/openapi-generated/index.ts')),
          /ENOENT/,
        );

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
  'rules preserves customized kebab tagFileCase',
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
        assert.match(migratedRulesSource, /"tagFileCase": "kebab"/);
        assert.doesNotMatch(migratedRulesSource, /"tagFileCase": "title"/);

        await runInWorkspace(workspace, () => generateCommand.run());
        await runInWorkspace(workspace, () => projectCommand.run());

        await assertExists(
          path.join(
            workspace,
            'openapi/project/src/openapi-generated/199-bos-api/get-banner.dto.ts',
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
        assert.match(userApiSource, /url: `\/users\/\$\{encodeURIComponent\(String\(id\)\)\}`/);
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
  'project selects supported JSON media types from alternatives',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/reports/typed'] = {
      post: {
        tags: ['Reports'],
        operationId: 'createTypedReport',
        requestBody: {
          required: true,
          content: {
            'text/plain': {
              schema: {
                type: 'string',
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'text/csv': {
                schema: {
                  type: 'string',
                },
              },
              'application/vnd.report+json': {
                schema: {
                  type: 'object',
                  required: ['id'],
                  properties: {
                    id: {
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

      const generatedRoot = path.join(workspace, 'openapi/project/src/openapi-generated');
      const dtoSource = await fs.readFile(
        path.join(generatedRoot, 'Reports/create-typed-report.dto.ts'),
        'utf8',
      );
      const apiSource = await fs.readFile(
        path.join(generatedRoot, 'Reports/create-typed-report.api.ts'),
        'utf8',
      );
      const manifest = JSON.parse(
        await fs.readFile(path.join(workspace, 'openapi/project/manifest.json'), 'utf8'),
      );

      assert.match(dtoSource, /export interface CreateTypedReportRequestDto \{/);
      assert.match(dtoSource, /name: string;/);
      assert.match(dtoSource, /export interface CreateTypedReportResponseDto \{/);
      assert.match(dtoSource, /id: string;/);
      assert.doesNotMatch(dtoSource, /export type CreateTypedReportRequestDto = string;/);
      assert.doesNotMatch(dtoSource, /export type CreateTypedReportResponseDto = string;/);
      assert.match(apiSource, /data: requestDto/);
      assert.equal(manifest.skippedEndpoints, 0);
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
      assert.match(apiSource, /\/admin\/corporate-members\/\$\{encodeURIComponent\(String\(userId\)\)\}/);
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
  'project skips operations without explicit 2xx success responses',
  { concurrency: false },
  async () => {
    const spec = await readFixtureJson('oas30.json');
    spec.paths['/reports/error-only'] = {
      get: {
        tags: ['Reports'],
        operationId: 'getErrorOnlyReport',
        responses: {
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
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

      const generatedRoot = path.join(workspace, 'openapi/project/src/openapi-generated');
      const manifest = JSON.parse(
        await fs.readFile(path.join(workspace, 'openapi/project/manifest.json'), 'utf8'),
      );

      await assert.rejects(
        () => fs.access(path.join(generatedRoot, 'Reports/get-error-only-report.api.ts')),
        /ENOENT/,
      );
      assert.equal(manifest.totalEndpoints, 3);
      assert.equal(manifest.generatedEndpoints, 2);
      assert.equal(manifest.skippedEndpoints, 1);
      assert.deepEqual(manifest.skippedOperations, [
        {
          method: 'GET',
          path: '/reports/error-only',
          reasons: ['missing success response'],
        },
      ]);
    });
  },
);

test(
  'project skips unsupported non-json success responses and records warnings',
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
      await runInWorkspace(workspace, () => projectCommand.run());

      const generatedRoot = path.join(workspace, 'openapi/project/src/openapi-generated');
      const summarySource = await fs.readFile(
        path.join(workspace, 'openapi/project/summary.md'),
        'utf8',
      );
      const manifest = JSON.parse(
        await fs.readFile(path.join(workspace, 'openapi/project/manifest.json'), 'utf8'),
      );

      await assert.rejects(
        () => fs.access(path.join(generatedRoot, 'Reports/export-report.api.ts')),
        /ENOENT/,
      );
      assert.equal(manifest.totalEndpoints, 3);
      assert.equal(manifest.generatedEndpoints, 2);
      assert.equal(manifest.skippedEndpoints, 1);
      assert.deepEqual(manifest.skippedOperations, [
        {
          method: 'GET',
          path: '/reports/export',
          reasons: ['response media type text/csv'],
        },
      ]);
      assert.match(summarySource, /## Skipped Operations/);
      assert.match(summarySource, /`GET \/reports\/export`: response media type text\/csv/);
    });
  },
);
