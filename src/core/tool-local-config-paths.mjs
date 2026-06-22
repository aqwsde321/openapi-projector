import path from 'node:path';

const PRIMARY_TOOL_LOCAL_CONFIG_FILE_NAME = '.openapi-projector.local.jsonc';
const TOOL_LOCAL_CONFIG_FILE_NAMES = [
  PRIMARY_TOOL_LOCAL_CONFIG_FILE_NAME,
  '.openapi-tool.local.jsonc',
];

function buildToolLocalConfigCandidates(rootDir) {
  return TOOL_LOCAL_CONFIG_FILE_NAMES.map((fileName) => path.resolve(rootDir, fileName));
}

function resolvePrimaryToolLocalConfigPath(rootDir) {
  return path.resolve(rootDir, PRIMARY_TOOL_LOCAL_CONFIG_FILE_NAME);
}

export {
  PRIMARY_TOOL_LOCAL_CONFIG_FILE_NAME,
  TOOL_LOCAL_CONFIG_FILE_NAMES,
  buildToolLocalConfigCandidates,
  resolvePrimaryToolLocalConfigPath,
};
