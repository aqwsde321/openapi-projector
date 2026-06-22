import path from 'node:path';

import { pathExists, readJson, readText } from '../io/files.mjs';
import { collectTypeScriptFiles, sortPaths } from './project-file-scanner.mjs';
import { analyzeSourceFile } from './source-signals.mjs';

async function readPackageJson(rootDir) {
  try {
    return await readJson(path.join(rootDir, 'package.json'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function scanTypeScriptFiles(rootDir) {
  const roots = [path.resolve(rootDir, 'src')];
  const files = [];

  for (const root of roots) {
    if (!(await pathExists(root))) {
      continue;
    }
    files.push(
      ...(await collectTypeScriptFiles(root)),
    );
  }

  return {
    roots,
    files: sortPaths(files),
  };
}

async function analyzeProjectFiles({ rootDir, files, signals, importAliases }) {
  for (const filePath of files) {
    const source = await readText(filePath);
    analyzeSourceFile({
      rootDir,
      filePath,
      source,
      signals,
      importAliases,
    });
  }
}

export {
  analyzeProjectFiles,
  readPackageJson,
  scanTypeScriptFiles,
};
