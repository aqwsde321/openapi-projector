#!/usr/bin/env node
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { assertPackagedInternalImportsResolvable } from './package-integrity.mjs';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const LOCAL_CLI_PATH = path.join(REPO_ROOT, 'bin/openapi-tool.mjs');
const NODE_MODULES_PATH = path.join(REPO_ROOT, 'node_modules');
const MAX_BUFFER = 1024 * 1024 * 20;
const FIXTURE_OPENAPI = {
  openapi: '3.0.3',
  info: {
    title: 'Release Smoke API',
    version: '1.0.0',
  },
  paths: {
    '/users': {
      post: {
        tags: ['Users'],
        operationId: 'createUser',
        summary: 'Create user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateUserRequest',
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
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        operationId: 'getUserById',
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
          {
            name: 'includePosts',
            in: 'query',
            schema: {
              type: 'boolean',
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
      CreateUserRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
          },
          email: {
            type: 'string',
            format: 'email',
          },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          email: {
            type: 'string',
            format: 'email',
          },
        },
      },
    },
  },
};

function usage() {
  return [
    'Usage: pnpm run smoke:release -- [options]',
    '',
    'Options:',
    '  --package <specifier>      Run the current smoke flow with npx package specifier.',
    '                             Example: openapi-projector@latest',
    '  --previous-tag <tag>       Previous release tag for compatibility smoke.',
    '  --skip-compat             Skip previous-tag workspace compatibility smoke.',
    '  --keep-temp               Keep the temporary workspace for inspection.',
    '  --help                    Show this help.',
  ].join('\n');
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index + 1] ?? null;
  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

function parseArgs(argv) {
  const options = {
    keepTemp: false,
    packageSpec: null,
    previousTag: null,
    skipCompat: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help') {
      console.log(usage());
      process.exit(0);
    }

    if (arg === '--') {
      continue;
    }

    if (arg === '--keep-temp') {
      options.keepTemp = true;
      continue;
    }

    if (arg === '--skip-compat') {
      options.skipCompat = true;
      continue;
    }

    if (arg === '--package') {
      options.packageSpec = readOptionValue(argv, index, '--package');
      index += 1;
      continue;
    }

    if (arg.startsWith('--package=')) {
      options.packageSpec = arg.slice('--package='.length) || null;
      if (!options.packageSpec || options.packageSpec.startsWith('--')) {
        throw new Error('--package requires a value.');
      }
      continue;
    }

    if (arg === '--previous-tag') {
      options.previousTag = readOptionValue(argv, index, '--previous-tag');
      index += 1;
      continue;
    }

    if (arg.startsWith('--previous-tag=')) {
      options.previousTag = arg.slice('--previous-tag='.length) || null;
      if (!options.previousTag || options.previousTag.startsWith('--')) {
        throw new Error('--previous-tag requires a value.');
      }
      continue;
    }

    throw new Error(`Unknown option: ${arg}\n\n${usage()}`);
  }

  if (options.packageSpec === '') {
    throw new Error('--package requires a package specifier.');
  }

  if (options.previousTag === '') {
    throw new Error('--previous-tag requires a git tag.');
  }

  return options;
}

function commandText(command, args) {
  return [command, ...args].join(' ');
}

async function execCommand(command, args, options = {}) {
  const {
    cwd = REPO_ROOT,
    env = process.env,
    expectFailure = false,
    silent = false,
  } = options;

  if (!silent) {
    console.log(`$ ${commandText(command, args)}`);
  }

  try {
    const result = await execFileAsync(command, args, {
      cwd,
      env,
      maxBuffer: MAX_BUFFER,
    });

    if (expectFailure) {
      const error = new Error(
        `Expected command to fail but it succeeded: ${commandText(command, args)}`,
      );
      error.commandUnexpectedlySucceeded = true;
      throw error;
    }

    return {
      status: 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } catch (error) {
    if (error.commandUnexpectedlySucceeded) {
      throw error;
    }

    if (expectFailure) {
      return {
        status: error.code ?? 1,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
      };
    }

    const stdout = error.stdout ? `\nstdout:\n${error.stdout}` : '';
    const stderr = error.stderr ? `\nstderr:\n${error.stderr}` : '';
    throw new Error(
      `Command failed (${error.code ?? 'unknown'}): ${commandText(command, args)}${stdout}${stderr}`,
    );
  }
}

function createCurrentCliRunner(packageSpec) {
  if (packageSpec) {
    const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    return {
      label: `npx ${packageSpec}`,
      run(cwd, args, options = {}) {
        return execCommand(npxCommand, ['--yes', packageSpec, ...args], {
          ...options,
          cwd,
        });
      },
    };
  }

  return {
    label: 'local checkout',
    run(cwd, args, options = {}) {
      return execCommand(process.execPath, [LOCAL_CLI_PATH, ...args], {
        ...options,
        cwd,
      });
    },
  };
}

function createLocalCliRunner(cliPath, label) {
  return {
    label,
    run(cwd, args, options = {}) {
      return execCommand(process.execPath, [cliPath, ...args], {
        ...options,
        cwd,
      });
    },
  };
}

async function startFixtureServer() {
  const fixtureSource = `${JSON.stringify(FIXTURE_OPENAPI, null, 2)}\n`;

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const method = request.method ?? 'GET';
    if (!['GET', 'HEAD'].includes(method) || requestUrl.pathname !== '/oas30.json') {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-length': Buffer.byteLength(fixtureSource),
      'content-type': 'application/json; charset=utf-8',
    });
    if (method === 'HEAD') {
      response.end();
      return;
    }

    response.end(fixtureSource);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not start fixture HTTP server.');
  }

  return {
    sourceUrl: `http://127.0.0.1:${address.port}/oas30.json`,
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label} did not include expected text: ${expected}`);
  }
}

async function assertExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

async function listFilesRecursive(dirPath, basePath = dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(entryPath, basePath));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.relative(basePath, entryPath).split(path.sep).join('/'));
    }
  }

  return files.sort();
}

async function readProjectOutputSnapshot(workspace) {
  const projectOutputDir = path.join(workspace, 'openapi/project');
  await assertExists(projectOutputDir);

  const files = await listFilesRecursive(projectOutputDir);
  const snapshot = [];
  for (const file of files) {
    snapshot.push({
      file,
      source: await readText(path.join(projectOutputDir, file)),
    });
  }

  return snapshot;
}

function assertProjectOutputSnapshotEqual(before, after, label = 'project output files') {
  const beforeJson = JSON.stringify(before, null, 2);
  const afterJson = JSON.stringify(after, null, 2);
  if (afterJson !== beforeJson) {
    throw new Error(`${label} changed unexpectedly.`);
  }
}

async function setRulesReviewed(workspace, reviewed) {
  const rulesPath = path.join(workspace, 'openapi/config/project-rules.jsonc');
  const source = await readText(rulesPath);
  const next = source.replace(
    /"rulesReviewed":\s*(?:true|false)/u,
    `"rulesReviewed": ${reviewed ? 'true' : 'false'}`,
  );

  if (next === source) {
    throw new Error(`Could not update review.rulesReviewed in ${rulesPath}`);
  }

  await fs.writeFile(rulesPath, next, 'utf8');
}

async function assertSmokeWorkspace(workspace, sourceUrl, expectedReviewed) {
  const projectConfigSource = await readText(
    path.join(workspace, 'openapi/config/project.jsonc'),
  );
  const projectRulesSource = await readText(
    path.join(workspace, 'openapi/config/project-rules.jsonc'),
  );
  assertIncludes(projectConfigSource, `"sourceUrl": "${sourceUrl}"`, 'project config');
  assertIncludes(
    projectRulesSource,
    `"rulesReviewed": ${expectedReviewed ? 'true' : 'false'}`,
    'project rules',
  );
}

async function assertProjectCandidateOutputs(workspace) {
  await assertExists(path.join(workspace, 'openapi/project/manifest.json'));
  await assertExists(path.join(workspace, 'openapi/project/summary.md'));
  await assertExists(path.join(workspace, 'openapi/project/src/openapi-generated/schema.ts'));
  await assertExists(
    path.join(workspace, 'openapi/project/src/openapi-generated/Users/create-user.dto.ts'),
  );
  await assertExists(
    path.join(workspace, 'openapi/project/src/openapi-generated/Users/create-user.api.ts'),
  );
  await assertExists(
    path.join(workspace, 'openapi/project/src/openapi-generated/Users/get-user-by-id.dto.ts'),
  );
  await assertExists(
    path.join(workspace, 'openapi/project/src/openapi-generated/Users/get-user-by-id.api.ts'),
  );
}

async function runGateCheck(runner, workspace) {
  const projectOutputBeforePrepare = await readProjectOutputSnapshot(workspace);
  const result = await runner.run(workspace, ['prepare'], { expectFailure: true });
  const output = `${result.stdout}\n${result.stderr}`;
  assertIncludes(output, 'Project rules have not been reviewed.', 'prepare review gate output');
  const projectOutputAfterPrepare = await readProjectOutputSnapshot(workspace);
  assertProjectOutputSnapshotEqual(
    projectOutputBeforePrepare,
    projectOutputAfterPrepare,
    'review gate project output',
  );
}

async function runCurrentSmoke({ runner, sourceUrl, tmpRoot }) {
  const workspace = await fs.mkdtemp(path.join(tmpRoot, 'current-'));
  console.log(`\n== Current CLI smoke (${runner.label}) ==`);
  console.log(`workspace: ${workspace}`);

  await runner.run(workspace, ['init', '--source-url', sourceUrl, '--no-input']);
  await assertSmokeWorkspace(workspace, sourceUrl, false);

  await runner.run(workspace, ['refresh']);
  await runner.run(workspace, ['generate']);
  await runner.run(workspace, ['rules']);
  await runGateCheck(runner, workspace);

  await setRulesReviewed(workspace, true);
  await runner.run(workspace, ['prepare']);

  await assertProjectCandidateOutputs(workspace);

  const projectOutputBeforeUpdate = await readProjectOutputSnapshot(workspace);
  await runner.run(workspace, ['update']);
  const projectOutputAfterUpdate = await readProjectOutputSnapshot(workspace);
  assertProjectOutputSnapshotEqual(
    projectOutputBeforeUpdate,
    projectOutputAfterUpdate,
    'update project output',
  );

  await assertSmokeWorkspace(workspace, sourceUrl, true);
  await runner.run(workspace, ['doctor', '--check-url']);
  console.log('ok: current CLI smoke passed');
}

async function resolvePreviousTag(explicitPreviousTag) {
  if (explicitPreviousTag) {
    return explicitPreviousTag;
  }

  try {
    await execCommand('git', ['rev-parse', '--is-inside-work-tree'], {
      silent: true,
    });
  } catch {
    return null;
  }

  const packageJson = JSON.parse(await readText(path.join(REPO_ROOT, 'package.json')));
  const currentTag = `v${packageJson.version}`;
  const result = await execCommand('git', ['tag', '--list', 'v*', '--sort=-v:refname'], {
    silent: true,
  });
  const tags = result.stdout.split(/\r?\n/u).filter(Boolean);
  let previousTag = tags[0] ?? null;
  if (tags.includes(currentTag)) {
    const headResult = await execCommand('git', ['rev-parse', 'HEAD'], { silent: true });
    const currentTagResult = await execCommand('git', ['rev-list', '-n', '1', currentTag], {
      silent: true,
    });
    const headCommit = headResult.stdout.trim();
    const currentTagCommit = currentTagResult.stdout.trim();
    previousTag =
      headCommit === currentTagCommit
        ? tags.find((tag) => tag !== currentTag)
        : currentTag;
  }

  if (!previousTag) {
    throw new Error(
      `Could not find a previous release tag. Pass --previous-tag or --skip-compat.`,
    );
  }

  return previousTag;
}

async function checkoutTag(tag, tmpRoot) {
  await fs.access(NODE_MODULES_PATH).catch(() => {
    throw new Error('node_modules not found. Run pnpm install before release smoke.');
  });

  const checkoutDir = path.join(tmpRoot, `checkout-${tag}`);
  const archivePath = path.join(tmpRoot, `${tag}.tar`);
  await fs.mkdir(checkoutDir, { recursive: true });
  await execCommand('git', ['archive', '--format=tar', '-o', archivePath, tag], {
    silent: true,
  });
  await execCommand('tar', ['-xf', archivePath, '-C', checkoutDir], {
    silent: true,
  });
  await fs.symlink(NODE_MODULES_PATH, path.join(checkoutDir, 'node_modules'), 'dir');
  return checkoutDir;
}

async function runCompatibilitySmoke({ runner, sourceUrl, tmpRoot, previousTag }) {
  console.log(`\n== Previous workspace compatibility (${previousTag} -> ${runner.label}) ==`);
  const previousCheckout = await checkoutTag(previousTag, tmpRoot);
  const previousRunner = createLocalCliRunner(
    path.join(previousCheckout, 'bin/openapi-tool.mjs'),
    previousTag,
  );
  const workspace = await fs.mkdtemp(path.join(tmpRoot, 'compat-'));
  console.log(`workspace: ${workspace}`);

  await previousRunner.run(workspace, ['init', '--source-url', sourceUrl, '--no-input']);
  await assertSmokeWorkspace(workspace, sourceUrl, false);

  await previousRunner.run(workspace, ['refresh']);
  await previousRunner.run(workspace, ['rules']);
  await setRulesReviewed(workspace, true);
  await previousRunner.run(workspace, ['prepare']);

  await assertProjectCandidateOutputs(workspace);
  const projectOutputBeforeUpdate = await readProjectOutputSnapshot(workspace);

  await setRulesReviewed(workspace, false);
  await runner.run(workspace, ['update']);
  const projectOutputAfterUpdate = await readProjectOutputSnapshot(workspace);
  assertProjectOutputSnapshotEqual(
    projectOutputBeforeUpdate,
    projectOutputAfterUpdate,
    'previous workspace update project output',
  );

  await assertSmokeWorkspace(workspace, sourceUrl, false);
  await runGateCheck(runner, workspace);
  console.log('ok: previous workspace compatibility passed');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runner = createCurrentCliRunner(options.packageSpec);
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-release-smoke-'));
  const fixtureServer = await startFixtureServer();

  console.log(`tmp: ${tmpRoot}`);
  console.log(`sourceUrl: ${fixtureServer.sourceUrl}`);

  try {
    if (!options.packageSpec) {
      await assertPackagedInternalImportsResolvable({
        execCommand,
        readText,
        repoRoot: REPO_ROOT,
      });
    }

    if (!options.skipCompat) {
      const previousTag = await resolvePreviousTag(options.previousTag);
      if (previousTag) {
        await runCompatibilitySmoke({
          runner,
          sourceUrl: fixtureServer.sourceUrl,
          tmpRoot,
          previousTag,
        });
      } else {
        console.log('\nskip: previous workspace compatibility (not inside a git worktree)');
      }
    }

    await runCurrentSmoke({
      runner,
      sourceUrl: fixtureServer.sourceUrl,
      tmpRoot,
    });

    console.log('\nrelease smoke passed');
  } finally {
    await fixtureServer.close();
    if (options.keepTemp) {
      console.log(`kept temp workspace: ${tmpRoot}`);
    } else {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exitCode = 1;
});
