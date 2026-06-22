import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { TSC_CLI } from '#test-support/cli/paths.mjs';
import { workspacePath } from '#test-support/cli/workspace.mjs';

const execFileAsync = promisify(execFile);
const PROJECT_TSCONFIG_PATH = 'openapi/project/src/tsconfig.json';

function createProjectTsconfigFile() {
  return {
    path: PROJECT_TSCONFIG_PATH,
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
  };
}

function createAxiosFetchApiTestFiles() {
  return [
    {
      path: 'openapi/project/src/test-support/http.ts',
      content: `export type AxiosRequestConfig = {\n  headers?: Record<string, string>;\n  params?: unknown;\n  data?: unknown;\n  method?: string;\n};\n`,
    },
    {
      path: 'openapi/project/src/test-support/fetch-api.ts',
      content: `import type { AxiosRequestConfig } from './http';\n\nexport async function fetchAPI<T>(_url: string, _config: AxiosRequestConfig): Promise<T> {\n  return undefined as T;\n}\n`,
    },
  ];
}

function createAxiosFetchApiTypecheckFiles() {
  return [...createAxiosFetchApiTestFiles(), createProjectTsconfigFile()];
}

function createRequestConfigFetchApiTypecheckFiles() {
  return [
    {
      path: 'openapi/project/src/test-support/fetch-api.ts',
      content: `export type RequestConfig = {\n  headers?: Record<string, string>;\n  params?: unknown;\n  data?: unknown;\n  method?: string;\n};\n\nexport async function fetchAPI<T>(_url: string, _config: RequestConfig): Promise<T> {\n  return undefined as T;\n}\n`,
    },
    createProjectTsconfigFile(),
  ];
}

async function runProjectTypeCheck(workspace) {
  await execFileAsync(process.execPath, [
    TSC_CLI,
    '--noEmit',
    '-p',
    workspacePath(workspace, PROJECT_TSCONFIG_PATH),
  ]);
}

export {
  createAxiosFetchApiTestFiles,
  createAxiosFetchApiTypecheckFiles,
  createProjectTsconfigFile,
  createRequestConfigFetchApiTypecheckFiles,
  runProjectTypeCheck,
};
