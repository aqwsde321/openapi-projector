import { rulesCommand } from '#src/commands/rules.mjs';
import { workspacePath } from '#test-support/cli/workspace.mjs';
import { readJsonFile, readTextFile, writeJsonFile, writeTextFile } from '#test-support/files/io.mjs';
import {
  projectRulesAnalysisJsonPath,
  projectRulesAnalysisMarkdownPath,
  projectRulesPath,
} from '#test-support/project/paths.mjs';

function usersApiPath(workspace) {
  return workspacePath(workspace, 'src/features/users/api.ts');
}

function ordersApiPath(workspace) {
  return workspacePath(workspace, 'src/features/orders/api.ts');
}

function tsConfigPath(workspace) {
  return workspacePath(workspace, 'tsconfig.json');
}

function tsConfigAppPath(workspace) {
  return workspacePath(workspace, 'tsconfig.app.json');
}

function entityUserModelPath(workspace) {
  return workspacePath(workspace, 'src/entities/user/model.ts');
}

function sharedApiRequestPath(workspace) {
  return workspacePath(workspace, 'src/shared/api/request.ts');
}

function packageJsonPath(workspace) {
  return workspacePath(workspace, 'package.json');
}

async function runRulesAnalysis(workspace) {
  await rulesCommand.run({
    context: {
      targetRoot: workspace,
    },
  });
}

async function writeUsersApiSource(workspace, lines) {
  await writeTextFile(usersApiPath(workspace), `${lines.join('\n')}\n`);
}

async function writeProjectRules(workspace, rules) {
  await writeJsonFile(projectRulesPath(workspace), rules);
}

async function writeOrdersApiSource(workspace, lines) {
  await writeTextFile(ordersApiPath(workspace), `${lines.join('\n')}\n`);
}

async function writeTsConfig(workspace, value) {
  await writeJsonFile(tsConfigPath(workspace), value);
}

async function writeTsConfigApp(workspace, value) {
  await writeJsonFile(tsConfigAppPath(workspace), value);
}

async function writeTsConfigSource(workspace, lines) {
  await writeTextFile(tsConfigPath(workspace), `${lines.join('\n')}\n`);
}

async function writeEntityUserModelSource(workspace, source) {
  await writeTextFile(entityUserModelPath(workspace), source);
}

async function writeSharedApiRequestSource(workspace, lines) {
  await writeTextFile(sharedApiRequestPath(workspace), `${lines.join('\n')}\n`);
}

async function readProjectRulesSource(workspace) {
  return readTextFile(projectRulesPath(workspace));
}

async function readProjectRulesAnalysis(workspace) {
  return readJsonFile(projectRulesAnalysisJsonPath(workspace));
}

async function readProjectRulesAnalysisMarkdown(workspace) {
  return readTextFile(projectRulesAnalysisMarkdownPath(workspace));
}

async function writeMixedApiHelperProject(workspace) {
  await writeJsonFile(packageJsonPath(workspace), {
    dependencies: {
      axios: '^1.0.0',
    },
  });
  await writeTextFile(
    usersApiPath(workspace),
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
    ordersApiPath(workspace),
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
}

export {
  ordersApiPath,
  packageJsonPath,
  projectRulesAnalysisMarkdownPath,
  projectRulesAnalysisJsonPath,
  projectRulesPath,
  readProjectRulesAnalysis,
  readProjectRulesAnalysisMarkdown,
  readProjectRulesSource,
  runRulesAnalysis,
  writeEntityUserModelSource,
  writeProjectRules,
  usersApiPath,
  writeMixedApiHelperProject,
  writeOrdersApiSource,
  writeSharedApiRequestSource,
  writeTsConfig,
  writeTsConfigApp,
  writeTsConfigSource,
  writeUsersApiSource,
};
