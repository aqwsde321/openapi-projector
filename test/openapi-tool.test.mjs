import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { runCli } from '../src/cli.mjs';
import { catalogCommand } from '../src/commands/catalog.mjs';
import { doctorCommand } from '../src/commands/doctor.mjs';
import { generateCommand } from '../src/commands/generate.mjs';
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
      '"sourceUrl": "https://example.com/v3/api-docs"',
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

async function assertExists(filePath) {
  await fs.access(filePath);
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
  'catalog records contract comparison tables in change history',
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
            required: ['id'],
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
      nextSpec.components.schemas.User.required.push('email');
      nextSpec.components.schemas.User.properties.email.type = 'integer';
      nextSpec.components.schemas.User.properties.attachments = {
        type: 'array',
        items: {
          $ref: '#/components/schemas/File',
        },
      };

      await writeJsonFile(
        path.join(workspace, 'openapi/_internal/source/openapi.json'),
        nextSpec,
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
      const summarySource = await fs.readFile(
        path.join(workspace, 'openapi/review/changes/summary.md'),
        'utf8',
      );
      const historyJson = await readJson(path.join(historyDir, historyJsonFiles[0]));
      const detailPaths = historyJson.contractChanged[0].details.map(
        (detail) => detail.path,
      );

      assert.equal(historyJson.contractChanged.length, 1);
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
      assert.deepEqual(historyJson.contractChanged[0].comparisonRows[0], {
        category: 'Query Parameter',
        target: '`active`',
        previous: '없음',
        next: '`boolean`, required',
      });
      assert.deepEqual(historyJson.contractChanged[0].comparisonRows[1], {
        category: 'Response Body Field',
        target: '`User.attachments`',
        previous: '없음',
        next: '`File[]`',
      });
      assert.match(historySource, /Contract Changed: 1/);
      assert.match(
        summarySource,
        /\[DTO\]\(<\.\.\/\.\.\/project\/src\/openapi-generated\/Users\/get-users-by-id\.dto\.ts>\)/,
      );
      assert.match(
        summarySource,
        /\[API\]\(<\.\.\/\.\.\/project\/src\/openapi-generated\/Users\/get-users-by-id\.api\.ts>\)/,
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
        /\| 구분 \| 항목 \| 이전 \| 변경 \|/,
      );
      assert.match(
        historySource,
        /\| Query Parameter \| `active` \| 없음 \| `boolean`, required \|/,
      );
      assert.match(
        historySource,
        /\| Response Body Field \| `User\.attachments` \| 없음 \| `File\[\]` \|/,
      );
      assert.match(
        historySource,
        /\| Response Body Field \| `User\.email\.type` \| `string` \| `integer` \|/,
      );
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
      await runInWorkspace(workspace, () => runCli(['init']));

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
      assert.match(projectConfigSource, /"sourceUrl": "https:\/\/example\.com\/v3\/api-docs"/);
      assert.match(
        projectConfigSource,
        /"projectRulesAnalysisJsonPath": "openapi\/review\/project-rules\/analysis\.json"/,
      );
      assert.match(projectReadmeSource, /# openapi-projector Workspace Guide/);
      assert.match(projectReadmeSource, /## 사람용 요약/);
      assert.match(projectReadmeSource, /<details>/);
      assert.match(projectReadmeSource, /<summary>AI Agents: Detailed Workflow<\/summary>/);
      assert.match(projectReadmeSource, /## For AI Agents: Detailed Workflow/);
      assert.match(projectReadmeSource, /openapi\/review\/changes\/summary\.md/);
      assert.match(projectReadmeSource, /openapi\/review\/project-rules\/analysis\.json/);
      assert.match(projectReadmeSource, /Contract Changed/);
      assert.match(projectReadmeSource, /npx --yes openapi-projector rules/);
      assert.match(projectReadmeSource, /rg "fetchAPI\|apiClient\|request\|axios\|ky\|httpClient" src/);
      assert.match(projectReadmeSource, /openapi\/config\/project-rules\.jsonc/);
      assert.match(projectReadmeSource, /npx --yes openapi-projector prepare/);
      assert.match(gitignoreSource, /\.openapi-projector\.local\.jsonc/);

      const openapiGitignoreSource = await fs.readFile(
        path.join(workspace, 'openapi/.gitignore'),
        'utf8',
      );
      assert.match(openapiGitignoreSource, /_internal\//);
      assert.match(openapiGitignoreSource, /review\//);
      assert.match(openapiGitignoreSource, /project\//);
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
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

      assert.match(projectConfigSource, /"sourceUrl": "https:\/\/example\.com\/v3\/api-docs"/);
      assert.match(projectRulesSource, /"rulesReviewed": false/);
      assert.match(projectRulesSource, /"fetchApiImportPath": "@\/shared\/api"/);
      assert.match(projectRulesSource, /"fetchApiImportKind": "named"/);
      assert.match(projectReadmeSource, /# openapi-projector Workspace Guide/);
      assert.match(projectReadmeSource, /## 사람용 요약/);
      assert.match(projectReadmeSource, /<details>/);
      assert.match(projectReadmeSource, /<summary>AI Agents: Detailed Workflow<\/summary>/);
      assert.match(projectReadmeSource, /## For AI Agents: Detailed Workflow/);
      assert.equal(
        openapiGitignoreSource,
        '# openapi-projector generated artifacts\n_internal/\nreview/\nproject/\n',
      );
      await assertExists(path.join(workspace, 'openapi/README.md'));
      await assertExists(path.join(workspace, 'openapi/config/project-rules.jsonc'));
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
          await runCli(['prepare']);

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
  'prepare requires sourceUrl after init',
  { concurrency: false },
  async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-missing-url-'));

    try {
      await runInWorkspace(workspace, async () => {
        await runCli(['init']);
        await assert.rejects(
          () => runCli(['prepare']),
          /sourceUrl is not configured\.\nSet sourceUrl in openapi\/config\/project\.jsonc before running prepare\./,
        );
      });
    } finally {
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
