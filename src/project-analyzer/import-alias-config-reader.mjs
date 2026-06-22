import path from 'node:path';
import ts from 'typescript';

function parseConfigForAliases(filePath) {
  const parsedConfig = ts.readConfigFile(filePath, ts.sys.readFile);

  if (parsedConfig.error || !parsedConfig.config) {
    return null;
  }

  const configDir = path.dirname(filePath);
  const parsed = ts.parseJsonConfigFileContent(
    parsedConfig.config,
    ts.sys,
    configDir,
    {},
    filePath,
  );

  return {
    baseUrl: parsed.options.baseUrl ?? configDir,
    paths: parsed.options.paths,
    projectReferences: parsed.projectReferences ?? [],
  };
}

function readConfigForAliases(configPath) {
  try {
    return parseConfigForAliases(configPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
    return null;
  }
}

export { readConfigForAliases };
