import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

import { initProject, initToolLocalConfig, loadProjectConfig } from '../core/openapi-utils.mjs';
import { formatSuccess } from '../cli-format.mjs';

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

function createFetchSignal(timeoutMs = SOURCE_URL_CHECK_TIMEOUT_MS) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }

  return undefined;
}

function describeFetchError(error, timeoutMs = SOURCE_URL_CHECK_TIMEOUT_MS) {
  if (isTimeoutError(error)) {
    return `request timed out after ${timeoutMs}ms`;
  }

  return error?.message ?? String(error);
}

function isTimeoutError(error) {
  const timeoutCodes = new Set([
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
  ]);
  return (
    error?.name === 'AbortError'
    || error?.name === 'TimeoutError'
    || timeoutCodes.has(error?.code)
    || timeoutCodes.has(error?.cause?.code)
  );
}

function getResponseHeader(response, headerName) {
  if (typeof response?.headers?.get === 'function') {
    return response.headers.get(headerName);
  }

  return null;
}

function isJsonContentType(contentType) {
  return typeof contentType === 'string' && /(^|[+/])json($|[;\s])/i.test(contentType);
}

function isAuthFailureReason(reason) {
  return /^HTTP (401|403)(\b| )/.test(reason ?? '');
}

function isLikelyOpenApiJsonUrl(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return false;
  }

  return COMMON_OPENAPI_PATHS.some((candidatePath) => parsed.pathname.endsWith(candidatePath));
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
    return {
      ok: false,
      reason: describeFetchError(error),
      canCheckReachability: isTimeoutError(error),
    };
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
    return {
      ok: false,
      reason: `could not read response body: ${describeFetchError(error)}`,
      canCheckReachability: true,
    };
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

async function checkJsonEndpointReachability(sourceUrl, fetchImpl, previousReason) {
  let response;
  try {
    response = await fetchImpl(sourceUrl, {
      method: 'HEAD',
      headers: {
        Accept: 'application/json, */*;q=0.8',
      },
      signal: createFetchSignal(),
    });
  } catch (error) {
    return { ok: false, method: 'HEAD', reason: describeFetchError(error) };
  }

  if (!response?.ok) {
    const status = response?.status ?? 'unknown';
    const statusText = response?.statusText ? ` ${response.statusText}` : '';
    return { ok: false, method: 'HEAD', reason: `HTTP ${status}${statusText}` };
  }

  const contentType = getResponseHeader(response, 'content-type');
  if (!isJsonContentType(contentType)) {
    const reason = contentType
      ? `content-type is not JSON (${contentType})`
      : 'content-type is not JSON';
    return { ok: false, method: 'HEAD', reason };
  }

  const fallbackReason = previousReason?.includes('timed out')
    ? 'GET validation timed out'
    : 'GET body validation failed';
  return {
    ok: true,
    method: 'HEAD',
    detail: `JSON endpoint reachable (${fallbackReason})`,
  };
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
  const contextBasePaths = inferOpenApiContextBasePaths(parsed.pathname);
  const basePaths = [...contextBasePaths, ''];
  const candidates = basePaths.flatMap((basePath) =>
    COMMON_OPENAPI_PATHS.map((candidatePath) =>
      new URL(`${basePath}${candidatePath}`, parsed.origin).href,
    ),
  );

  return [...new Set(candidates)]
    .filter((candidateUrl) => candidateUrl !== originalUrl);
}

function inferOpenApiContextBasePaths(pathname) {
  const matches = [
    pathname.indexOf('/swagger-ui/'),
    pathname.indexOf('/swagger-ui.html'),
  ].filter((index) => index > 0);

  return [...new Set(matches.map((index) => pathname.slice(0, index)))];
}

function writeUrlCheckResult(stdout, { ok, sourceUrl, detail, reason, method = 'GET' }) {
  const suffix = ok ? ` - ${detail}` : ` - ${reason}`;
  stdout.write(`${statusMark(ok, stdout)} ${method} ${sourceUrl}${suffix}\n`);
}

async function checkSourceUrlWithReachabilityFallback({ sourceUrl, fetchImpl, stdout }) {
  const getResult = await checkOpenApiSourceUrl(sourceUrl, fetchImpl);
  writeUrlCheckResult(stdout, { ...getResult, sourceUrl });
  if (getResult.ok) {
    return { ok: true, sourceUrl };
  }

  if (getResult.canCheckReachability) {
    const headResult = await checkJsonEndpointReachability(
      sourceUrl,
      fetchImpl,
      getResult.reason,
    );
    writeUrlCheckResult(stdout, { ...headResult, sourceUrl });

    if (headResult.ok) {
      return { ok: true, sourceUrl };
    }

    return { ok: false, suggestedSourceUrl: sourceUrl };
  }

  if (isAuthFailureReason(getResult.reason) && isLikelyOpenApiJsonUrl(sourceUrl)) {
    return { ok: false, suggestedSourceUrl: sourceUrl };
  }

  return { ok: false };
}

async function resolveReachableSourceUrl({ sourceUrl, fetchImpl, stdout }) {
  stdout.write('\nChecking OpenAPI JSON URL...\n');

  const directResult = await checkSourceUrlWithReachabilityFallback({
    fetchImpl,
    sourceUrl,
    stdout,
  });
  if (directResult.ok) {
    return directResult;
  }

  let suggestedSourceUrl = directResult.suggestedSourceUrl ?? null;
  const candidates = commonOpenApiUrlsFrom(sourceUrl);
  if (candidates.length === 0) {
    return { ok: false, suggestedSourceUrl };
  }

  const origin = new URL(sourceUrl).origin;
  stdout.write(`Trying common OpenAPI paths from ${origin}...\n`);

  for (const candidateUrl of candidates) {
    const candidateResult = await checkSourceUrlWithReachabilityFallback({
      fetchImpl,
      sourceUrl: candidateUrl,
      stdout,
    });

    if (candidateResult.ok) {
      stdout.write(`Using discovered sourceUrl: ${candidateUrl}\n`);
      return { ok: true, sourceUrl: candidateUrl };
    }

    suggestedSourceUrl ??= candidateResult.suggestedSourceUrl ?? null;
  }

  return { ok: false, suggestedSourceUrl };
}

async function promptForSourceUrl({ defaultSourceUrl, fetchImpl, stdin, stdout }) {
  stdout.write(`Default sourceUrl: ${defaultSourceUrl}\n`);
  stdout.write('Press Enter to keep it, or paste a different OpenAPI JSON URL.\n');

  const readline = createInterface({ input: stdin, output: stdout, terminal: false });
  let lastCheckedSourceUrl = defaultSourceUrl;
  try {
    while (true) {
      const answer = await readline.question(`OpenAPI JSON URL [${defaultSourceUrl}]: `);
      const trimmed = answer.trim();
      if (trimmed.toLowerCase() === 'skip') {
        stdout.write(`Skipping reachability check. Saving sourceUrl anyway: ${lastCheckedSourceUrl}\n`);
        return lastCheckedSourceUrl;
      }

      const sourceUrl = trimmed || defaultSourceUrl;
      lastCheckedSourceUrl = sourceUrl;
      const result = await resolveReachableSourceUrl({
        fetchImpl,
        sourceUrl,
        stdout,
      });

      if (result.ok) {
        return result.sourceUrl;
      }

      if (result.suggestedSourceUrl) {
        lastCheckedSourceUrl = result.suggestedSourceUrl;
        stdout.write(`Best OpenAPI JSON URL candidate so far: ${result.suggestedSourceUrl}\n`);
      }
      stdout.write('\nCould not find a reachable OpenAPI JSON URL. Paste another URL, type "skip" to save this URL anyway, or press Ctrl+C to cancel.\n');
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

    console.log(formatSuccess(`Initialized openapi workflow in ${rootDir}`));
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
