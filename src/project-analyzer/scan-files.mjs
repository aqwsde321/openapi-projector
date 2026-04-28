import fs from 'node:fs/promises';
import path from 'node:path';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function collectFiles(targetDir, predicate) {
  const files = [];
  const stack = [targetDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    let entries = [];

    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function resolveAnalysisRoots(rootDir) {
  const fallbackSrcRoot = path.resolve(rootDir, 'src');

  return [fallbackSrcRoot];
}

async function scanTypeScriptFiles(rootDir) {
  const roots = await resolveAnalysisRoots(rootDir);
  const files = [];

  for (const root of roots) {
    if (!(await pathExists(root))) {
      continue;
    }
    files.push(
      ...(await collectFiles(root, (filePath) => /\.(ts|tsx)$/.test(filePath))),
    );
  }

  return {
    roots,
    files: files.sort((left, right) => left.localeCompare(right)),
  };
}

export {
  pathExists,
  scanTypeScriptFiles,
};
