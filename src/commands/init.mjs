import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

import { initProject, initToolLocalConfig, loadProjectConfig } from '../core/openapi-utils.mjs';

const DEFAULT_SOURCE_URL = 'http://localhost:8080/v3/api-docs';
const SOURCE_URL_CHECK_TIMEOUT_MS = 5000;
const COMMON_OPENAPI_PATHS = [
  '/v3/api-docs',
  '/api-docs',
  '/openapi.json',
  '/swagger.json',
  '/swagger/v1/swagger.json',
];
const ANSI_GREEN = '\x1b[32m';
const ANSI_RED = '\x1b[31m';
const ANSI_RESET = '\x1b[0m';

function parseInitArgs(argv) {
  let sourceUrl = null;
  let noInput = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--source-url') {
      sourceUrl = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--source-url=')) {
      sourceUrl = arg.slice('--source-url='.length) || null;
      continue;
    }

    if (arg === '--no-input') {
      noInput = true;
    }
  }

  return { noInput, sourceUrl };
}

function shouldPromptForSourceUrl({ context, initArgs, stdin, stdout }) {
  if (initArgs.noInput || initArgs.sourceUrl) {
    return false;
  }

  if (typeof context.interactive === 'boolean') {
    return context.interactive;
  }

  return Boolean(stdin?.isTTY && stdout?.isTTY);
}

function shouldUseColor(stdout) {
  if (stdout?.forceColor) {
    return true;
  }

  return Boolean(stdout?.isTTY && !process.env.NO_COLOR);
}

function colorize(text, color, stdout) {
  if (!shouldUseColor(stdout)) {
    return text;
  }

  return `${color}${text}${ANSI_RESET}`;
}

function statusMark(ok, stdout) {
  return ok ? colorize('✓', ANSI_GREEN, stdout) : colorize('x', ANSI_RED, stdout);
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function createFetchSignal() {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(SOURCE_URL_CHECK_TIMEOUT_MS);
  }

  return undefined;
}

function describeFetchError(error) {
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return `request timed out after ${SOURCE_URL_CHECK_TIMEOUT_MS}ms`;
  }

  return error?.message ?? String(error);
}

function validateOpenApiJson(value) {
  if (!isPlainObject(value)) {
    return 'root is not a JSON object';
  }

  if (value.swagger === '2.0') {
    return 'Swagger/OpenAPI 2.0 is not supported';
  }

  const version = value.openapi;
  if (!version || !['3.0', '3.1'].some((prefix) => String(version).startsWith(prefix))) {
    return `not OpenAPI 3.0/3.1 JSON (detected: ${version ?? 'unknown'})`;
  }

  if (!isPlainObject(value.info)) {
    return 'info is not an object';
  }

  if (!isPlainObject(value.paths)) {
    return 'paths is not an object';
  }

  return null;
}

async function checkOpenApiSourceUrl(sourceUrl, fetchImpl) {
  try {
    new URL(sourceUrl);
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }

  if (typeof fetchImpl !== 'function') {
    return { ok: false, reason: 'fetch is not available in this Node.js runtime' };
  }

  let response;
  try {
    response = await fetchImpl(sourceUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json, */*;q=0.8',
      },
      signal: createFetchSignal(),
    });
  } catch (error) {
    return { ok: false, reason: describeFetchError(error) };
  }

  if (!response?.ok) {
    const status = response?.status ?? 'unknown';
    const statusText = response?.statusText ? ` ${response.statusText}` : '';
    return { ok: false, reason: `HTTP ${status}${statusText}` };
  }

  let body;
  try {
    body = await response.text();
  } catch (error) {
    return { ok: false, reason: `could not read response body: ${describeFetchError(error)}` };
  }

  let spec;
  try {
    spec = JSON.parse(body);
  } catch {
    return { ok: false, reason: 'response is not JSON' };
  }

  const validationError = validateOpenApiJson(spec);
  if (validationError) {
    return { ok: false, reason: validationError };
  }

  return { ok: true, detail: `OpenAPI ${spec.openapi}` };
}

function commonOpenApiUrlsFrom(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return [];
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return [];
  }

  const originalUrl = parsed.href;
  return COMMON_OPENAPI_PATHS
    .map((candidatePath) => new URL(candidatePath, parsed.origin).href)
    .filter((candidateUrl) => candidateUrl !== originalUrl);
}

function writeUrlCheckResult(stdout, { ok, sourceUrl, detail, reason }) {
  const suffix = ok ? ` - ${detail}` : ` - ${reason}`;
  stdout.write(`${statusMark(ok, stdout)} GET ${sourceUrl}${suffix}\n`);
}

async function resolveReachableSourceUrl({ sourceUrl, fetchImpl, stdout }) {
  stdout.write('\nChecking OpenAPI JSON URL...\n');

  const directResult = await checkOpenApiSourceUrl(sourceUrl, fetchImpl);
  writeUrlCheckResult(stdout, { ...directResult, sourceUrl });
  if (directResult.ok) {
    return { ok: true, sourceUrl };
  }

  const candidates = commonOpenApiUrlsFrom(sourceUrl);
  if (candidates.length === 0) {
    return { ok: false };
  }

  const origin = new URL(sourceUrl).origin;
  stdout.write(`Trying common OpenAPI paths from ${origin}...\n`);

  for (const candidateUrl of candidates) {
    const candidateResult = await checkOpenApiSourceUrl(candidateUrl, fetchImpl);
    writeUrlCheckResult(stdout, { ...candidateResult, sourceUrl: candidateUrl });

    if (candidateResult.ok) {
      stdout.write(`Using discovered sourceUrl: ${candidateUrl}\n`);
      return { ok: true, sourceUrl: candidateUrl };
    }
  }

  return { ok: false };
}

async function promptForSourceUrl({ defaultSourceUrl, fetchImpl, stdin, stdout }) {
  stdout.write(`Default sourceUrl: ${defaultSourceUrl}\n`);
  stdout.write('Press Enter to keep it, or paste a different OpenAPI JSON URL.\n');

  const readline = createInterface({ input: stdin, output: stdout, terminal: false });
  try {
    while (true) {
      const answer = await readline.question(`OpenAPI JSON URL [${defaultSourceUrl}]: `);
      const trimmed = answer.trim();
      const sourceUrl = trimmed || defaultSourceUrl;
      const result = await resolveReachableSourceUrl({
        fetchImpl,
        sourceUrl,
        stdout,
      });

      if (result.ok) {
        return result.sourceUrl;
      }

      stdout.write('\nCould not find a reachable OpenAPI JSON URL. Paste another URL or press Ctrl+C to cancel.\n');
    }
  } finally {
    readline.close();
  }
}

const initCommand = {
  name: 'init',
  async run(options = {}) {
    const argv = Array.isArray(options) ? options : (options.argv ?? []);
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const force = argv.includes('--force');
    const initArgs = parseInitArgs(argv);
    const stdin = context.stdin ?? process.stdin;
    const stdout = context.stdout ?? process.stdout;
    const fetchImpl = context.fetch ?? globalThis.fetch;
    const promptDefaultSourceUrl =
      context.toolLocalConfig?.initDefaults?.sourceUrl ?? DEFAULT_SOURCE_URL;
    const interactiveSourceUrl = shouldPromptForSourceUrl({
      context,
      initArgs,
      stdin,
      stdout,
    })
      ? await promptForSourceUrl({
        defaultSourceUrl: promptDefaultSourceUrl,
        fetchImpl,
        stdin,
        stdout,
      })
      : null;
    const projectConfigOverrides = {
      ...(context.toolLocalConfig?.initDefaults ?? {}),
      ...(interactiveSourceUrl ? { sourceUrl: interactiveSourceUrl } : {}),
      ...(initArgs.sourceUrl ? { sourceUrl: initArgs.sourceUrl } : {}),
    };
    const result = await initProject(rootDir, { force, projectConfigOverrides });
    const localConfigResult = await initToolLocalConfig(rootDir);

    console.log(`Initialized openapi workflow in ${rootDir}`);
    console.log(`- local config: ${localConfigResult.toolLocalConfigPath}`);
    const projectConfigStatus = result.projectConfigOverwritten
      ? ' (overwritten)'
      : result.projectConfigCreated
        ? ''
        : ' (already exists)';
    console.log(`- project config: ${result.projectConfigTargetPath}${projectConfigStatus}`);
    const projectReadmeStatus = result.projectReadmeOverwritten
      ? ' (overwritten)'
      : result.projectReadmeCreated
        ? ''
        : ' (already exists)';
    console.log(
      `- project guide: ${result.projectReadmePath}${projectReadmeStatus}`,
    );
    console.log(`- gitignore: ${result.openapiGitignorePath}`);
    if (localConfigResult.gitignoreUpdated) {
      console.log(`- root gitignore updated: ${localConfigResult.gitignorePath}`);
    }
    const { projectConfig } = await loadProjectConfig(rootDir);
    const configuredSourceUrl = projectConfig.sourceUrl || '(not configured)';
    console.log('');
    console.log('--- sourceUrl config ---');
    console.log(`- sourceUrl: ${configuredSourceUrl}`);
    console.log(`- edit sourceUrl later: ${result.projectConfigTargetPath} (field: sourceUrl)`);
    console.log(`  open: ${pathToFileURL(result.projectConfigTargetPath).href}`);
    console.log('------------------------');
    console.log('');
    console.log('- next: run doctor --check-url');
  },
};

export { initCommand };
