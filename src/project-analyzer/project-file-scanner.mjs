import fs from 'node:fs/promises';
import path from 'node:path';

function sortPaths(paths) {
  return paths.sort((left, right) => left.localeCompare(right));
}

function shouldSkipDirectory(name) {
  return name === 'node_modules' || name === '.git';
}

function isTypeScriptFile(filePath) {
  return /\.(ts|tsx)$/.test(filePath);
}

async function readDirectoryEntries(dirPath) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function collectFiles(targetDir, predicate) {
  const files = [];
  const stack = [targetDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = await readDirectoryEntries(currentDir);

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (shouldSkipDirectory(entry.name)) {
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

  return sortPaths(files);
}

async function collectTypeScriptFiles(root) {
  return collectFiles(root, isTypeScriptFile);
}

export { collectTypeScriptFiles, sortPaths };
